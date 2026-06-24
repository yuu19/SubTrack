import { describe, expect, it } from 'vitest';
import { computeNextBilling } from './subscriptions';

describe('computeNextBilling', () => {
	it('uses the provided user time zone when computing days until billing', () => {
		const now = new Date('2026-06-24T00:30:00.000Z');

		expect(
			computeNextBilling('2026-06-24', 'monthly', {
				timeZone: 'Asia/Tokyo',
				now
			})
		).toEqual({
			nextBillingAt: '2026-06-24',
			daysUntilNextBilling: 0
		});

		expect(
			computeNextBilling('2026-06-24', 'monthly', {
				timeZone: 'America/Los_Angeles',
				now
			})
		).toEqual({
			nextBillingAt: '2026-06-24',
			daysUntilNextBilling: 1
		});
	});

	it('normalizes existing billing dates to YYYY-MM-DD', () => {
		expect(
			computeNextBilling('2026-04-01T00:00:00.000Z', 'monthly', {
				timeZone: 'UTC',
				now: new Date('2026-03-24T12:00:00.000Z')
			})
		).toEqual({
			nextBillingAt: '2026-04-01',
			daysUntilNextBilling: 8
		});
	});
});
