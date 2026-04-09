import { describe, expect, it } from 'vitest';
import { buildSubscriptionAnalytics, emptySubscriptionAnalytics } from './subscription-analytics';

describe('subscription analytics', () => {
	it('returns empty summaries when there are no subscriptions', () => {
		expect(buildSubscriptionAnalytics([])).toEqual(emptySubscriptionAnalytics());
	});

	it('normalizes monthly and yearly values by cycle', () => {
		const analytics = buildSubscriptionAnalytics([
			{ serviceName: 'Netflix', cycle: 'monthly', amount: 1000 },
			{ serviceName: 'Notion', cycle: 'yearly', amount: 12000 },
			{ serviceName: 'Figma', cycle: 'quarterly', amount: 9000 }
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
			{ serviceName: 'Spotify', cycle: 'monthly', amount: 980 },
			{ serviceName: 'Spotify', cycle: 'yearly', amount: 12000 }
		]);

		expect(analytics.monthly.items).toHaveLength(1);
		expect(analytics.monthly.items[0]).toMatchObject({
			serviceName: 'Spotify',
			amount: 1980,
			subscriptionCount: 2
		});
		expect(analytics.yearly.items[0].amount).toBe(23760);
	});
});
