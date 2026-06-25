import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import dayjs from 'dayjs';
import {
	defaultSubscriptionColor,
	resolveSubscriptionColor,
	type SubscriptionColor
} from '$lib/subscription-colors';
import {
	defaultSubscriptionIconType,
	defaultSubscriptionIconValue,
	resolveSubscriptionIconType,
	resolveSubscriptionIconValue,
	type SubscriptionIconType
} from '$lib/subscription-icons';
import {
	CANCELLATION_METHODS,
	type CancellationMethod,
	type TrackedSubscriptionStatus
} from '$lib/constant';
import {
	addCalendarMonths,
	diffCalendarDays,
	getLocalDateString,
	normalizeDateString
} from '$lib/time-zone';

const DB_NAME = 'dishpage-offline';
const DB_VERSION = 1;
const SUBSCRIPTIONS_STORE = 'subscriptions';
const PENDING_STORE = 'subscription_pending';

export type SubscriptionPayload = {
	serviceName: string;
	serviceTemplateId?: string | null;
	planName?: string | null;
	priceEditedByUser?: boolean;
	color: SubscriptionColor;
	iconType: SubscriptionIconType;
	iconValue: string;
	cycle: string;
	amount: number;
	firstPaymentDate: string;
	notifyDaysBefore: number;
	cancellationUrl?: string | null;
	cancellationMethod?: CancellationMethod | null;
	cancellationMemo?: string | null;
	cancellationDeadlineMemo?: string | null;
	tags: string[];
};

export type SubscriptionRecord = {
	id: number | string;
	userId?: string | null;
	serviceName: string;
	serviceTemplateId?: string | null;
	planName?: string | null;
	priceEditedByUser?: boolean;
	status?: TrackedSubscriptionStatus;
	color: SubscriptionColor;
	iconType: SubscriptionIconType;
	iconValue: string;
	cycle: string;
	amount: number;
	firstPaymentDate: string;
	nextBillingAt: string;
	daysUntilNextBilling: number;
	notifyDaysBefore: number;
	canceledAt?: Date | string | number | null;
	cancellationUrl?: string | null;
	cancellationMethod?: CancellationMethod | null;
	cancellationMemo?: string | null;
	cancellationDeadlineMemo?: string | null;
	tags: string[];
	createdAt?: Date | string | number | null;
	updatedAt?: Date | string | number | null;
	lastNotifiedAt?: Date | string | number | null;
	isSample?: boolean;
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
	subscription_pending: {
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

const normalizeOptionalText = (value: FormDataEntryValue | null) => {
	const trimmed = `${value ?? ''}`.trim();
	return trimmed.length > 0 ? trimmed : null;
};

const normalizeCancellationMethod = (value: FormDataEntryValue | null) => {
	const normalized = `${value ?? ''}`;
	return CANCELLATION_METHODS.includes(normalized as CancellationMethod)
		? (normalized as CancellationMethod)
		: null;
};

const toBoolean = (value: FormDataEntryValue | null) => {
	const normalized = `${value ?? ''}`;
	return normalized === 'true' || normalized === '1' || normalized === 'on';
};

const toTimestamp = (value: Date | string | number | null | undefined) => {
	if (!value) return 0;
	if (value instanceof Date) return value.getTime();
	const timestamp = new Date(value).getTime();
	return Number.isFinite(timestamp) ? timestamp : 0;
};

const normalizeSubscription = (subscription: SubscriptionRecord) => {
	const normalizedSubscription: SubscriptionRecord = {
		...subscription,
		status: subscription.status ?? 'active',
		iconType: resolveSubscriptionIconType(subscription.iconType, defaultSubscriptionIconType),
		iconValue: resolveSubscriptionIconValue(subscription.iconValue, defaultSubscriptionIconValue)
	};
	const today = dayjs().format('YYYY-MM-DD');
	const next = normalizeDateString(normalizedSubscription.nextBillingAt);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) return normalizedSubscription;
	const daysUntil = diffCalendarDays(next, today);
	if (
		normalizedSubscription.status !== 'canceled' &&
		Number.isFinite(daysUntil) &&
		daysUntil !== normalizedSubscription.daysUntilNextBilling
	) {
		return { ...normalizedSubscription, daysUntilNextBilling: daysUntil };
	}
	return normalizedSubscription;
};

const sortSubscriptions = (subscriptions: SubscriptionRecord[]) => {
	return [...subscriptions].sort((a, b) => {
		const aTime = toTimestamp(a.createdAt ?? a.updatedAt ?? 0);
		const bTime = toTimestamp(b.createdAt ?? b.updatedAt ?? 0);
		return bTime - aTime;
	});
};

const computeBillingInfo = (payload: SubscriptionPayload) => {
	const today = getLocalDateString(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone);
	const first = normalizeDateString(payload.firstPaymentDate);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(first)) {
		return { nextBillingAt: payload.firstPaymentDate, daysUntilNextBilling: 0 };
	}
	const monthsToAdd = cycleToMonths(payload.cycle);
	let next = first;
	while (diffCalendarDays(next, today) < 0) {
		next = addCalendarMonths(next, monthsToAdd);
	}
	return {
		nextBillingAt: next,
		daysUntilNextBilling: diffCalendarDays(next, today)
	};
};

