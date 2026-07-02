import type Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './db/schema';
import { setE2EBillingNowMs } from './billing-clock';

type Database = DrizzleD1Database<typeof schema> | BetterSQLite3Database<typeof schema>;

const toDate = (seconds: number | null | undefined) =>
	typeof seconds === 'number' ? new Date(seconds * 1000) : null;

const getStripeId = (value: string | { id?: string } | null | undefined) => {
	if (!value) return null;
	return typeof value === 'string' ? value : (value.id ?? null);
};

const getSubscriptionItem = (subscription: Stripe.Subscription) =>
	(subscription.items?.data?.[0] ?? null) as
		| (Stripe.SubscriptionItem & {
				current_period_start?: number;
				current_period_end?: number;
		  })
		| null;

const getTestClockFrozenTime = async (stripeClient: Stripe, subscription: Stripe.Subscription) => {
	const testClockId = getStripeId(subscription.test_clock);
	if (!testClockId) return null;

	const testClock = await stripeClient.testHelpers.testClocks.retrieve(testClockId);
	return testClock.frozen_time * 1000;
};

export async function syncStripeSubscriptionForE2E({
	db,
	stripeClient,
	userId,
	subscriptionId,
	planName = 'Premium'
}: {
	db: Database;
	stripeClient: Stripe;
	userId: string;
	subscriptionId: string;
	planName?: string;
}) {
	const stripeSubscription = await stripeClient.subscriptions.retrieve(subscriptionId, {
		expand: ['items.data.price']
	});
	const item = getSubscriptionItem(stripeSubscription);

	if (!item) {
		throw new Error(`Stripe subscription ${subscriptionId} has no subscription items`);
	}

	const customerId = getStripeId(stripeSubscription.customer);
	if (!customerId) {
		throw new Error(`Stripe subscription ${subscriptionId} has no customer`);
	}

	const nowMs = await getTestClockFrozenTime(stripeClient, stripeSubscription);
	if (nowMs !== null) {
		setE2EBillingNowMs(nowMs);
	}

	const periodStart = toDate(item.current_period_start);
	const periodEnd = toDate(item.current_period_end);
	const trialStart = toDate(stripeSubscription.trial_start);
	const trialEnd = toDate(stripeSubscription.trial_end);
	const cancelAt = toDate(stripeSubscription.cancel_at);
	const canceledAt = toDate(stripeSubscription.canceled_at);
	const endedAt = toDate(stripeSubscription.ended_at);
	const billingInterval = item.price.recurring?.interval ?? null;
	const stripeScheduleId = getStripeId(stripeSubscription.schedule);

	const values = {
		id: stripeSubscription.id,
		plan: planName,
		referenceId: userId,
		stripeCustomerId: customerId,
		stripeSubscriptionId: stripeSubscription.id,
		status: stripeSubscription.status,
		periodStart,
		periodEnd,
		trialStart,
		trialEnd,
		cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
		cancelAt,
		canceledAt,
		endedAt,
		seats: item.quantity ?? null,
		billingInterval,
		stripeScheduleId
	};

	await db
		.insert(schema.subscription)
		.values(values)
		.onConflictDoUpdate({
			target: schema.subscription.id,
			set: {
				plan: values.plan,
				referenceId: values.referenceId,
				stripeCustomerId: values.stripeCustomerId,
				stripeSubscriptionId: values.stripeSubscriptionId,
				status: values.status,
				periodStart: values.periodStart,
				periodEnd: values.periodEnd,
				trialStart: values.trialStart,
				trialEnd: values.trialEnd,
				cancelAtPeriodEnd: values.cancelAtPeriodEnd,
				cancelAt: values.cancelAt,
				canceledAt: values.canceledAt,
				endedAt: values.endedAt,
				seats: values.seats,
				billingInterval: values.billingInterval,
				stripeScheduleId: values.stripeScheduleId
			}
		});

	await db
		.update(schema.user)
		.set({ stripeCustomerId: customerId })
		.where(eq(schema.user.id, userId));

	return {
		subscriptionId: stripeSubscription.id,
		customerId,
		status: stripeSubscription.status,
		cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
		testClockNow: nowMs,
		periodEnd: values.periodEnd?.toISOString() ?? null,
		trialEnd: values.trialEnd?.toISOString() ?? null
	};
}
