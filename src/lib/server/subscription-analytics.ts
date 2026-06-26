import type { trackedSubscriptionTable } from '$lib/server/db/schema';
import type { SubscriptionIconType } from '$lib/subscription-icons';
import type { SubscriptionColor } from '$lib/subscription-colors';

export type AnalyticsPeriod = 'monthly' | 'yearly';

export type AnalyticsSubscription = Pick<
	typeof trackedSubscriptionTable.$inferSelect,
	'id' | 'serviceName' | 'cycle' | 'amount' | 'firstPaymentDate'
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

export type SubscriptionAnalyticsTrendPoint = {
	month: string;
	amount: number;
};

export type SubscriptionAnalyticsSummary = {
	total: number;
	items: SubscriptionAnalyticsItem[];
	subscriptionCount: number;
	trend: SubscriptionAnalyticsTrendPoint[];
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
	subscriptionCount: 0,
	trend: []
});

export const emptySubscriptionAnalytics = (): SubscriptionAnalyticsSnapshot => ({
	monthly: createEmptySummary(),
	yearly: createEmptySummary()
});

const cycleToMonths = (cycle: string) => {
	if (cycle === 'yearly') return 12;
	if (cycle === 'quarterly') return 3;
	return 1;
};

const parseDateParts = (value: string) => {
	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
	if (!match) return null;

	const year = Number(match[1]);
	const month = Number(match[2]) - 1;
	const day = Number(match[3]);
	const parsed = new Date(Date.UTC(year, month, day));

	if (
		parsed.getUTCFullYear() !== year ||
		parsed.getUTCMonth() !== month ||
		parsed.getUTCDate() !== day
	) {
		return null;
	}

	return { year, month, day };
};

const daysInMonth = (year: number, month: number) =>
	new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

const addMonths = (parts: { year: number; month: number; day: number }, months: number) => {
	const targetMonthIndex = parts.month + months;
	const year = parts.year + Math.floor(targetMonthIndex / 12);
	const month = ((targetMonthIndex % 12) + 12) % 12;
	return {
		year,
		month,
		day: Math.min(parts.day, daysInMonth(year, month))
	};
};

const compareMonth = (parts: { year: number; month: number }, year: number, month: number) =>
	parts.year === year ? parts.month - month : parts.year - year;

const buildTrend = (
	subscriptions: AnalyticsSubscription[],
	from: Date,
	months = 6
): SubscriptionAnalyticsTrendPoint[] => {
	const startYear = from.getFullYear();
	const startMonth = from.getMonth();

	return Array.from({ length: months }, (_, offset) => {
		const target = addMonths({ year: startYear, month: startMonth, day: 1 }, offset);
		const amount = subscriptions.reduce((sum, subscription) => {
			if (!Number.isFinite(subscription.amount) || subscription.amount <= 0) return sum;

			const first = parseDateParts(subscription.firstPaymentDate);
			if (!first) return sum;

			const interval = cycleToMonths(subscription.cycle);
			let occurrence = first;
			let guard = 0;
			while (compareMonth(occurrence, target.year, target.month) < 0 && guard < 240) {
				occurrence = addMonths(occurrence, interval);
				guard += 1;
			}

			return compareMonth(occurrence, target.year, target.month) === 0
				? sum + subscription.amount
				: sum;
		}, 0);

		return {
			month: `${target.year}-${String(target.month + 1).padStart(2, '0')}`,
			amount
		};
	});
};

export const buildSubscriptionAnalytics = (
	subscriptions: AnalyticsSubscription[],
	options: { now?: Date } = {}
): SubscriptionAnalyticsSnapshot => {
	const grouped = {
		monthly: new Map<
			string,
			{
				subscriptionId: number | null;
				amount: number;
				color: SubscriptionColor | null;
				iconType: SubscriptionIconType | string | null;
				iconValue: string | null;
				subscriptionCount: number;
			}
		>(),
		yearly: new Map<
			string,
			{
				subscriptionId: number | null;
				amount: number;
				color: SubscriptionColor | null;
				iconType: SubscriptionIconType | string | null;
				iconValue: string | null;
				subscriptionCount: number;
			}
		>()
	} satisfies Record<
		AnalyticsPeriod,
		Map<
			string,
			{
				subscriptionId: number | null;
				amount: number;
				color: SubscriptionColor | null;
				iconType: SubscriptionIconType | string | null;
				iconValue: string | null;
				subscriptionCount: number;
			}
		>
	>;

	for (const subscription of subscriptions) {
		const serviceName = subscription.serviceName.trim() || 'Unknown';

		for (const period of PERIODS) {
			const normalizedAmount = normalizeAmount(subscription.amount, subscription.cycle, period);
			if (normalizedAmount <= 0) continue;

			const existing = grouped[period].get(serviceName);
			grouped[period].set(serviceName, {
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
	const trend =
		subscriptions.length > 0 ? buildTrend(subscriptions, options.now ?? new Date()) : [];

	for (const period of PERIODS) {
		const items = Array.from(grouped[period].entries())
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
		snapshot[period] = {
			total,
			subscriptionCount: subscriptions.length,
			trend,
			items: items.map((item) => ({
				...item,
				share: total > 0 ? item.amount / total : 0
			}))
		};
	}

	return snapshot;
};
