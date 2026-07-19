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
import { DEFAULT_LOCALE, type AppLocale } from '$lib/constant';
import { isAppLocale, localizePathname, PUBLIC_SITE_ORIGIN } from '$lib/locale-routing';
import { subscriptionNotificationCopy } from '$lib/i18n-copy';
import {
	getLocalDateString,
	hasLocalTimeReached,
	normalizeDateString,
	resolveNotifyTime,
	resolveTimeZone
} from '$lib/time-zone';

export type NotificationDispatchResult = {
	evaluated: number;
	due: number;
	sent: number;
	failed: number;
	removed: number;
	updated: number;
};

const resolveUserLocale = (locale: string | null | undefined): AppLocale =>
	isAppLocale(locale) ? locale : DEFAULT_LOCALE;

const buildPayload = (
	subscription: typeof trackedSubscriptionTable.$inferSelect,
	locale: AppLocale,
	targetDate: string
) => {
	const notifyDays = subscription.notifyDaysBefore ?? 0;
	const copy = subscriptionNotificationCopy[locale];
	const when = copy.when(notifyDays);

	return {
		title: copy.title,
		body: `${subscription.serviceName}：${when}`,
		icon: '/favicon.png',
		tag: `subscription-${subscription.id}-${targetDate}`,
		data: {
			url: `${localizePathname('/subscriptions', locale)}?subscription=${encodeURIComponent(
				String(subscription.id)
			)}`,
			subscriptionId: subscription.id
		}
	};
};

const formatBillingDate = (value: string | null | undefined, locale: AppLocale) => {
	if (!value) return subscriptionNotificationCopy[locale].notSet;
	const normalized = normalizeDateString(value);
	return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : value;
};

const buildPublicUrl = (path: string) => new URL(path, PUBLIC_SITE_ORIGIN).toString();

const resolveSubscriptionUrl = (locale: AppLocale, subscriptionId?: number | string) => {
	const subscriptionsPath = localizePathname('/subscriptions', locale);
	const pathWithDetail =
		subscriptionId === undefined
			? subscriptionsPath
			: `${subscriptionsPath}?subscription=${encodeURIComponent(String(subscriptionId))}`;

	return buildPublicUrl(pathWithDetail);
};

export const dispatchSubscriptionNotifications = async (
	db: NonNullable<App.Locals['db']>
): Promise<NotificationDispatchResult> => {
	const now = new Date();
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
		.where(eq(trackedSubscriptionTable.status, 'active'));
	let updated = 0;
	const userIds = Array.from(
		new Set(subscriptions.map((sub) => sub.userId).filter(Boolean))
	) as string[];

	const users =
		userIds.length > 0
			? await db.select().from(userTable).where(inArray(userTable.id, userIds))
			: [];

	const userById = new Map(users.map((user) => [user.id, user]));

	const dueSubscriptions: {
		subscription: typeof trackedSubscriptionTable.$inferSelect;
		targetDate: string;
	}[] = [];

	for (const sub of subscriptions) {
		if (!sub.userId) continue;
		const user = userById.get(sub.userId);
		if (!user) continue;
		const userTimeZone = resolveTimeZone(user.timeZone);
		const userNotifyTime = resolveNotifyTime(user.defaultNotifyTime);
		const today = getLocalDateString(now, userTimeZone);

		const computed = computeNextBilling(sub.firstPaymentDate, sub.cycle, {
			timeZone: userTimeZone,
			now
		});
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
		if (!hasLocalTimeReached(now, userTimeZone, userNotifyTime)) continue;

		if (sub.lastNotifiedDate === today) {
			continue;
		}

		dueSubscriptions.push({ subscription: sub, targetDate: today });
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

	const pushSubscriptions = await db
		.select()
		.from(pushSubscriptionTable)
		.where(inArray(pushSubscriptionTable.userId, userIds));

	const pushByUser = new Map<string, (typeof pushSubscriptionTable.$inferSelect)[]>();
	for (const pushSub of pushSubscriptions) {
		const list = pushByUser.get(pushSub.userId) ?? [];
		list.push(pushSub);
		pushByUser.set(pushSub.userId, list);
	}

	let sent = 0;
	let failed = 0;
	let removed = 0;

	for (const due of dueSubscriptions) {
		const sub = due.subscription;
		const userId = sub.userId ?? '';
		const user = userById.get(userId);
		if (!user) continue;
		const userLocale = resolveUserLocale(user.locale);

		const method = user.notificationMethod ?? 'email';
		const shouldPush = method === 'push' || method === 'both';
		const shouldEmail = method === 'email' || method === 'both';
		let delivered = false;

		if (shouldPush && pushEnabled) {
			const userPushSubscriptions = pushByUser.get(userId) ?? [];
			if (userPushSubscriptions.length > 0) {
				const payload = buildPayload(sub, userLocale, due.targetDate);

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
							delivered = true;
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
			const subscriptionUrl = resolveSubscriptionUrl(userLocale, sub.id);
			try {
				await sendSubscriptionReminderEmail({
					user: { email: user.email, name: user.name },
					serviceName: sub.serviceName,
					notifyDays: Number(sub.notifyDaysBefore ?? 0),
					billingDate: formatBillingDate(sub.nextBillingAt, userLocale),
					manageUrl: subscriptionUrl,
					locale: userLocale
				});
				sent += 1;
				delivered = true;
			} catch (error) {
				console.error('[subscription-notify] failed to send email', error);
				failed += 1;
			}
		}

		if (delivered) {
			await db
				.update(trackedSubscriptionTable)
				.set({ lastNotifiedAt: now, lastNotifiedDate: due.targetDate })
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

const resolveReturnUrl = (locale: AppLocale) => {
	const settingsPath = localizePathname('/me/settings', locale);

	return buildPublicUrl(settingsPath);
};

export const dispatchTrialEndingEmails = async (
	db: NonNullable<App.Locals['db']>
): Promise<TrialEndingDispatchResult> => {
	const targetDay = dayjs().add(3, 'day');
	const targetStart = targetDay.startOf('day').toDate();
	const targetEnd = targetDay.endOf('day').toDate();
	const targetKey = targetDay.format('YYYY-MM-DD');

	const rows = await db
		.select()
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
		.select()
		.from(verificationTable)
		.where(inArray(verificationTable.identifier, identifiers));

	const sentIdentifiers = new Set(sentRows.map((row) => row.identifier));
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
		const returnUrl = resolveReturnUrl(resolveUserLocale(user.locale));

		if (sentIdentifiers.has(identifier)) {
			skipped += 1;
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
				planName: sub.plan,
				locale: resolveUserLocale(user.locale)
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
