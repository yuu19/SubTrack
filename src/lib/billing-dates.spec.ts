import { describe, expect, it } from 'vitest';
import { billingDatesBetween, computeNextBilling, nextBillingDateOnOrAfter } from './billing-dates';

describe('anchored billing recurrence', () => {
	it.each([
		['2026-01-31', 'monthly', '2026-02-01', '2026-02-28'],
		['2026-01-31', 'monthly', '2026-03-01', '2026-03-31'],
		['2026-01-31', 'monthly', '2026-03-29', '2026-03-31'],
		['2026-01-30', 'monthly', '2026-03-01', '2026-03-30'],
		['2026-01-29', 'monthly', '2026-03-01', '2026-03-29'],
		['2026-01-31', 'quarterly', '2026-05-01', '2026-07-31'],
		['2024-02-29', 'yearly', '2025-02-01', '2025-02-28'],
		['2024-02-29', 'yearly', '2028-02-01', '2028-02-29'],
		['2024-02-29', 'yearly', '2028-03-01', '2029-02-28'],
		['2026-03-31', 'monthly', '2026-01-01', '2026-03-31'],
		['2026-03-31', 'monthly', '2026-03-31', '2026-03-31'],
		['2026-03-31', 'monthly', '2026-04-01', '2026-04-30'],
		['1900-01-31', 'monthly', '2026-03-01', '2026-03-31'],
		['2026-01-31T00:00:00.000Z', 'monthly', '2026-03-01', '2026-03-31']
	])('%s %s on %s is %s', (first, cycle, today, expected) => {
		expect(nextBillingDateOnOrAfter(first, cycle, today)).toBe(expected);
	});

	it('returns the same occurrence across adjacent calendar ranges', () => {
		const may = billingDatesBetween('2026-01-31', 'monthly', '2026-04-26', '2026-06-06');
		const june = billingDatesBetween('2026-01-31', 'monthly', '2026-05-31', '2026-07-11');
		expect(may).toEqual(['2026-04-30', '2026-05-31']);
		expect(june).toEqual(['2026-05-31', '2026-06-30']);
	});

	it('does not generate events before a future first payment or outside the inclusive range', () => {
		expect(billingDatesBetween('2026-06-24', 'monthly', '2026-05-01', '2026-06-23')).toEqual([]);
		expect(billingDatesBetween('2026-06-24', 'monthly', '2026-06-24', '2026-06-24')).toEqual([
			'2026-06-24'
		]);
		expect(billingDatesBetween('2026-01-31', 'quarterly', '2026-01-01', '2027-01-31')).toEqual([
			'2026-01-31',
			'2026-04-30',
			'2026-07-31',
			'2026-10-31',
			'2027-01-31'
		]);
	});

	it.each([
		['2026-02-30', 'monthly'],
		['not-a-date', 'monthly'],
		['2026-13-01', 'monthly'],
		['2026-01-31', 'weekly'],
		['2026-01-31', ''],
		['0000-01-01', 'monthly']
	])('does not invent occurrences for invalid %s / %s', (first, cycle) => {
		expect(nextBillingDateOnOrAfter(first, cycle, '2026-03-01')).toBeNull();
		expect(billingDatesBetween(first, cycle, '2026-01-01', '2027-01-01')).toEqual([]);
	});

	it('terminates at calendar bounds and rejects invalid/reversed ranges', () => {
		expect(nextBillingDateOnOrAfter('9999-01-31', 'yearly', '9999-02-01')).toBeNull();
		expect(billingDatesBetween('9999-12-31', 'monthly', '9999-12-01', '9999-12-31')).toEqual([
			'9999-12-31'
		]);
		expect(billingDatesBetween('2026-01-01', 'monthly', 'not-a-date', '2026-12-31')).toEqual([]);
		expect(billingDatesBetween('2026-01-01', 'monthly', '2026-02-01', '2026-01-01')).toEqual([]);
		expect(nextBillingDateOnOrAfter('2026-01-01', 'monthly', '2026-02-30')).toBeNull();
	});

	it.each([
		['2026-03-08T09:30:00.000Z', '2026-03-09', 1],
		['2026-03-08T10:30:00.000Z', '2026-03-09', 1],
		['2026-11-01T08:30:00.000Z', '2026-11-02', 1],
		['2026-11-01T09:30:00.000Z', '2026-11-02', 1],
		['2026-06-25T06:59:59.000Z', '2026-06-24', 0],
		['2026-06-25T07:00:00.000Z', '2026-07-24', 29]
	])('uses calendar days across DST and end-of-day at %s', (now, next, days) => {
		const first = next.endsWith('-09')
			? '2026-01-09'
			: next.endsWith('-02')
				? '2026-01-02'
				: '2026-06-24';
		expect(
			computeNextBilling(first, 'monthly', { timeZone: 'America/Los_Angeles', now: new Date(now) })
		).toEqual({
			nextBillingAt: next,
			daysUntilNextBilling: days
		});
	});
});
