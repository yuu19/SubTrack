import dayjs from 'dayjs';
import { and, eq, gte, inArray, isNotNull, lte } from 'drizzle-orm';
import {
	pushSubscriptionTable,
	trackedSubscriptionTable,
	subscription as subscriptionTable,
	user as userTable,
	verification as verificationTable
} from '$lib/server/db/schema';
import { computeNextBilling } from '$lib/server/subscriptions';
import { sendWebPush } from '$lib/server/push';
import { sendSubscriptionReminderEmail, sendTrialEndingEmail } from '$lib/server/email';
import { createBillingPortalUrl } from '$lib/server/stripe';

export type NotificationDispatchResult = {
	evaluated: number;
	due: number;
	sent: number;
	failed: number;
	removed: number;
	updated: number;
};

const buildPayload = (subscription: typeof trackedSubscriptionTable.$inferSelect) => {
	const notifyDays = subscription.notifyDaysBefore ?? 0;
	const when =
		notifyDays === 0 ? '今日が支払い日です。' : `支払いまであと${notifyDays}日です。`;

	return {
		title: 'サブスクの支払い通知',
		body: `${subscription.serviceName}：${when}`,
		icon: '/favicon.png',
		tag: `subscription-${subscription.id}-${dayjs().format('YYYY-MM-DD')}`,
		data: {
			url: '/subscriptions',
			subscriptionId: subscription.id
		}
	};
};

const formatBillingDate = (value: string | null | undefined) => {
	if (!value) return '未設定';
	const parsed = dayjs(value);
	return parsed.isValid() ? parsed.format('YYYY-MM-DD') : value;
};

const resolveSubscriptionUrl = () => {
	const directBase =
		process.env.BETTER_AUTH_URL ??
		process.env.PUBLIC_BETTER_AUTH_URL ??
		process.env.APP_ORIGIN;

	if (directBase) {
		return new URL('/subscriptions', directBase).toString();
	}

	if (process.env.PUSH_CRON_URL) {
		try {
			const origin = new URL(process.env.PUSH_CRON_URL).origin;
			return new URL('/subscriptions', origin).toString();
		} catch {
			return null;
		}
	}

	return null;
};

export const dispatchSubscriptionNotifications = async (
	db: NonNullable<App.Locals['db']>
): Promise<NotificationDispatchResult> => {
	const today = dayjs().startOf('day');
	const pushEnabled = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
	const emailEnabled = Boolean(process.env.RESEND_API_KEY);

	if (!pushEnabled) {
		console.warn('[subscription-notify] VAPID keys are not configured; push disabled.');
	}
	if (!emailEnabled) {
		console.warn('[subscription-notify] RESEND_API_KEY is not configured; email disabled.');
	}
	const subscriptions = await db
		.select()
		.from(trackedSubscriptionTable)
		.where(eq(trackedSubscriptionTable.isSample, false));
	let updated = 0;

	const dueSubscriptions: typeof trackedSubscriptionTable.$inferSelect[] = [];

	for (const sub of subscriptions) {
		if (!sub.userId) continue;

		const computed = computeNextBilling(sub.firstPaymentDate, sub.cycle);
		if (
			computed.nextBillingAt !== sub.nextBillingAt ||
			computed.daysUntilNextBilling !== sub.daysUntilNextBilling
		) {
			await db
				.update(trackedSubscriptionTable)
				.set({
					nextBillingAt: computed.nextBillingAt,
					daysUntilNextBilling: computed.daysUntilNextBilling
				})
				.where(eq(trackedSubscriptionTable.id, sub.id));
			sub.nextBillingAt = computed.nextBillingAt;
			sub.daysUntilNextBilling = computed.daysUntilNextBilling;
			updated += 1;
		}

		const notifyDays = Number(sub.notifyDaysBefore ?? 0);
		if (!Number.isFinite(notifyDays) || notifyDays < 0) continue;
		if (computed.daysUntilNextBilling !== notifyDays) continue;

		if (sub.lastNotifiedAt && dayjs(sub.lastNotifiedAt).isSame(today, 'day')) {
			continue;
		}

		dueSubscriptions.push(sub);
	}

	if (dueSubscriptions.length === 0) {
		return {
			evaluated: subscriptions.length,
			due: 0,
			sent: 0,
			failed: 0,
			removed: 0,
			updated
		};
	}

	const userIds = Array.from(
		new Set(dueSubscriptions.map((sub) => sub.userId).filter(Boolean))
	) as string[];

	const users = await db
		.select({
			id: userTable.id,
			email: userTable.email,
			name: userTable.name,
			notificationMethod: userTable.notificationMethod
		})
		.from(userTable)
		.where(inArray(userTable.id, userIds));

	const userById = new Map(users.map((user) => [user.id, user]));

	const pushSubscriptions = await db
		.select()
		.from(pushSubscriptionTable)
		.where(inArray(pushSubscriptionTable.userId, userIds));

	const pushByUser = new Map<string, typeof pushSubscriptionTable.$inferSelect[]>();
	for (const pushSub of pushSubscriptions) {
		const list = pushByUser.get(pushSub.userId) ?? [];
		list.push(pushSub);
		pushByUser.set(pushSub.userId, list);
	}

	let sent = 0;
	let failed = 0;
	let removed = 0;
	const subscriptionUrl = resolveSubscriptionUrl();

	for (const sub of dueSubscriptions) {
		const userId = sub.userId ?? '';
		const user = userById.get(userId);
		if (!user) continue;

		const method = user.notificationMethod ?? 'push';
		const shouldPush = method === 'push' || method === 'both';
		const shouldEmail = method === 'email' || method === 'both';
		let attempted = false;

		if (shouldPush && pushEnabled) {
			const userPushSubscriptions = pushByUser.get(userId) ?? [];
			if (userPushSubscriptions.length > 0) {
				attempted = true;
				const payload = buildPayload(sub);

				for (const pushSub of userPushSubscriptions) {
					try {
						const response = await sendWebPush(
							{
								endpoint: pushSub.endpoint,
								p256dh: pushSub.p256dh,
								auth: pushSub.auth,
								expirationTime: pushSub.expirationTime ?? null
							},
							payload
						);

						if (response.status === 404 || response.status === 410) {
							await db
								.delete(pushSubscriptionTable)
								.where(eq(pushSubscriptionTable.id, pushSub.id));
							removed += 1;
							continue;
						}

						if (response.ok) {
							sent += 1;
						} else {
							failed += 1;
						}
					} catch (error) {
						console.error('Failed to send push notification', error);
						failed += 1;
					}
				}
			}
		}

		if (shouldEmail && user.email && emailEnabled) {
			if (!subscriptionUrl) {
				console.error('[subscription-notify] APP_ORIGIN is not configured');
				failed += 1;
			} else {
				attempted = true;
				try {
					await sendSubscriptionReminderEmail({
						user: { email: user.email, name: user.name },
						serviceName: sub.serviceName,
						notifyDays: Number(sub.notifyDaysBefore ?? 0),
						billingDate: formatBillingDate(sub.nextBillingAt),
						manageUrl: subscriptionUrl
					});
					sent += 1;
				} catch (error) {
					console.error('[subscription-notify] failed to send email', error);
					failed += 1;
				}
			}
		}

		if (attempted) {
			await db
				.update(trackedSubscriptionTable)
				.set({ lastNotifiedAt: new Date() })
				.where(eq(trackedSubscriptionTable.id, sub.id));
		}
	}

	return {
		evaluated: subscriptions.length,
		due: dueSubscriptions.length,
		sent,
		failed,
		removed,
		updated
	};
};

