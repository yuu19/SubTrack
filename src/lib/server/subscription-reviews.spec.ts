import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getReviewState, type ReviewState } from '$lib/subscription-reviews';
import { subscriptionReviewTable, trackedSubscriptionTable, user } from './db/schema';
import { createTestDb } from './test-db';
import {
	listReviewStates,
	parseReviewInput,
	saveSubscriptionReview,
	type ReviewInput
} from './subscription-reviews';

let fixture: Awaited<ReturnType<typeof createTestDb>>;
const now = new Date('2024-01-24T12:00:00Z');
const ownerId = 'review-owner';
const otherId = 'other-owner';

beforeEach(async () => {
	fixture = await createTestDb();
	for (const id of [ownerId, otherId]) {
		fixture.db
			.insert(user)
			.values({ id, name: id, email: `${id}@example.test`, timeZone: 'UTC' })
			.run();
	}
	for (const [id, userId] of [
		[1, ownerId],
		[2, otherId]
	] as const) {
		fixture.db
			.insert(trackedSubscriptionTable)
			.values({
				id,
				userId,
				serviceName: `Service ${id}`,
				firstPaymentDate: '2024-01-31',
				cycle: 'monthly',
				amount: 500,
				currency: 'JPY',
				nextBillingAt: '2024-01-31',
				daysUntilNextBilling: 7,
				tags: []
			})
			.run();
	}
});
afterEach(() => {
	fixture?.sqlite.close();
	vi.restoreAllMocks();
});

function input(decision: ReviewInput['decision'] = 'keep', state?: ReviewState): ReviewInput {
	const current =
		state ??
		getReviewState(
			fixture.db
				.select()
				.from(trackedSubscriptionTable)
				.where(eq(trackedSubscriptionTable.id, 1))
				.get()!,
			null,
			{ now, timeZone: 'UTC' }
		)!;
	return {
		id: 1,
		billingDate: current.billingDate,
		context: current.context,
		reviewedAt: current.reviewedAt,
		decision
	};
}
async function save(data: ReviewInput, userId = ownerId) {
	return saveSubscriptionReview(fixture.db, userId, data, now);
}

function form(overrides: Record<string, string | undefined> = {}) {
	const state = input();
	const data = new FormData();
	for (const [key, value] of Object.entries({
		...state,
		id: String(state.id),
		reviewedAt: '',
		...overrides
	}))
		data.set(key, String(value));
	return data;
}

