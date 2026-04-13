import * as schema from './db/schema';
import {
	PREMIUM_LIFETIME_ENTITLEMENT_KEY,
	type UserEntitlementRecord,
	hasActiveEntitlement
} from './entitlements';
import {
	isActiveOrTrialing,
	isPendingCancel as isPendingCancelUtil,
	toTimestamp
} from './better-auth-stripe-utils';

export type SubscriptionRecord = typeof schema.subscription.$inferSelect;

export type CurrentPlan = {
	planName: string;
	isPremium: boolean;
	isPendingCancel: boolean;
	status: string | null;
	accessEndsAt: number | null;
	hasSubscriptionAccess: boolean;
	hasLifetimeEntitlement: boolean;
};

const FREE_PLAN_NAME = 'Free';

const normalizePlanName = (name: string) => name.trim().toLowerCase();

const getAccessEnd = (subscription: SubscriptionRecord | null | undefined) => {
	if (!subscription) return null;
	return toTimestamp(subscription.periodEnd ?? subscription.trialEnd ?? null);
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
	entitlements: UserEntitlementRecord[] | null | undefined = [],
	now = Date.now()
): CurrentPlan => {
	const hasLifetimeEntitlement = hasActiveEntitlement(
		entitlements,
		PREMIUM_LIFETIME_ENTITLEMENT_KEY
	);

	if (!subscription) {
		return {
			planName: hasLifetimeEntitlement ? 'Premium Lifetime' : FREE_PLAN_NAME,
			isPremium: hasLifetimeEntitlement,
			isPendingCancel: false,
			status: hasLifetimeEntitlement ? 'active' : null,
			accessEndsAt: null,
			hasSubscriptionAccess: false,
			hasLifetimeEntitlement
		};
	}

	const accessEndsAt = getAccessEnd(subscription);
	const isSubscriptionActive = isActiveOrTrialing(subscription);
	const hasActiveAccess = accessEndsAt !== null ? accessEndsAt > now : isSubscriptionActive;
	const hasSubscriptionAccess =
		hasActiveAccess && (isSubscriptionActive || subscription.status === 'canceled');
	const rawPlanName = subscription.plan ?? FREE_PLAN_NAME;
	const planName = hasSubscriptionAccess
		? rawPlanName
		: hasLifetimeEntitlement
			? 'Premium Lifetime'
			: FREE_PLAN_NAME;
	const isPremium =
		hasSubscriptionAccess ||
		hasLifetimeEntitlement ||
		normalizePlanName(planName) !== normalizePlanName(FREE_PLAN_NAME);
	const isPendingCancel =
		hasSubscriptionAccess &&
		(isPendingCancelUtil(subscription) || subscription.status === 'canceled');

	return {
		planName,
		isPremium,
		isPendingCancel,
		status: hasSubscriptionAccess
			? (subscription.status ?? null)
			: hasLifetimeEntitlement
				? 'active'
				: null,
		accessEndsAt: hasSubscriptionAccess ? accessEndsAt : null,
		hasSubscriptionAccess,
		hasLifetimeEntitlement
	};
};

export const getCurrentPlan = (
	subscriptions: SubscriptionRecord[] | null | undefined,
	entitlements: UserEntitlementRecord[] | null | undefined = [],
	now = Date.now()
) => {
	const subscription = pickCurrentSubscription(subscriptions, now);
	const currentPlan = resolveCurrentPlan(subscription, entitlements, now);
	return { subscription, currentPlan };
};
