import { describe, expect, it } from 'vitest';
import { buildSubscriptionAnalytics, emptySubscriptionAnalytics } from './subscription-analytics';

describe('subscription analytics', () => {
	it('returns empty summaries when there are no subscriptions', () => {
		expect(buildSubscriptionAnalytics([])).toEqual(emptySubscriptionAnalytics());
	});

	it('normalizes monthly and yearly values by cycle', () => {
		const analytics = buildSubscriptionAnalytics([
			{
				id: 1,
				serviceName: 'Netflix',
				color: 'red',
				cycle: 'monthly',
				amount: 1000,
				firstPaymentDate: '2026-01-01'
			},
			{
				id: 2,
				serviceName: 'Notion',
				color: 'blue',
				cycle: 'yearly',
				amount: 12000,
				firstPaymentDate: '2026-01-01'
			},
			{
				id: 3,
				serviceName: 'Figma',
				color: 'purple',
				cycle: 'quarterly',
				amount: 9000,
				firstPaymentDate: '2026-01-01'
			}
		]);

		expect(analytics.monthly.total).toBe(5000);
		expect(analytics.yearly.total).toBe(60000);
		expect(analytics.monthly.items.map((item) => [item.serviceName, item.amount])).toEqual([
			['Figma', 3000],
			['Netflix', 1000],
			['Notion', 1000]
		]);
		expect(analytics.yearly.items.map((item) => [item.serviceName, item.amount])).toEqual([
			['Figma', 36000],
			['Netflix', 12000],
			['Notion', 12000]
		]);
	});

	it('merges duplicate service names into a single breakdown row', () => {
		const analytics = buildSubscriptionAnalytics([
			{
				id: 1,
				serviceName: 'Spotify',
				color: 'green',
				iconType: 'preset',
				iconValue: 'music',
				cycle: 'monthly',
				amount: 980,
				firstPaymentDate: '2026-01-01'
			},
			{
				id: 2,
				serviceName: 'Spotify',
				color: 'yellow',
				iconType: 'preset',
				iconValue: 'box',
				cycle: 'yearly',
				amount: 12000,
				firstPaymentDate: '2026-01-01'
			}
		]);

		expect(analytics.monthly.items).toHaveLength(1);
		expect(analytics.monthly.items[0]).toMatchObject({
			subscriptionId: 1,
			serviceName: 'Spotify',
			color: 'green',
			iconType: 'preset',
			iconValue: 'music',
			amount: 1980,
			subscriptionCount: 2
		});
		expect(analytics.yearly.items[0].amount).toBe(23760);
	});

	it('keeps the first available color for grouped services', () => {
		const analytics = buildSubscriptionAnalytics([
			{
				id: 1,
				serviceName: 'YouTube',
				color: 'red',
				cycle: 'monthly',
				amount: 1280,
				firstPaymentDate: '2026-01-01'
			},
			{
				id: 2,
				serviceName: 'YouTube',
				color: 'blue',
				cycle: 'monthly',
				amount: 500,
				firstPaymentDate: '2026-01-01'
			},
			{
				id: 3,
				serviceName: 'Dropbox',
				color: null,
				cycle: 'monthly',
				amount: 1500,
				firstPaymentDate: '2026-01-01'
			}
		]);

		expect(analytics.monthly.items.find((item) => item.serviceName === 'YouTube')?.color).toBe(
			'red'
		);
		expect(
			analytics.monthly.items.find((item) => item.serviceName === 'Dropbox')?.color
		).toBeNull();
	});

	it('builds a six month billing forecast from subscription cycles', () => {
		const analytics = buildSubscriptionAnalytics(
			[
				{
					id: 1,
					serviceName: 'Monthly',
					color: 'red',
					cycle: 'monthly',
					amount: 1000,
					firstPaymentDate: '2026-01-10'
				},
				{
					id: 2,
					serviceName: 'Quarterly',
					color: 'blue',
					cycle: 'quarterly',
					amount: 3000,
					firstPaymentDate: '2026-02-15'
				}
			],
			{ now: new Date(2026, 0, 1) }
		);

		expect(analytics.monthly.trend).toEqual([
			{ month: '2026-01', amount: 1000 },
			{ month: '2026-02', amount: 4000 },
			{ month: '2026-03', amount: 1000 },
			{ month: '2026-04', amount: 1000 },
			{ month: '2026-05', amount: 4000 },
			{ month: '2026-06', amount: 1000 }
		]);
		expect(analytics.yearly.trend).toEqual(analytics.monthly.trend);
	});
});
