import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getReviewState } from '$lib/subscription-reviews';
import { subscriptionReviewTable, trackedSubscriptionTable, user } from './db/schema';
import { createTestDb } from './test-db';
import { actions, load } from '../../routes/(storeFront)/subscriptions/+page.server';

const session = vi.hoisted(() => ({ userId: 'review-owner' as string | null }));
vi.mock('$lib/auth', () => ({
	createAuth: () => ({
		api: { getSession: async () => (session.userId ? { user: { id: session.userId } } : null) }
	})
}));
let fixture: Awaited<ReturnType<typeof createTestDb>>;
const now = new Date('2024-01-24T12:00:00Z');

beforeEach(async () => {
	fixture = await createTestDb();
	session.userId = 'review-owner';
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(now);
	for (const id of ['review-owner', 'other-owner'])
		fixture.db
			.insert(user)
			.values({ id, name: id, email: `${id}@example.test`, timeZone: 'UTC' })
			.run();
	fixture.db
		.insert(trackedSubscriptionTable)
		.values({
			id: 1,
			userId: 'review-owner',
			serviceName: 'Service',
			firstPaymentDate: '2024-01-31',
			cycle: 'monthly',
			amount: 500,
			currency: 'JPY',
			nextBillingAt: '2024-01-31',
			daysUntilNextBilling: 7,
			tags: []
		})
		.run();
});
afterEach(() => {
	fixture?.sqlite.close();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

const current = () =>
	fixture.db
		.select()
		.from(trackedSubscriptionTable)
		.where(eq(trackedSubscriptionTable.id, 1))
		.get()!;
function event(values: Record<string, string> = {}) {
	const data = new FormData();
	for (const [key, value] of Object.entries(values)) data.set(key, value);
	return {
		request: new Request('https://example.test/subscriptions?/review', {
			method: 'POST',
			body: data
		}),
		locals: { db: fixture.db },
		cookies: { get: () => 'en' }
	} as unknown as Parameters<NonNullable<typeof actions.review>>[0];
}
function reviewValues() {
	const state = getReviewState(current(), null, { now, timeZone: 'UTC' })!;
	return {
		id: '1',
		billingDate: state.billingDate,
		context: state.context,
		reviewedAt: '',
		decision: 'keep'
	};
}
const updateValues = (overrides: Record<string, string> = {}) => ({
	id: '1',
	select: 'monthly',
	number: '500',
	currency: 'JPY',
	datepicker: '2024-01-31',
	text: 'Service',
	iconType: 'emoji',
	iconValue: '💳',
	...overrides
});

describe('subscription review actions', () => {
	it('requires authentication and rejects spoofed ownership without leaking a record', async () => {
		session.userId = null;
		expect(await actions.review!(event(reviewValues()))).toMatchObject({
			status: 401,
			data: { reviewError: 'unauthorized' }
		});
		session.userId = 'other-owner';
		expect(
			await actions.review!(event({ ...reviewValues(), userId: 'review-owner' }))
		).toMatchObject({ status: 404, data: { reviewError: 'not_found' } });
		expect(fixture.db.select().from(subscriptionReviewTable).all()).toEqual([]);
	});

	it('validates the action body and returns a safe retryable service error', async () => {
		expect(
			await actions.review!(event({ ...reviewValues(), billingDate: '2024-02-30' }))
		).toMatchObject({ status: 400, data: { reviewError: 'invalid' } });
		const malformed = event();
		malformed.request = new Request('https://example.test/subscriptions?/review', {
			method: 'POST',
			body: 'not form data'
		});
		expect(await actions.review!(malformed)).toMatchObject({
			status: 400,
			data: { reviewError: 'invalid' }
		});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(fixture.db, 'all').mockImplementationOnce(() => {
			throw new Error('isolated DB failure');
		});
		expect(await actions.review!(event(reviewValues()))).toMatchObject({
			status: 503,
			data: { reviewError: 'unavailable' }
		});
		expect(await actions.review!(event(reviewValues()))).toMatchObject({
			subscriptionId: 1,
			reviewState: { decision: 'keep' }
		});
	});

	it('increments terms revision only for material billing changes, including reverted values', async () => {
		const stale = reviewValues();
		await actions.review!(event(stale));
		expect(await actions.update!(event(updateValues({ text: 'Renamed' })))).toHaveProperty(
			'subscriptions'
		);
		expect(current().reviewRevision).toBe(0);
		expect(await actions.update!(event(updateValues({ number: '600' })))).toHaveProperty(
			'subscriptions'
		);
		expect(current().reviewRevision).toBe(1);
		await actions.update!(event(updateValues({ number: '600' })));
		expect(current().reviewRevision).toBe(1);
		await actions.update!(event(updateValues()));
		expect(current().reviewRevision).toBe(2);
		expect(await actions.review!(event(stale))).toMatchObject({
			status: 409,
			data: { reviewError: 'stale' }
		});
	});

	it('advances revision once per real cancel/reactivate transition and rejects old decisions', async () => {
		const stale = reviewValues();
		await actions.review!(event(stale));
		await actions.cancel!(event({ id: '1' }));
		expect(current()).toMatchObject({ status: 'canceled', reviewRevision: 1 });
		await actions.cancel!(event({ id: '1' }));
		expect(current().reviewRevision).toBe(1);
		expect(await actions.review!(event(stale))).toMatchObject({ status: 409 });
		await actions.reactivate!(event({ id: '1' }));
		expect(current()).toMatchObject({ status: 'active', reviewRevision: 2 });
		await actions.reactivate!(event({ id: '1' }));
		expect(current().reviewRevision).toBe(2);
		expect(await actions.review!(event(stale))).toMatchObject({ status: 409 });
	});

	it('returns owned review states and leaves the revision stable during daily date refresh', async () => {
		await actions.review!(event(reviewValues()));
		fixture.db
			.update(trackedSubscriptionTable)
			.set({ daysUntilNextBilling: 99 })
			.where(eq(trackedSubscriptionTable.id, 1))
			.run();
		const result = await load({
			...event(),
			request: new Request('https://example.test/subscriptions')
		} as unknown as Parameters<typeof load>[0]);
		expect(result).toMatchObject({
			reviewStates: { 1: { billingDate: '2024-01-31', decision: 'keep' } }
		});
		expect(current()).toMatchObject({ daysUntilNextBilling: 7, reviewRevision: 0 });
		session.userId = 'other-owner';
		expect(
			await load({
				...event(),
				request: new Request('https://example.test/subscriptions')
			} as unknown as Parameters<typeof load>[0])
		).toMatchObject({ reviewStates: {} });
	});
});
