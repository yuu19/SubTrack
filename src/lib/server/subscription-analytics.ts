import type { trackedSubscriptionTable } from '$lib/server/db/schema';
import type { SubscriptionColor } from '$lib/subscription-colors';

export type AnalyticsPeriod = 'monthly' | 'yearly';

export type AnalyticsSubscription = Pick<
	typeof trackedSubscriptionTable.$inferSelect,
	'serviceName' | 'cycle' | 'amount'
> & {
	color?: SubscriptionColor | null;
};

export type SubscriptionAnalyticsItem = {
	serviceName: string;
	color: SubscriptionColor | null;
	amount: number;
	share: number;
	subscriptionCount: number;
};

export type SubscriptionAnalyticsSummary = {
	total: number;
	items: SubscriptionAnalyticsItem[];
	subscriptionCount: number;
};

export type SubscriptionAnalyticsSnapshot = Record<AnalyticsPeriod, SubscriptionAnalyticsSummary>;

const PERIODS: AnalyticsPeriod[] = ['monthly', 'yearly'];

const normalizeAmount = (amount: number, cycle: string, period: AnalyticsPeriod) => {
	if (!Number.isFinite(amount) || amount <= 0) return 0;

	if (period === 'monthly') {
		if (cycle === 'yearly') return Math.round(amount / 12);
		if (cycle === 'quarterly') return Math.round(amount / 3);
		return Math.round(amount);
	}

	if (cycle === 'yearly') return Math.round(amount);
	if (cycle === 'quarterly') return Math.round(amount * 4);
	return Math.round(amount * 12);
};

const createEmptySummary = (): SubscriptionAnalyticsSummary => ({
	total: 0,
	items: [],
	subscriptionCount: 0
});

export const emptySubscriptionAnalytics = (): SubscriptionAnalyticsSnapshot => ({
	monthly: createEmptySummary(),
	yearly: createEmptySummary()
});

export const buildSubscriptionAnalytics = (
	subscriptions: AnalyticsSubscription[]
): SubscriptionAnalyticsSnapshot => {
	const grouped = {
		monthly: new Map<string, { amount: number; color: SubscriptionColor | null; subscriptionCount: number }>(),
		yearly: new Map<string, { amount: number; color: SubscriptionColor | null; subscriptionCount: number }>()
	} satisfies Record<
		AnalyticsPeriod,
		Map<string, { amount: number; color: SubscriptionColor | null; subscriptionCount: number }>
	>;

	for (const subscription of subscriptions) {
		const serviceName = subscription.serviceName.trim() || 'Unknown';

		for (const period of PERIODS) {
			const normalizedAmount = normalizeAmount(subscription.amount, subscription.cycle, period);
			if (normalizedAmount <= 0) continue;

			const existing = grouped[period].get(serviceName);
			grouped[period].set(serviceName, {
				amount: (existing?.amount ?? 0) + normalizedAmount,
				color: existing?.color ?? subscription.color ?? null,
				subscriptionCount: (existing?.subscriptionCount ?? 0) + 1
			});
		}
	}

	const snapshot = emptySubscriptionAnalytics();

	for (const period of PERIODS) {
		const items = Array.from(grouped[period].entries())
			.map(([serviceName, value]) => ({
				serviceName,
				color: value.color,
				amount: value.amount,
				subscriptionCount: value.subscriptionCount,
				share: 0
			}))
			.sort((left, right) => right.amount - left.amount || left.serviceName.localeCompare(right.serviceName));

		const total = items.reduce((sum, item) => sum + item.amount, 0);
		snapshot[period] = {
			total,
			subscriptionCount: subscriptions.length,
			items: items.map((item) => ({
				...item,
				share: total > 0 ? item.amount / total : 0
			}))
		};
	}

	return snapshot;
};
