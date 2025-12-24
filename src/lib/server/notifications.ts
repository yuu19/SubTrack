import dayjs from 'dayjs';
import { eq, inArray } from 'drizzle-orm';
import { pushSubscriptionTable, subscriptionTable } from '$lib/server/db/schema';
import { computeNextBilling } from '$lib/server/subscriptions';
import { sendWebPush } from '$lib/server/push';

export type NotificationDispatchResult = {
	evaluated: number;
	due: number;
	sent: number;
	failed: number;
	removed: number;
	updated: number;
};

const buildPayload = (subscription: typeof subscriptionTable.$inferSelect) => {
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

export const dispatchSubscriptionNotifications = async (
	db: NonNullable<App.Locals['db']>
): Promise<NotificationDispatchResult> => {
	const today = dayjs().startOf('day');
	const subscriptions = await db.select().from(subscriptionTable);
	let updated = 0;

	const dueSubscriptions: typeof subscriptionTable.$inferSelect[] = [];

	for (const sub of subscriptions) {
		if (!sub.userId) continue;

		const computed = computeNextBilling(sub.firstPaymentDate, sub.cycle);
		if (
			computed.nextBillingAt !== sub.nextBillingAt ||
			computed.daysUntilNextBilling !== sub.daysUntilNextBilling
		) {
			await db
				.update(subscriptionTable)
				.set({
					nextBillingAt: computed.nextBillingAt,
					daysUntilNextBilling: computed.daysUntilNextBilling
				})
				.where(eq(subscriptionTable.id, sub.id));
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

	for (const sub of dueSubscriptions) {
		const userPushSubscriptions = pushByUser.get(sub.userId ?? '') ?? [];
		if (userPushSubscriptions.length === 0) continue;

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

		await db
			.update(subscriptionTable)
			.set({ lastNotifiedAt: new Date() })
			.where(eq(subscriptionTable.id, sub.id));
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
