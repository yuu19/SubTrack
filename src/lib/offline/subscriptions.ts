import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import dayjs from 'dayjs';

const DB_NAME = 'dishpage-offline';
const DB_VERSION = 1;
const SUBSCRIPTIONS_STORE = 'subscriptions';
const PENDING_STORE = 'subscription_pending';

export type SubscriptionPayload = {
	serviceName: string;
	cycle: string;
	amount: number;
	firstPaymentDate: string;
	notifyDaysBefore: number;
	tags: string[];
};

export type SubscriptionRecord = {
	id: number | string;
	userId?: string | null;
	serviceName: string;
	cycle: string;
	amount: number;
	firstPaymentDate: string;
	nextBillingAt: string;
	daysUntilNextBilling: number;
	notifyDaysBefore: number;
	tags: string[];
	createdAt?: Date | string | number | null;
	updatedAt?: Date | string | number | null;
	lastNotifiedAt?: Date | string | number | null;
	_pending?: boolean;
	_clientId?: string;
};

type PendingAction = {
	key?: number;
	action: 'add';
	clientId: string;
	payload: SubscriptionPayload;
	createdAt: number;
};

interface OfflineDb extends DBSchema {
	subscriptions: {
		key: number | string;
		value: SubscriptionRecord;
	};
	pending: {
		key: number;
		value: PendingAction;
	};
}

let dbPromise: Promise<IDBPDatabase<OfflineDb>> | null = null;

const getDb = () => {
	if (!dbPromise) {
		dbPromise = openDB<OfflineDb>(DB_NAME, DB_VERSION, {
			upgrade(db) {
				if (!db.objectStoreNames.contains(SUBSCRIPTIONS_STORE)) {
					db.createObjectStore(SUBSCRIPTIONS_STORE, { keyPath: 'id' });
				}
				if (!db.objectStoreNames.contains(PENDING_STORE)) {
					db.createObjectStore(PENDING_STORE, { keyPath: 'key', autoIncrement: true });
				}
			}
		});
	}

	return dbPromise;
};

const cycleToMonths = (cycle: string) => {
	if (cycle === 'yearly') return 12;
	if (cycle === 'quarterly') return 3;
	return 1;
};

const toNumber = (value: FormDataEntryValue | null, fallback = 0) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const createClientId = () => {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return `local-${crypto.randomUUID()}`;
	}
	return `local-${Math.random().toString(36).slice(2, 10)}`;
};

const toTimestamp = (value: Date | string | number | null | undefined) => {
	if (!value) return 0;
	if (value instanceof Date) return value.getTime();
	const timestamp = new Date(value).getTime();
	return Number.isFinite(timestamp) ? timestamp : 0;
};

const normalizeSubscription = (subscription: SubscriptionRecord) => {
	const today = dayjs().startOf('day');
	const next = dayjs(subscription.nextBillingAt).startOf('day');
	if (!next.isValid()) return subscription;
	const daysUntil = next.diff(today, 'day');
	if (Number.isFinite(daysUntil) && daysUntil !== subscription.daysUntilNextBilling) {
		return { ...subscription, daysUntilNextBilling: daysUntil };
	}
	return subscription;
};

const sortSubscriptions = (subscriptions: SubscriptionRecord[]) => {
	return [...subscriptions].sort((a, b) => {
		const aTime = toTimestamp(a.createdAt ?? a.updatedAt ?? 0);
		const bTime = toTimestamp(b.createdAt ?? b.updatedAt ?? 0);
		return bTime - aTime;
	});
};

const computeBillingInfo = (payload: SubscriptionPayload) => {
	const today = dayjs().startOf('day');
	const first = dayjs(payload.firstPaymentDate);
	if (!first.isValid()) {
		return { nextBillingAt: payload.firstPaymentDate, daysUntilNextBilling: 0 };
	}
	const monthsToAdd = cycleToMonths(payload.cycle);
	let next = first;
	while (next.isBefore(today, 'day')) {
		next = next.add(monthsToAdd, 'month');
	}
	return {
		nextBillingAt: next.toISOString(),
		daysUntilNextBilling: next.diff(today, 'day')
	};
};

export const payloadFromFormData = (formData: FormData): SubscriptionPayload => {
	const tags = formData
		.getAll('tagsinput')
		.map((tag) => `${tag}`.trim())
		.filter((tag) => tag.length > 0);

	return {
		serviceName: `${formData.get('text') ?? ''}`,
		cycle: `${formData.get('select') ?? ''}`,
		amount: toNumber(formData.get('number'), 0),
		firstPaymentDate: `${formData.get('datepicker') ?? ''}`,
		notifyDaysBefore: toNumber(formData.get('notifyDaysBefore'), 1),
		tags
	};
};

