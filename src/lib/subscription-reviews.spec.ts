import { describe, expect, it } from 'vitest';
import {
	getReviewContext,
	getReviewState,
	isReviewWithinDays,
	type ReviewSubscription
} from './subscription-reviews';

const subscription: ReviewSubscription = {
	createdAt: new Date('2024-01-01T12:00:00Z'),
	firstPaymentDate: '2024-01-31',
	cycle: 'monthly',
	amount: 500,
	currency: 'JPY',
	status: 'active',
	reviewRevision: 0
};

const stateAt = (date: string, changes: Partial<ReviewSubscription> = {}, timeZone = 'UTC') =>
	getReviewState({ ...subscription, ...changes }, null, { now: new Date(date), timeZone })!;

describe('billing-cycle review state', () => {
	it.each(['UTC', 'Asia/Tokyo', 'America/Los_Angeles'])(
		'keeps month-end and leap-year dates date-only in %s',
		(timeZone) => {
			expect(stateAt('2024-02-01T12:00:00Z', {}, timeZone).billingDate).toBe('2024-02-29');
			expect(stateAt('2024-03-01T12:00:00Z', {}, timeZone).billingDate).toBe('2024-03-31');
			expect(
				stateAt(
					'2025-02-01T12:00:00Z',
					{ firstPaymentDate: '2024-02-29', cycle: 'yearly' },
					timeZone
				).billingDate
			).toBe('2025-02-28');
		}
	);

	it('normalizes immutable creation identity across server and offline representations', () => {
		const date = subscription.createdAt as Date;
		expect(getReviewContext({ ...subscription, createdAt: date.toISOString() })).toBe(
			getReviewContext(subscription)
		);
		expect(getReviewContext({ ...subscription, createdAt: date.getTime() })).toBe(
			getReviewContext(subscription)
		);
		expect(getReviewContext({ ...subscription, createdAt: date.getTime() + 1 })).not.toBe(
			getReviewContext(subscription)
		);
		expect(getReviewState({ ...subscription, createdAt: 'invalid' }, null)).toBeNull();
	});

	it('uses the account calendar at the same instant across UTC, Japan, and LA', () => {
		const now = '2024-03-01T00:30:00Z';
		expect(stateAt(now, {}, 'UTC').billingDate).toBe('2024-03-31');
		expect(stateAt(now, {}, 'Asia/Tokyo').billingDate).toBe('2024-03-31');
		expect(stateAt(now, {}, 'America/Los_Angeles').billingDate).toBe('2024-02-29');
	});

	it('does not carry a judgment to the next billing occurrence', () => {
		const review = {
			billingDate: '2024-02-29',
			billingContext: getReviewContext(subscription),
			decision: 'keep' as const,
			reviewedAt: 1
		};
		expect(
			getReviewState(subscription, review, {
				now: new Date('2024-02-29T12:00:00Z'),
				timeZone: 'UTC'
			})?.decision
		).toBe('keep');
		expect(
			getReviewState(subscription, review, {
				now: new Date('2024-03-01T12:00:00Z'),
				timeZone: 'UTC'
			})
		).toMatchObject({ billingDate: '2024-03-31', decision: null, reviewedAt: null });
	});

	it.each([
		{ firstPaymentDate: '2023-01-31' },
		{ cycle: 'quarterly' },
		{ amount: 600 },
		{ currency: 'USD' },
		{ reviewRevision: 2 }
	])('invalidates a same-date judgment when terms or revision change: %o', (change) => {
		const review = {
			billingDate: '2024-01-31',
			billingContext: getReviewContext(subscription),
			decision: 'keep' as const,
			reviewedAt: 1
		};
		expect(
			getReviewState({ ...subscription, ...change }, review, {
				now: new Date('2024-01-30T12:00:00Z'),
				timeZone: 'UTC'
			})?.decision
		).toBeNull();
	});

	it('keeps undo revision even when the current decision is empty', () => {
		const review = {
			billingDate: '2024-01-31',
			billingContext: getReviewContext(subscription),
			decision: null,
			reviewedAt: 3
		};
		expect(
			getReviewState(subscription, review, {
				now: new Date('2024-01-30T12:00:00Z'),
				timeZone: 'UTC'
			})
		).toMatchObject({ decision: null, reviewedAt: 3 });
	});

	it.each([
		[0, true, true],
		[7, true, true],
		[8, false, true],
		[30, false, true],
		[31, false, false]
	])('uses inclusive calendar-day windows for day %i', (days, within7, within30) => {
		const state = { ...stateAt('2024-01-01T12:00:00Z'), daysUntilBilling: days as number };
		expect(isReviewWithinDays(state, 7)).toBe(within7);
		expect(isReviewWithinDays(state, 30)).toBe(within30);
	});

	it('excludes canceled and invalid schedules instead of inventing a date', () => {
		expect(getReviewState({ ...subscription, status: 'canceled' }, null)).toBeNull();
		expect(getReviewState({ ...subscription, cycle: 'weekly' }, null)).toBeNull();
		expect(getReviewState({ ...subscription, firstPaymentDate: '2024-02-30' }, null)).toBeNull();
	});
});
