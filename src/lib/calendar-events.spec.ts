import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCalendarEvents } from './calendar-events';

const subscription = {
	id: 1,
	serviceName: 'Month end',
	firstPaymentDate: '2026-01-31',
	cycle: 'monthly',
	status: 'active' as const,
	amount: 1000,
	currency: 'JPY' as const,
	color: 'blue' as const,
	iconType: 'preset' as const,
	iconValue: 'box'
};

describe('calendar billing events', () => {
	afterEach(() => vi.unstubAllEnvs());

	it('keeps the same May billing date in the May and June grids', () => {
		const may = buildCalendarEvents([subscription], '2026-04-26', '2026-06-06');
		const june = buildCalendarEvents([subscription], '2026-05-31', '2026-07-11');
		const mayEvent = may.find((event) => event.date.startsWith('2026-05'));
		expect(mayEvent?.date).toBe('2026-05-31');
		expect(june.find((event) => event.date === '2026-05-31')).toEqual(mayEvent);
		expect(may.map((event) => event.date)).toEqual(['2026-04-30', '2026-05-31']);
	});

	it('uses the date portion of legacy ISO billing dates in a western device time zone', () => {
		vi.stubEnv('TZ', 'America/Los_Angeles');
		expect(
			buildCalendarEvents(
				[{ ...subscription, firstPaymentDate: '2026-06-24T00:00:00.000Z' }],
				'2026-06-01',
				'2026-06-30'
			).map((event) => event.date)
		).toEqual(['2026-06-24']);
	});

	it('does not generate future bills for canceled subscriptions or invalid recurrence data', () => {
		expect(
			buildCalendarEvents(
				[
					{ ...subscription, status: 'canceled' },
					{ ...subscription, firstPaymentDate: '2026-02-30' },
					{ ...subscription, cycle: 'invalid' }
				],
				'2026-04-01',
				'2026-06-30'
			)
		).toEqual([]);
	});

	it('includes boundary dates but no occurrence before the first payment', () => {
		expect(
			buildCalendarEvents([subscription], '2025-01-01', '2026-01-31').map((event) => event.date)
		).toEqual(['2026-01-31']);
		expect(
			buildCalendarEvents([subscription], '2026-01-31', '2026-01-31').map((event) => event.date)
		).toEqual(['2026-01-31']);
	});
});
