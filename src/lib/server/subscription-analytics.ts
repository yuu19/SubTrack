import type { trackedSubscriptionTable } from '$lib/server/db/schema';
import type { SubscriptionIconType } from '$lib/subscription-icons';
import type { SubscriptionColor } from '$lib/subscription-colors';
import {
	DEFAULT_SUBSCRIPTION_CURRENCY,
	SUPPORTED_CURRENCIES,
	type SubscriptionCurrency
} from '$lib/constant';

export type AnalyticsPeriod = 'monthly' | 'yearly';

export type AnalyticsSubscription = Pick<
	typeof trackedSubscriptionTable.$inferSelect,
	'id' | 'serviceName' | 'cycle' | 'amount' | 'currency'
> & {
	color?: SubscriptionColor | null;
	iconType?: SubscriptionIconType | string | null;
	iconValue?: string | null;
};

export type SubscriptionAnalyticsItem = {
	subscriptionId: number | null;
	serviceName: string;
	color: SubscriptionColor | null;
	iconType: SubscriptionIconType | string | null;
	iconValue: string | null;
	amount: number;
	share: number;
	subscriptionCount: number;
};

export type SubscriptionAnalyticsSummary = {
	currency: SubscriptionCurrency;
	total: number;
	items: SubscriptionAnalyticsItem[];
	subscriptionCount: number;
};

export type SubscriptionAnalyticsPeriodSnapshot = {
	summaries: SubscriptionAnalyticsSummary[];
	subscriptionCount: number;
};

export type SubscriptionAnalyticsSnapshot = Record<
	AnalyticsPeriod,
	SubscriptionAnalyticsPeriodSnapshot
>;

const PERIODS: AnalyticsPeriod[] = ['monthly', 'yearly'];

type GroupedAnalyticsRow = {
	subscriptionId: number | null;
	amount: number;
	color: SubscriptionColor | null;
	iconType: SubscriptionIconType | string | null;
	iconValue: string | null;
	subscriptionCount: number;
};

type GroupedAnalytics = Record<
	AnalyticsPeriod,
	Map<SubscriptionCurrency, Map<string, GroupedAnalyticsRow>>
>;

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

const resolveCurrency = (currency: string | null | undefined): SubscriptionCurrency =>
	SUPPORTED_CURRENCIES.includes(currency as SubscriptionCurrency)
		? (currency as SubscriptionCurrency)
		: DEFAULT_SUBSCRIPTION_CURRENCY;

const createEmptyPeriodSnapshot = (): SubscriptionAnalyticsPeriodSnapshot => ({
	summaries: [],
	subscriptionCount: 0
});

const createEmptySummary = (currency: SubscriptionCurrency): SubscriptionAnalyticsSummary => ({
	currency,
	total: 0,
	items: [],
	subscriptionCount: 0
});

export const emptySubscriptionAnalytics = (): SubscriptionAnalyticsSnapshot => ({
	monthly: createEmptyPeriodSnapshot(),
	yearly: createEmptyPeriodSnapshot()
});

export const buildSubscriptionAnalytics = (
	subscriptions: AnalyticsSubscription[]
): SubscriptionAnalyticsSnapshot => {
	const grouped: GroupedAnalytics = {
		monthly: new Map<SubscriptionCurrency, Map<string, GroupedAnalyticsRow>>(),
		yearly: new Map<SubscriptionCurrency, Map<string, GroupedAnalyticsRow>>()
	};

	for (const subscription of subscriptions) {
		const serviceName = subscription.serviceName.trim() || 'Unknown';
		const currency = resolveCurrency(subscription.currency);

		for (const period of PERIODS) {
			const normalizedAmount = normalizeAmount(subscription.amount, subscription.cycle, period);
			if (normalizedAmount <= 0) continue;

			const currencyGroup = grouped[period].get(currency) ?? new Map<string, GroupedAnalyticsRow>();
			grouped[period].set(currency, currencyGroup);

			const existing = currencyGroup.get(serviceName);
			currencyGroup.set(serviceName, {
				subscriptionId: existing?.subscriptionId ?? subscription.id ?? null,
				amount: (existing?.amount ?? 0) + normalizedAmount,
				color: existing?.color ?? subscription.color ?? null,
				iconType: existing?.iconType ?? subscription.iconType ?? null,
				iconValue: existing?.iconValue ?? subscription.iconValue ?? null,
				subscriptionCount: (existing?.subscriptionCount ?? 0) + 1
			});
		}
	}

	const snapshot = emptySubscriptionAnalytics();

	for (const period of PERIODS) {
		const summaries = SUPPORTED_CURRENCIES.flatMap((currency) => {
			const currencyGroup = grouped[period].get(currency);
			if (!currencyGroup) return [];

			const items = Array.from(currencyGroup.entries())
				.map(([serviceName, value]) => ({
					subscriptionId: value.subscriptionId,
					serviceName,
					color: value.color,
					iconType: value.iconType,
					iconValue: value.iconValue,
					amount: value.amount,
					subscriptionCount: value.subscriptionCount,
					share: 0
				}))
				.sort(
					(left, right) =>
						right.amount - left.amount || left.serviceName.localeCompare(right.serviceName)
				);

			const total = items.reduce((sum, item) => sum + item.amount, 0);
			return [
				{
					...createEmptySummary(currency),
					total,
					subscriptionCount: items.reduce((sum, item) => sum + item.subscriptionCount, 0),
					items: items.map((item) => ({
						...item,
						share: total > 0 ? item.amount / total : 0
					}))
				}
			];
		});

		snapshot[period] = {
			summaries,
			subscriptionCount: subscriptions.length
		};
	}

	return snapshot;
};