describe('subscription review persistence', () => {
	it('saves, changes, undoes, and retries without duplicate writes or stale resurrection', async () => {
		const first = input();
		const kept = await save(first);
		expect(kept).toHaveProperty('reviewState');
		if (!('reviewState' in kept)) throw new Error('Expected save');
		expect(await save(first)).toEqual(kept);
		const review = await save(input('review', kept.reviewState));
		expect(review).toHaveProperty('reviewState');
		if (!('reviewState' in review)) throw new Error('Expected change');
		expect(review.reviewState.reviewedAt).toBe(now.getTime() + 1);
		expect(await save(first)).toEqual({ reviewError: 'stale' });
		const undoInput = input('undo', review.reviewState);
		const undone = await save(undoInput);
		expect(undone).toMatchObject({
			reviewState: { decision: null, reviewedAt: now.getTime() + 2 }
		});
		expect(await save(undoInput)).toEqual(undone);
		expect(await save(first)).toEqual({ reviewError: 'stale' });
		expect(fixture.db.select().from(subscriptionReviewTable).all()).toHaveLength(1);
		expect(
			fixture.db
				.select()
				.from(trackedSubscriptionTable)
				.where(eq(trackedSubscriptionTable.id, 1))
				.get()
		).toMatchObject({ status: 'active', lastNotifiedAt: null, lastNotifiedDate: null });
	});

	it('rejects a deleted subscription’s initial review after its numeric ID is reused', async () => {
		// SQLite may reuse the highest INTEGER PRIMARY KEY. A review must bind to the row instance.
		fixture.db.delete(trackedSubscriptionTable).where(eq(trackedSubscriptionTable.id, 2)).run();
		const old = fixture.db
			.select()
			.from(trackedSubscriptionTable)
			.where(eq(trackedSubscriptionTable.id, 1))
			.get()!;
		const stale = input();
		fixture.db.delete(trackedSubscriptionTable).where(eq(trackedSubscriptionTable.id, 1)).run();
		const { id: _oldId, ...values } = old;
		fixture.db
			.insert(trackedSubscriptionTable)
			.values({
				...values,
				serviceName: 'Replacement service',
				createdAt: new Date(old.createdAt.getTime() + 1)
			})
			.run();
		expect(fixture.db.select().from(trackedSubscriptionTable).get()?.id).toBe(_oldId);
		expect(await save(stale)).toEqual({ reviewError: 'stale' });
		expect(fixture.db.select().from(subscriptionReviewTable).all()).toHaveLength(0);
		expect(await save(input())).toHaveProperty('reviewState');
	});

	it('guards deletion and ID reuse between validation and the SQL write', async () => {
		const old = fixture.db
			.select()
			.from(trackedSubscriptionTable)
			.where(eq(trackedSubscriptionTable.id, 1))
			.get()!;
		const originalAll = fixture.db.all.bind(fixture.db);
		vi.spyOn(fixture.db, 'all').mockImplementationOnce((query) => {
			fixture.db.delete(trackedSubscriptionTable).where(eq(trackedSubscriptionTable.id, 1)).run();
			fixture.db
				.insert(trackedSubscriptionTable)
				.values({
					...old,
					createdAt: new Date(old.createdAt.getTime() + 1),
					serviceName: 'Replacement'
				})
				.run();
			return originalAll(query);
		});
		expect(await save(input())).toEqual({ reviewError: 'stale' });
		expect(fixture.db.select().from(subscriptionReviewTable).all()).toHaveLength(0);
	});

	it('does not let an old undo remove a newer decision', async () => {
		const kept = await save(input());
		if (!('reviewState' in kept)) throw new Error('Expected save');
		const oldUndo = input('undo', kept.reviewState);
		const changed = await save(input('review', kept.reviewState));
		expect(changed).toHaveProperty('reviewState');
		expect(await save(oldUndo)).toEqual({ reviewError: 'stale' });
	});

	it('uses authenticated ownership and never returns another owner’s review state', async () => {
		expect(await save({ ...input(), id: 2 })).toEqual({ reviewError: 'not_found' });
		expect(await save(input(), otherId)).toEqual({ reviewError: 'not_found' });
		expect(await save(input())).toHaveProperty('reviewState');
		const states = await listReviewStates(
			fixture.db,
			otherId,
			fixture.db.select().from(trackedSubscriptionTable).all(),
			{ now, timeZone: 'UTC' }
		);
		expect(Object.keys(states)).toEqual(['2']);
		expect(states[2].decision).toBeNull();
	});

	it.each([
		{ status: 'canceled' as const },
		{ cycle: 'quarterly' },
		{ firstPaymentDate: '2024-02-01' },
		{ amount: 900 },
		{ currency: 'USD' as const },
		{ reviewRevision: 1 }
	])('rejects stale or canceled subscription state: %o', async (change) => {
		const stale = input();
		fixture.db
			.update(trackedSubscriptionTable)
			.set(change)
			.where(eq(trackedSubscriptionTable.id, 1))
			.run();
		expect(await save(stale)).toEqual({ reviewError: 'stale' });
		expect(fixture.db.select().from(subscriptionReviewTable).all()).toHaveLength(0);
	});

	it('rejects previous/fabricated dates and uses account timezone when the cycle rolls over', async () => {
		expect(await save({ ...input(), billingDate: '2024-02-01' })).toEqual({ reviewError: 'stale' });
		expect(
			await saveSubscriptionReview(fixture.db, ownerId, input(), new Date('2024-02-01T00:30:00Z'))
		).toEqual({ reviewError: 'stale' });
		fixture.db
			.update(user)
			.set({ timeZone: 'America/Los_Angeles' })
			.where(eq(user.id, ownerId))
			.run();
		expect(
			await saveSubscriptionReview(fixture.db, ownerId, input(), new Date('2024-02-01T00:30:00Z'))
		).toHaveProperty('reviewState');
	});

	it.each(['cancel', 'terms', 'timezone'] as const)(
		'guards a %s change between validation and the SQL write',
		async (change) => {
			const originalAll = fixture.db.all.bind(fixture.db);
			vi.spyOn(fixture.db, 'all').mockImplementationOnce((query) => {
				if (change === 'timezone')
					fixture.db.update(user).set({ timeZone: 'Asia/Tokyo' }).where(eq(user.id, ownerId)).run();
				else
					fixture.db
						.update(trackedSubscriptionTable)
						.set(change === 'cancel' ? { status: 'canceled' } : { amount: 600, reviewRevision: 1 })
						.where(eq(trackedSubscriptionTable.id, 1))
						.run();
				return originalAll(query);
			});
			expect(await save(input())).toEqual({ reviewError: 'stale' });
			expect(fixture.db.select().from(subscriptionReviewTable).all()).toHaveLength(0);
		}
	);

	it('cascades reviews when subscription or owner is deleted', async () => {
		await save(input());
		fixture.db.delete(trackedSubscriptionTable).where(eq(trackedSubscriptionTable.id, 1)).run();
		expect(fixture.db.select().from(subscriptionReviewTable).all()).toHaveLength(0);
		const otherSub = fixture.db
			.select()
			.from(trackedSubscriptionTable)
			.where(eq(trackedSubscriptionTable.id, 2))
			.get()!;
		const state = getReviewState(otherSub, null, { now, timeZone: 'UTC' })!;
		await save({ ...input('review', state), id: 2 }, otherId);
		fixture.db.delete(user).where(eq(user.id, otherId)).run();
		expect(fixture.db.select().from(subscriptionReviewTable).all()).toHaveLength(0);
	});
});