export const getCachedSubscriptions = async (): Promise<SubscriptionRecord[]> => {
	const db = await getDb();
	const stored = await db.getAll(SUBSCRIPTIONS_STORE);
	const normalized = stored.map(normalizeSubscription);
	const updated = normalized.filter((item, index) => item !== stored[index]);
	if (updated.length > 0) {
		const tx = db.transaction(SUBSCRIPTIONS_STORE, 'readwrite');
		for (const item of normalized) {
			await tx.store.put(item);
		}
		await tx.done;
	}
	return sortSubscriptions(normalized);
};

export const replaceSubscriptionsFromServer = async (
	subscriptions: SubscriptionRecord[]
): Promise<SubscriptionRecord[]> => {
	const db = await getDb();
	const existing = await db.getAll(SUBSCRIPTIONS_STORE);
	const pendingSubs = existing.filter((item) => item._pending);

	const tx = db.transaction(SUBSCRIPTIONS_STORE, 'readwrite');
	await tx.store.clear();
	for (const item of subscriptions) {
		await tx.store.put({ ...item, _pending: false, _clientId: undefined });
	}
	for (const pending of pendingSubs) {
		await tx.store.put(pending);
	}
	await tx.done;
	return getCachedSubscriptions();
};

export const addPendingSubscription = async (
	payload: SubscriptionPayload
): Promise<SubscriptionRecord[]> => {
	const db = await getDb();
	const clientId = createClientId();
	const { nextBillingAt, daysUntilNextBilling } = computeBillingInfo(payload);
	const now = new Date();
	const record: SubscriptionRecord = {
		id: clientId,
		_clientId: clientId,
		_pending: true,
		serviceName: payload.serviceName,
		cycle: payload.cycle,
		amount: payload.amount,
		firstPaymentDate: payload.firstPaymentDate,
		nextBillingAt,
		daysUntilNextBilling,
		notifyDaysBefore: payload.notifyDaysBefore,
		tags: payload.tags,
		createdAt: now,
		updatedAt: now
	};

	const tx = db.transaction([SUBSCRIPTIONS_STORE, PENDING_STORE], 'readwrite');
	await tx.objectStore(SUBSCRIPTIONS_STORE).put(record);
	await tx.objectStore(PENDING_STORE).add({
		action: 'add',
		clientId,
		payload,
		createdAt: Date.now()
	});
	await tx.done;
	return getCachedSubscriptions();
};

export type SyncResult = {
	subscriptions: SubscriptionRecord[];
	synced: number;
	failed: number;
};

const buildFormData = (payload: SubscriptionPayload) => {
	const formData = new FormData();
	formData.set('text', payload.serviceName);
	formData.set('select', payload.cycle);
	formData.set('number', `${payload.amount}`);
	formData.set('datepicker', payload.firstPaymentDate);
	formData.set('notifyDaysBefore', `${payload.notifyDaysBefore ?? 1}`);
	for (const tag of payload.tags) {
		formData.append('tagsinput', tag);
	}
	return formData;
};

export const syncPendingSubscriptions = async (endpoint: string): Promise<SyncResult> => {
	const db = await getDb();
	const pending = await db.getAll(PENDING_STORE);
	let synced = 0;
	let failed = 0;

	for (const item of pending) {
		if (item.action !== 'add') continue;
		const formData = buildFormData(item.payload);

		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				body: formData,
				headers: {
					accept: 'application/json'
				},
				credentials: 'same-origin'
			});

			if (!response.ok) {
				failed += 1;
				break;
			}

			const result = (await response.json()) as {
				type: string;
				data?: { subscriptions?: SubscriptionRecord[] };
			};

			if (result.type !== 'success') {
				failed += 1;
				break;
			}

			await db.delete(PENDING_STORE, item.key as number);
			await db.delete(SUBSCRIPTIONS_STORE, item.clientId);

			if (result.data?.subscriptions && Array.isArray(result.data.subscriptions)) {
				await replaceSubscriptionsFromServer(result.data.subscriptions);
			}
			synced += 1;
		} catch (error) {
			console.error('Failed to sync subscription queue', error);
			failed += 1;
			break;
		}
	}

	const subscriptions = await getCachedSubscriptions();
	return { subscriptions, synced, failed };
};
