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
				currency: 'JPY'
			},
			{
				id: 2,
				serviceName: 'Notion',
				color: 'blue',
				cycle: 'yearly',
				amount: 12000,
				currency: 'JPY'
			},
			{
				id: 3,
				serviceName: 'Figma',
				color: 'purple',
				cycle: 'quarterly',
				amount: 9000,
				currency: 'JPY'
			}
		]);
		const monthly = analytics.service.monthly.summaries[0];
		const yearly = analytics.service.yearly.summaries[0];

		expect(monthly.total).toBe(5000);
		expect(yearly.total).toBe(60000);
		expect(monthly.items.map((item) => [item.serviceName, item.amount])).toEqual([
			['Figma', 3000],
			['Netflix', 1000],
			['Notion', 1000]
		]);
		expect(yearly.items.map((item) => [item.serviceName, item.amount])).toEqual([
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
				currency: 'JPY'
			},
			{
				id: 2,
				serviceName: 'Spotify',
				color: 'yellow',
				iconType: 'preset',
				iconValue: 'box',
				cycle: 'yearly',
				amount: 12000,
				currency: 'JPY'
			}
		]);
		const monthly = analytics.service.monthly.summaries[0];
		const yearly = analytics.service.yearly.summaries[0];

		expect(monthly.items).toHaveLength(1);
		expect(monthly.items[0]).toMatchObject({
			subscriptionId: 1,
			serviceName: 'Spotify',
			color: 'green',
			iconType: 'preset',
			iconValue: 'music',
			amount: 1980,
			subscriptionCount: 2
		});
		expect(yearly.items[0].amount).toBe(23760);
	});

	it('keeps currency totals and shares separate', () => {
		const analytics = buildSubscriptionAnalytics([
			{
				id: 1,
				serviceName: 'Netflix',
				color: 'red',
				cycle: 'monthly',
				amount: 1000,
				currency: 'JPY'
			},
			{
				id: 2,
				serviceName: 'OpenAI',
				color: 'purple',
				cycle: 'monthly',
				amount: 20,
				currency: 'USD'
			}
		]);

		expect(analytics.service.monthly.summaries.map((summary) => summary.currency)).toEqual([
			'JPY',
			'USD'
		]);
		expect(analytics.service.monthly.summaries.map((summary) => summary.total)).toEqual([1000, 20]);
		expect(
			analytics.service.monthly.summaries.flatMap((summary) =>
				summary.items.map((item) => item.share)
			)
		).toEqual([1, 1]);
	});

	it('keeps decimal amounts and rounds cycle conversions to two decimal places', () => {
		const analytics = buildSubscriptionAnalytics([
			{
				id: 1,
				serviceName: 'Disney+',
				color: 'blue',
				cycle: 'yearly',
				amount: 189.99,
				currency: 'USD'
			},
			{
				id: 2,
				serviceName: 'Spotify',
				color: 'green',
				cycle: 'monthly',
				amount: 12.99,
				currency: 'USD'
			}
		]);
		const monthly = analytics.service.monthly.summaries.find(
			(summary) => summary.currency === 'USD'
		);
		const yearly = analytics.service.yearly.summaries.find((summary) => summary.currency === 'USD');

		expect(monthly?.total).toBe(28.82);
		expect(monthly?.items.map((item) => [item.serviceName, item.amount])).toEqual([
			['Disney+', 15.83],
			['Spotify', 12.99]
		]);
		expect(yearly?.total).toBe(345.87);
	});

	it('keeps the first available color for grouped services', () => {
		const analytics = buildSubscriptionAnalytics([
			{
				id: 1,
				serviceName: 'YouTube',
				color: 'red',
				cycle: 'monthly',
				amount: 1280,
				currency: 'JPY'
			},
			{
				id: 2,
				serviceName: 'YouTube',
				color: 'blue',
				cycle: 'monthly',
				amount: 500,
				currency: 'JPY'
			},
			{
				id: 3,
				serviceName: 'Dropbox',
				color: null,
				cycle: 'monthly',
				amount: 1500,
				currency: 'JPY'
			}
		]);
		const monthly = analytics.service.monthly.summaries[0];

		expect(monthly.items.find((item) => item.serviceName === 'YouTube')?.color).toBe('red');
		expect(monthly.items.find((item) => item.serviceName === 'Dropbox')?.color).toBeNull();
	});

	it('builds category and payment method breakdowns', () => {
		const analytics = buildSubscriptionAnalytics([
			{
				id: 1,
				serviceName: 'Netflix',
				color: 'red',
				categoryName: '動画',
				categoryColor: 'red',
				paymentMethodName: 'クレジットカード',
				cycle: 'monthly',
				amount: 1490,
				currency: 'JPY'
			},
			{
				id: 2,
				serviceName: 'Spotify',
				color: 'green',
				categoryName: '音楽',
				categoryColor: 'green',
				paymentMethodName: 'Apple / Google',
				cycle: 'monthly',
				amount: 980,
				currency: 'JPY'
			},
			{
				id: 3,
				serviceName: 'YouTube',
				color: 'red',
				categoryName: '動画',
				categoryColor: 'red',
				paymentMethodName: 'クレジットカード',
				cycle: 'monthly',
				amount: 1280,
				currency: 'JPY'
			}
		]);

		expect(
			analytics.category.monthly.summaries[0].items.map((item) => [item.serviceName, item.amount])
		).toEqual([
			['動画', 2770],
			['音楽', 980]
		]);
		expect(
			analytics.paymentMethod.monthly.summaries[0].items.map((item) => [
				item.serviceName,
				item.amount
			])
		).toEqual([
			['クレジットカード', 2770],
			['Apple / Google', 980]
		]);
	});
});
