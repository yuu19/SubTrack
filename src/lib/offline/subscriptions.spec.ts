import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { stores, db } = vi.hoisted(() => {
	const stores = new Map<string, Map<string | number, Record<string, unknown>>>([
		['subscriptions', new Map()],
		['subscription_pending', new Map()]
	]);
	const objectStore = (name: string) => ({
		clear: async () => stores.get(name)!.clear(),
		put: async (value: Record<string, unknown>) => {
			stores.get(name)!.set(value.id as string | number, structuredClone(value));
		},
		add: async (value: Record<string, unknown>) => {
			const key = stores.get(name)!.size + 1;
			stores.get(name)!.set(key, structuredClone({ ...value, key }));
		}
	});
	const db = {
		getAll: async (name: string) =>
			[...stores.get(name)!.values()].map((value) => structuredClone(value)),
		delete: async (name: string, key: string | number) => stores.get(name)!.delete(key),
		transaction: (name: string | string[]) => ({
			store: objectStore(typeof name === 'string' ? name : name[0]),
			objectStore,
			done: Promise.resolve()
		})
	};
	return { stores, db };
});

vi.mock('idb', () => ({ openDB: vi.fn(async () => db) }));

import {
	addPendingSubscription,
	getCachedSubscriptions,
	replaceSubscriptionsFromServer,
	syncPendingSubscriptions,
	type SubscriptionPayload,
	type SubscriptionRecord
} from './subscriptions';

const createSubscription = (overrides: Partial<SubscriptionRecord> = {}): SubscriptionRecord => ({
	id: 1,
	serviceName: 'Test service',
	status: 'active',
	color: 'blue',
	iconType: 'preset',
	iconValue: 'box',
	cycle: 'monthly',
	amount: 1000,
	currency: 'JPY',
	firstPaymentDate: '2026-06-24',
	nextBillingAt: '2026-06-24',
	daysUntilNextBilling: 0,
	notifyDaysBefore: 3,
	tags: [],
	...overrides
});

const payload: SubscriptionPayload = {
	serviceName: 'Offline service',
	color: 'blue',
	iconType: 'preset',
	iconValue: 'box',
	cycle: 'monthly',
	amount: 1000,
	currency: 'JPY',
	firstPaymentDate: '2026-01-31',
	notifyDaysBefore: 3,
	tags: []
};

describe('offline billing date normalization', () => {
	beforeEach(() => {
		for (const store of stores.values()) store.clear();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
	});

	it('does not overwrite Tokyo account remaining days with the LA device day after server refresh', async () => {
		vi.stubEnv('TZ', 'America/Los_Angeles');
		const now = new Date('2026-06-24T00:30:00Z');
		const [tokyo] = await replaceSubscriptionsFromServer([createSubscription()], {
			timeZone: 'Asia/Tokyo',
			now
		});
		expect(tokyo).toMatchObject({ nextBillingAt: '2026-06-24', daysUntilNextBilling: 0 });
		const [losAngeles] = await getCachedSubscriptions({ timeZone: 'America/Los_Angeles', now });
		expect(losAngeles).toMatchObject({ nextBillingAt: '2026-06-24', daysUntilNextBilling: 1 });
	});

	it('rolls a stale active cache forward but leaves canceled subscriptions untouched', async () => {
		const canceled = createSubscription({ id: 2, status: 'canceled', daysUntilNextBilling: 7 });
		const subscriptions = await replaceSubscriptionsFromServer([createSubscription(), canceled], {
			timeZone: 'Asia/Tokyo',
			now: new Date('2026-06-25T00:00:00Z')
		});
		expect(subscriptions.find((item) => item.id === 1)).toMatchObject({
			nextBillingAt: '2026-07-24',
			daysUntilNextBilling: 29
		});
		expect(subscriptions.find((item) => item.id === 2)).toMatchObject(canceled);
	});

	it.each([
		['monthly', '2026-01-31', '2026-03-01', '2026-03-31', 30],
		['quarterly', '2026-01-31', '2026-05-01', '2026-07-31', 91],
		['yearly', '2024-02-29', '2028-02-01', '2028-02-29', 28]
	] as const)(
		'restores the anchored day for %s cached billing',
		async (cycle, first, today, next, days) => {
			const [subscription] = await replaceSubscriptionsFromServer(
				[createSubscription({ cycle, firstPaymentDate: first })],
				{ timeZone: 'UTC', now: new Date(`${today}T12:00:00Z`) }
			);
			expect(subscription).toMatchObject({ nextBillingAt: next, daysUntilNextBilling: days });
		}
	);

	it('counts calendar days, not elapsed hours, through a DST change', async () => {
		const [subscription] = await replaceSubscriptionsFromServer(
			[createSubscription({ firstPaymentDate: '2026-03-09' })],
			{ timeZone: 'America/Los_Angeles', now: new Date('2026-03-08T08:30:00Z') }
		);
		expect(subscription).toMatchObject({ nextBillingAt: '2026-03-09', daysUntilNextBilling: 1 });
	});

	it('uses the shared recurrence for pending offline additions and keeps account zone during sync', async () => {
		vi.stubEnv('TZ', 'America/Los_Angeles');
		const options = { timeZone: 'Asia/Tokyo', now: new Date('2026-03-31T00:30:00Z') };
		const [pending] = await addPendingSubscription(payload, options);
		expect(pending).toMatchObject({
			_pending: true,
			nextBillingAt: '2026-03-31',
			daysUntilNextBilling: 0
		});
		const fetchMock = vi.fn(async () => ({
			ok: true,
			json: async () => ({
				type: 'success',
				data: { subscriptions: [createSubscription({ ...payload, nextBillingAt: '2026-03-31' })] }
			})
		}));
		vi.stubGlobal('fetch', fetchMock);
		const result = await syncPendingSubscriptions('/subscriptions?/create', options);
		expect(result).toMatchObject({ synced: 1, failed: 0 });
		expect(result.subscriptions).toHaveLength(1);
		expect(result.subscriptions[0]).toMatchObject({
			_pending: false,
			nextBillingAt: '2026-03-31',
			daysUntilNextBilling: 0
		});
		expect(fetchMock).toHaveBeenCalledOnce();
	});
});
