import * as schema from './db/schema';
import {
	isActiveOrTrialing,
	isPendingCancel as isPendingCancelUtil
} from './better-auth-stripe-utils';

export type SubscriptionRecord = typeof schema.subscription.$inferSelect;

export type CurrentPlan = {
	planName: string;
	isPremium: boolean;
	isPendingCancel: boolean;
	status: string | null;
	accessEndsAt: number | null;
};

const FREE_PLAN_NAME = 'Free';

const normalizePlanName = (name: string) => name.trim().toLowerCase();

const getAccessEnd = (subscription: SubscriptionRecord | null | undefined) => {
	if (!subscription) return null;
	return subscription.periodEnd ?? subscription.trialEnd ?? null;
};

const pickCurrentSubscription = (
	subscriptions: SubscriptionRecord[] | null | undefined,
	now: number
) => {
	if (!subscriptions || subscriptions.length === 0) return null;

	const scored = subscriptions.map((subscription, index) => {
		const accessEndsAt = getAccessEnd(subscription) ?? 0;
		return {
			subscription,
			accessEndsAt,
			isActive: accessEndsAt > now,
			index
		};
	});

	const active = scored.filter((item) => item.isActive);
	const pool = active.length > 0 ? active : scored;

	pool.sort((a, b) => {
		if (a.accessEndsAt !== b.accessEndsAt) return b.accessEndsAt - a.accessEndsAt;
		return a.index - b.index;
	});

	return pool[0]?.subscription ?? null;
};

export const resolveCurrentPlan = (
	subscription: SubscriptionRecord | null | undefined,
	now = Date.now()
): CurrentPlan => {
	if (!subscription) {
		return {
			planName: FREE_PLAN_NAME,
			isPremium: false,
			isPendingCancel: false,
			status: null,
			accessEndsAt: null
		};
	}

	const accessEndsAt = getAccessEnd(subscription);
	const isSubscriptionActive = isActiveOrTrialing(subscription);
	const hasActiveAccess =
		typeof accessEndsAt === 'number' ? accessEndsAt > now : isSubscriptionActive;
	const isActuallyActive =
		hasActiveAccess && (isSubscriptionActive || subscription.status === 'canceled');
	const rawPlanName = subscription.plan ?? FREE_PLAN_NAME;
	const planName = isActuallyActive ? rawPlanName : FREE_PLAN_NAME;
	const isPremium = normalizePlanName(planName) !== normalizePlanName(FREE_PLAN_NAME);
	const isPendingCancel =
		isActuallyActive &&
		(isPendingCancelUtil(subscription) || subscription.status === 'canceled');

	return {
		planName,
		isPremium,
		isPendingCancel,
		status: subscription.status ?? null,
		accessEndsAt
	};
};

export const getCurrentPlan = (
	subscriptions: SubscriptionRecord[] | null | undefined,
	now = Date.now()
) => {
	const subscription = pickCurrentSubscription(subscriptions, now);
	const currentPlan = resolveCurrentPlan(subscription, now);
	return { subscription, currentPlan };
};