export const payloadFromFormData = (formData: FormData): SubscriptionPayload => {
	const tags = formData
		.getAll('tagsinput')
		.map((tag) => `${tag}`.trim())
		.filter((tag) => tag.length > 0);

	return {
		serviceName: `${formData.get('text') ?? ''}`,
		serviceTemplateId: normalizeOptionalText(formData.get('serviceTemplateId')),
		planName: normalizeOptionalText(formData.get('planName')),
		priceEditedByUser: toBoolean(formData.get('priceEditedByUser')),
		color: resolveSubscriptionColor(formData.get('color'), defaultSubscriptionColor),
		iconType: resolveSubscriptionIconType(formData.get('iconType'), defaultSubscriptionIconType),
		iconValue: resolveSubscriptionIconValue(
			formData.get('iconValue'),
			defaultSubscriptionIconValue
		),
		cycle: `${formData.get('select') ?? ''}`,
		amount: toNumber(formData.get('number'), 0),
		firstPaymentDate: `${formData.get('datepicker') ?? ''}`,
		notifyDaysBefore: toNumber(formData.get('notifyDaysBefore'), 1),
		cancellationUrl: normalizeOptionalText(formData.get('cancellationUrl')),
		cancellationMethod: normalizeCancellationMethod(formData.get('cancellationMethod')),
		cancellationMemo: normalizeOptionalText(formData.get('cancellationMemo')),
		cancellationDeadlineMemo: normalizeOptionalText(formData.get('cancellationDeadlineMemo')),
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
		serviceTemplateId: payload.serviceTemplateId ?? null,
		planName: payload.planName ?? null,
		priceEditedByUser: Boolean(payload.priceEditedByUser),
		status: 'active',
		color: payload.color,
		iconType: payload.iconType,
		iconValue: payload.iconValue,
		cycle: payload.cycle,
		amount: payload.amount,
		firstPaymentDate: payload.firstPaymentDate,
		nextBillingAt,
		daysUntilNextBilling,
		notifyDaysBefore: payload.notifyDaysBefore,
		cancellationUrl: payload.cancellationUrl ?? null,
		cancellationMethod: payload.cancellationMethod ?? null,
		cancellationMemo: payload.cancellationMemo ?? null,
		cancellationDeadlineMemo: payload.cancellationDeadlineMemo ?? null,
		tags: payload.tags,
		createdAt: now,
		updatedAt: now
	};

	const tx = db.transaction([SUBSCRIPTIONS_STORE, PENDING_STORE] as const, 'readwrite');
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
	formData.set('serviceTemplateId', payload.serviceTemplateId ?? '');
	formData.set('planName', payload.planName ?? '');
	formData.set('priceEditedByUser', payload.priceEditedByUser ? 'true' : 'false');
	formData.set('color', payload.color);
	formData.set('iconType', payload.iconType);
	formData.set('iconValue', payload.iconValue);
	formData.set('select', payload.cycle);
	formData.set('number', `${payload.amount}`);
	formData.set('datepicker', payload.firstPaymentDate);
	formData.set('notifyDaysBefore', `${payload.notifyDaysBefore ?? 1}`);
	formData.set('cancellationUrl', payload.cancellationUrl ?? '');
	formData.set('cancellationMethod', payload.cancellationMethod ?? '');
	formData.set('cancellationMemo', payload.cancellationMemo ?? '');
	formData.set('cancellationDeadlineMemo', payload.cancellationDeadlineMemo ?? '');
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
