import type { trackedSubscriptionTable } from '$lib/server/db/schema';
import type { SubscriptionIconType } from '$lib/subscription-icons';
import type { SubscriptionColor } from '$lib/subscription-colors';
import {
	DEFAULT_SUBSCRIPTION_CURRENCY,
	SUPPORTED_CURRENCIES,
	type SubscriptionCurrency
} from '$lib/constant';

export type AnalyticsPeriod = 'monthly' | 'yearly';
export type AnalyticsDimension = 'service' | 'category' | 'paymentMethod';

export type AnalyticsSubscription = Pick<
	typeof trackedSubscriptionTable.$inferSelect,
	'id' | 'serviceName' | 'cycle' | 'amount' | 'currency'
> & {
	color?: SubscriptionColor | null;
	iconType?: SubscriptionIconType | string | null;
	iconValue?: string | null;
	categoryName?: string | null;
	categoryColor?: SubscriptionColor | null;
	paymentMethodName?: string | null;
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
	AnalyticsDimension,
	Record<AnalyticsPeriod, SubscriptionAnalyticsPeriodSnapshot>
>;

const PERIODS: AnalyticsPeriod[] = ['monthly', 'yearly'];
const DIMENSIONS: AnalyticsDimension[] = ['service', 'category', 'paymentMethod'];
const AMOUNT_DECIMAL_PLACES = 2;

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

	const roundAmount = (value: number) =>
		Math.round((value + Number.EPSILON) * 10 ** AMOUNT_DECIMAL_PLACES) /
		10 ** AMOUNT_DECIMAL_PLACES;

	if (period === 'monthly') {
		if (cycle === 'yearly') return roundAmount(amount / 12);
		if (cycle === 'quarterly') return roundAmount(amount / 3);
		return roundAmount(amount);
	}

	if (cycle === 'yearly') return roundAmount(amount);
	if (cycle === 'quarterly') return roundAmount(amount * 4);
	return roundAmount(amount * 12);
};

const roundAmountSum = (amount: number) =>
	Math.round((amount + Number.EPSILON) * 10 ** AMOUNT_DECIMAL_PLACES) / 10 ** AMOUNT_DECIMAL_PLACES;

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

const emptyPeriodSnapshots = (): Record<AnalyticsPeriod, SubscriptionAnalyticsPeriodSnapshot> => ({
	monthly: createEmptyPeriodSnapshot(),
	yearly: createEmptyPeriodSnapshot()
});

export const emptySubscriptionAnalytics = (): SubscriptionAnalyticsSnapshot => ({
	service: emptyPeriodSnapshots(),
	category: emptyPeriodSnapshots(),
	paymentMethod: emptyPeriodSnapshots()
});

const getDimensionValues = (subscription: AnalyticsSubscription, dimension: AnalyticsDimension) => {
	if (dimension === 'category') {
		return {
			groupName: subscription.categoryName?.trim() || 'Uncategorized',
			color: subscription.categoryColor ?? null,
			iconType: null,
			iconValue: null
		};
	}

	if (dimension === 'paymentMethod') {
		return {
			groupName: subscription.paymentMethodName?.trim() || 'Not set',
			color: null,
			iconType: null,
			iconValue: null
		};
	}

	return {
		groupName: subscription.serviceName.trim() || 'Unknown',
		color: subscription.color ?? null,
		iconType: subscription.iconType ?? null,
		iconValue: subscription.iconValue ?? null
	};
};

export const buildSubscriptionAnalytics = (
	subscriptions: AnalyticsSubscription[]
): SubscriptionAnalyticsSnapshot => {
	const snapshot = emptySubscriptionAnalytics();

	for (const dimension of DIMENSIONS) {
		const grouped: GroupedAnalytics = {
			monthly: new Map<SubscriptionCurrency, Map<string, GroupedAnalyticsRow>>(),
			yearly: new Map<SubscriptionCurrency, Map<string, GroupedAnalyticsRow>>()
		};

		for (const subscription of subscriptions) {
			const currency = resolveCurrency(subscription.currency);
			const dimensionValues = getDimensionValues(subscription, dimension);

			for (const period of PERIODS) {
				const normalizedAmount = normalizeAmount(subscription.amount, subscription.cycle, period);
				if (normalizedAmount <= 0) continue;

				const currencyGroup =
					grouped[period].get(currency) ?? new Map<string, GroupedAnalyticsRow>();
				grouped[period].set(currency, currencyGroup);

				const existing = currencyGroup.get(dimensionValues.groupName);
				currencyGroup.set(dimensionValues.groupName, {
					subscriptionId: existing?.subscriptionId ?? subscription.id ?? null,
					amount: roundAmountSum((existing?.amount ?? 0) + normalizedAmount),
					color: existing?.color ?? dimensionValues.color,
					iconType: existing?.iconType ?? dimensionValues.iconType,
					iconValue: existing?.iconValue ?? dimensionValues.iconValue,
					subscriptionCount: (existing?.subscriptionCount ?? 0) + 1
				});
			}
		}

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

				const total = roundAmountSum(items.reduce((sum, item) => sum + item.amount, 0));
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

			snapshot[dimension][period] = {
				summaries,
				subscriptionCount: subscriptions.length
			};
		}
	}

	return snapshot;
};