describe('review input boundary', () => {
	it.each([
		{ id: '' },
		{ id: '0' },
		{ id: '-1' },
		{ id: '1.2' },
		{ id: '9007199254740992' },
		{ decision: 'cancel' },
		{ billingDate: '2024-02-30' },
		{ billingDate: '2024-01-31T00:00:00Z' },
		{ context: '' },
		{ reviewedAt: '-1' },
		{ reviewedAt: 'NaN' }
	])('rejects invalid input: %o', (change) => {
		expect(parseReviewInput(form(change))).toBeNull();
	});
	it('ignores an untrusted userId and accepts only declared input', () => {
		expect(parseReviewInput(form({ userId: otherId }))).toEqual(input());
	});
});

describe('manual 0028 migration', () => {
	it('is additive, preserves old data, and supplies default revision, constraints, and cascades', () => {
		const sqlite = new Database(':memory:');
		try {
			sqlite.pragma('foreign_keys = ON');
			sqlite.exec(
				"CREATE TABLE user (id text PRIMARY KEY); CREATE TABLE tracked_subscription (id integer PRIMARY KEY, service_name text); INSERT INTO user VALUES ('owner'); INSERT INTO tracked_subscription VALUES (1, 'Before migration');"
			);
			sqlite.exec(readFileSync('migrations/0028_subscription_reviews.sql', 'utf8'));
			expect(sqlite.prepare('SELECT * FROM tracked_subscription').get()).toEqual({
				id: 1,
				service_name: 'Before migration',
				review_revision: 0
			});
			const insert = sqlite.prepare(
				'INSERT INTO subscription_review (user_id, subscription_id, billing_date, billing_context, decision, reviewed_at) VALUES (?, ?, ?, ?, ?, ?)'
			);
			insert.run('owner', 1, '2024-01-31', 'context', 'keep', 1);
			expect(() => insert.run('owner', 1, '2024-01-31', 'context', 'review', 2)).toThrow();
			expect(() => insert.run('owner', 1, '2024-02-29', 'context', 'cancel', 2)).toThrow();
			expect(() => insert.run('owner', 1, '2024-02-29T00:00Z', 'context', 'keep', 2)).toThrow();
			sqlite.exec('DELETE FROM tracked_subscription WHERE id = 1');
			expect(sqlite.prepare('SELECT * FROM subscription_review').all()).toEqual([]);
		} finally {
			sqlite.close();
		}
	});
});