export type TrialEndingDispatchResult = {
	evaluated: number;
	due: number;
	sent: number;
	failed: number;
	skipped: number;
};

const resolveReturnUrl = () => {
	const directBase =
		process.env.BETTER_AUTH_URL ??
		process.env.PUBLIC_BETTER_AUTH_URL ??
		process.env.APP_ORIGIN;

	if (directBase) {
		return new URL('/me/settings', directBase).toString();
	}

	if (process.env.PUSH_CRON_URL) {
		try {
			const origin = new URL(process.env.PUSH_CRON_URL).origin;
			return new URL('/me/settings', origin).toString();
		} catch {
			return null;
		}
	}

	return null;
};

export const dispatchTrialEndingEmails = async (
	db: NonNullable<App.Locals['db']>
): Promise<TrialEndingDispatchResult> => {
	const targetDay = dayjs().add(3, 'day');
	const targetStart = targetDay.startOf('day').toDate();
	const targetEnd = targetDay.endOf('day').toDate();
	const targetKey = targetDay.format('YYYY-MM-DD');

	const rows = await db
		.select({ subscription: subscriptionTable, user: userTable })
		.from(subscriptionTable)
		.leftJoin(userTable, eq(subscriptionTable.referenceId, userTable.id))
		.where(
			and(
				eq(subscriptionTable.status, 'trialing'),
				isNotNull(subscriptionTable.trialEnd),
				gte(subscriptionTable.trialEnd, targetStart),
				lte(subscriptionTable.trialEnd, targetEnd)
			)
		);

	if (rows.length === 0) {
		return { evaluated: 0, due: 0, sent: 0, failed: 0, skipped: 0 };
	}

	const identifiers = rows.map(
		({ subscription }) => `trial-ending:${subscription.id}:${targetKey}`
	);

	const sentRows = await db
		.select({ identifier: verificationTable.identifier })
		.from(verificationTable)
		.where(inArray(verificationTable.identifier, identifiers));

	const sentIdentifiers = new Set(sentRows.map((row) => row.identifier));
	const returnUrl = resolveReturnUrl();

	let sent = 0;
	let failed = 0;
	let skipped = 0;

	for (const row of rows) {
		const sub = row.subscription;
		const user = row.user;
		const identifier = `trial-ending:${sub.id}:${targetKey}`;

		if (!user || !user.email) {
			skipped += 1;
			continue;
		}

		if (sentIdentifiers.has(identifier)) {
			skipped += 1;
			continue;
		}

		if (!returnUrl) {
			console.error('[trial-ending] BETTER_AUTH_URL is not configured');
			failed += 1;
			continue;
		}

		const customerId = sub.stripeCustomerId ?? user.stripeCustomerId;
		if (!customerId) {
			console.error('[trial-ending] stripe customer id is missing', sub.id);
			failed += 1;
			continue;
		}

		const manageUrl = await createBillingPortalUrl({ customerId, returnUrl });
		if (!manageUrl) {
			failed += 1;
			continue;
		}

		try {
			await sendTrialEndingEmail({
				user: { email: user.email, name: user.name },
				endDate: dayjs(sub.trialEnd ?? targetStart).format('YYYY-MM-DD'),
				manageUrl,
				planName: sub.plan
			});

			await db.insert(verificationTable).values({
				id: crypto.randomUUID(),
				identifier,
				value: targetKey,
				expiresAt: targetEnd
			});

			sent += 1;
		} catch (error) {
			console.error('[trial-ending] failed to send email', error);
			failed += 1;
		}
	}

	return {
		evaluated: rows.length,
		due: rows.length,
		sent,
		failed,
		skipped
	};
};
