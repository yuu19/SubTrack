import { describe, expect, it } from 'vitest';
import { getReviewIdentity, mergeReviewRevisions, mergeReviewStates } from './subscription-reviews';
import type { ReviewState } from '$lib/subscription-reviews';

const state = (patch: Partial<ReviewState> = {}): ReviewState => ({
	billingDate: '2026-10-31',
	context: '[0,"2026-01-31","monthly",1000,"JPY"]',
	decision: null,
	reviewedAt: null,
	daysUntilBilling: 5,
	...patch
});

describe('review load/save race reconciliation', () => {
	it('does not replace a newer confirmed save with an earlier load', () => {
		const saved = state({ decision: 'keep', reviewedAt: 20 });
		expect(mergeReviewStates({ 1: saved }, { 1: state() })).toEqual({ 1: saved });
	});

	it('does not resurrect a decision after undo', () => {
		const undone = state({ decision: null, reviewedAt: 30 });
		expect(
			mergeReviewStates({ 1: undone }, { 1: state({ decision: 'keep', reviewedAt: 20 }) })
		).toEqual({ 1: undone });
	});

	it('accepts newer decisions loaded from another tab', () => {
		const loaded = state({ decision: 'review', reviewedAt: 30 });
		expect(
			mergeReviewStates({ 1: state({ decision: 'keep', reviewedAt: 20 }) }, { 1: loaded })
		).toEqual({ 1: loaded });
	});

	it('uses the new billing cycle or context even when the old decision has a timestamp', () => {
		const saved = state({ decision: 'keep', reviewedAt: 20 });
		const next = state({ billingDate: '2026-11-30' });
		const changed = state({ context: 'changed' });
		expect(mergeReviewStates({ 1: saved }, { 1: next })).toEqual({ 1: next });
		expect(mergeReviewStates({ 1: saved }, { 1: changed })).toEqual({ 1: changed });
	});

	it('drops states not returned for the current owner instead of leaking an old snapshot', () => {
		expect(mergeReviewStates({ 1: state(), 2: state() }, { 2: state() })).toEqual({ 2: state() });
		expect(mergeReviewStates({ 1: state() }, {})).toEqual({});
	});
});

describe('review revision identity', () => {
	it('normalizes the server Date and cached ISO or epoch representations', () => {
		const createdAt = new Date('2026-10-26T12:00:00.000Z');
		const identity = getReviewIdentity({ id: 1, createdAt });
		expect(getReviewIdentity({ id: 1, createdAt: createdAt.toISOString() })).toBe(identity);
		expect(getReviewIdentity({ id: 1, createdAt: createdAt.getTime() })).toBe(identity);
	});

	it('does not carry a deleted subscription revision into a reused ID', () => {
		const old = { id: 1, createdAt: 1000, reviewRevision: 5 };
		const recreated = { id: 1, createdAt: 2000, reviewRevision: 0 };
		const revisions = mergeReviewRevisions(mergeReviewRevisions({}, [old]), [recreated]);
		expect(revisions[getReviewIdentity(recreated)]).toBe(0);
		expect(revisions[getReviewIdentity(old)]).toBe(5);
	});

	it('ignores late old-instance revisions while preserving monotonicity within an instance', () => {
		const old = { id: 1, createdAt: 1000, reviewRevision: 9 };
		const recreated = { id: 1, createdAt: 2000, reviewRevision: 2 };
		const current = mergeReviewRevisions({}, [recreated]);
		const loaded = mergeReviewRevisions(current, [old, { ...recreated, reviewRevision: 0 }]);
		expect(loaded[getReviewIdentity(recreated)]).toBe(2);
		expect(loaded[getReviewIdentity(old)]).toBe(9);
	});
});
