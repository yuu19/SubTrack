import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { sendSubscriptionReminderEmail, sendWebPush } = vi.hoisted(() => ({
	sendSubscriptionReminderEmail: vi.fn(),
	sendWebPush: vi.fn()
}));

vi.mock('$lib/server/email', () => ({
	sendSubscriptionReminderEmail,
	sendTrialEndingEmail: vi.fn()
}));
vi.mock('$lib/server/push', () => ({ sendWebPush }));
vi.mock('$lib/server/stripe', () => ({ createBillingPortalUrl: vi.fn() }));

import {
	pushSubscriptionTable,
	trackedSubscriptionTable,
	user as userTable
} from '$lib/server/db/schema';
import { dispatchSubscriptionNotifications } from './notifications';

const createSubscription = () => ({
	id: 1,
	userId: 'user-1' as string | null,
	status: 'active',
	serviceName: 'Test Service',
	firstPaymentDate: '2026-07-19',
	nextBillingAt: '2026-07-19',
	daysUntilNextBilling: 0,
	cycle: 'monthly',
	notifyDaysBefore: 0,
	lastNotifiedDate: null as string | null
});

const createUser = () => ({
	id: 'user-1',
	name: 'Test User',
	email: 'test@example.com',
	locale: 'ja',
	timeZone: 'UTC',
	defaultNotifyTime: '00:00',
	notificationMethod: 'email'
});

const createDb = (
	subscriptionOverrides: Partial<ReturnType<typeof createSubscription>> = {},
	userOverrides: Partial<ReturnType<typeof createUser>> = {}
) => {
	const subscription = { ...createSubscription(), ...subscriptionOverrides };
	const user = { ...createUser(), ...userOverrides };
	const updates: Record<string, unknown>[] = [];
	const db = {
		select: vi.fn(() => ({
			from: vi.fn((table: unknown) => ({
				where: vi.fn(async () => {
					if (table === trackedSubscriptionTable) return [subscription];
					if (table === userTable) return [user];
					if (table === pushSubscriptionTable) {
						return [
							{
								id: 1,
								userId: user.id,
								endpoint: 'https://push.example.test',
								p256dh: 'key',
								auth: 'auth'
							}
						];
					}
					return [];
				})
			}))
		})),
		update: vi.fn(() => ({
			set: vi.fn((values: Record<string, unknown>) => ({
				where: vi.fn(async () => {
					updates.push(values);
					Object.assign(subscription, values);
				})
			}))
		})),
		delete: vi.fn(() => ({ where: vi.fn(async () => undefined) }))
	};
	return {
		db: db as unknown as Parameters<typeof dispatchSubscriptionNotifications>[0],
		updates,
		subscription
	};
};

const tokyoUser = { timeZone: 'Asia/Tokyo', defaultNotifyTime: '23:30' };
const marchSubscription = {
	firstPaymentDate: '2026-03-20',
	nextBillingAt: '2026-03-20',
	notifyDaysBefore: 3
};

const runAt = async (db: Parameters<typeof dispatchSubscriptionNotifications>[0], date: string) => {
	vi.setSystemTime(new Date(date));
	return dispatchSubscriptionNotifications(db);
};

describe('dispatchSubscriptionNotifications', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-19T00:00:00.000Z'));
		vi.stubEnv('RESEND_API_KEY', 'test-resend-key');
		vi.stubEnv('VAPID_PUBLIC_KEY', '');
		vi.stubEnv('VAPID_PRIVATE_KEY', '');
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		sendSubscriptionReminderEmail.mockResolvedValue(undefined);
		sendWebPush.mockResolvedValue({ ok: true, status: 201 });
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	it('includes the exact 00:00 boundary and records the scheduled local date', async () => {
		const { db, updates } = createDb();
		const result = await dispatchSubscriptionNotifications(db);

		expect(result.sent).toBe(1);
		expect(result.failed).toBe(0);
		expect(updates).toContainEqual({
			lastNotifiedAt: new Date('2026-07-19T00:00:00.000Z'),
			lastNotifiedDate: '2026-07-19'
		});
	});

	it('leaves the notification date unchanged when every delivery fails', async () => {
		sendSubscriptionReminderEmail.mockRejectedValue(new Error('delivery failed'));
		const { db, updates } = createDb();
		const result = await dispatchSubscriptionNotifications(db);

		expect(result.sent).toBe(0);
		expect(result.failed).toBe(1);
		expect(updates).not.toContainEqual(expect.objectContaining({ lastNotifiedDate: '2026-07-19' }));
	});

	it('delivers a 23:30 Tokyo reminder at the first hourly run after midnight, exactly once', async () => {
		const { db, subscription } = createDb(marchSubscription, tokyoUser);
		// All 24 hourly runs on March 17 in Tokyo are before the 23:30 setting.
		for (let hour = 0; hour < 24; hour += 1) {
			vi.setSystemTime(new Date(Date.parse('2026-03-16T15:00:00Z') + hour * 3_600_000));
			expect((await dispatchSubscriptionNotifications(db)).sent).toBe(0);
		}
		expect((await runAt(db, '2026-03-17T15:00:00Z')).sent).toBe(1);
		expect(subscription.lastNotifiedDate).toBe('2026-03-17');
		expect(sendSubscriptionReminderEmail).toHaveBeenCalledWith(
			expect.objectContaining({ billingDate: '2026-03-20', notifyDays: 2 })
		);
		expect((await runAt(db, '2026-03-17T16:00:00Z')).sent).toBe(0);
		expect(sendSubscriptionReminderEmail).toHaveBeenCalledTimes(1);
	});

	it('retains the original billing occurrence for a zero-day reminder after midnight', async () => {
		const { db, subscription } = createDb({}, tokyoUser);
		expect((await runAt(db, '2026-07-19T15:00:00Z')).sent).toBe(1);
		expect(subscription.nextBillingAt).toBe('2026-08-19');
		expect(subscription.lastNotifiedDate).toBe('2026-07-19');
		expect(sendSubscriptionReminderEmail).toHaveBeenCalledWith(
			expect.objectContaining({ billingDate: '2026-07-19', notifyDays: -1 })
		);
	});

	it('retries all-failed deliveries on the next hour across midnight, then deduplicates', async () => {
		const { db, subscription } = createDb(marchSubscription, tokyoUser);
		sendSubscriptionReminderEmail.mockRejectedValueOnce(new Error('delivery failed'));
		expect((await runAt(db, '2026-03-17T14:30:00Z')).failed).toBe(1);
		expect(subscription.lastNotifiedDate).toBeNull();
		expect((await runAt(db, '2026-03-17T15:00:00Z')).sent).toBe(1);
		expect(subscription.lastNotifiedDate).toBe('2026-03-17');
		expect((await runAt(db, '2026-03-17T16:00:00Z')).sent).toBe(0);
		expect(sendSubscriptionReminderEmail).toHaveBeenCalledTimes(2);
	});

	it('does not resend a successful scheduled date when the send date changes', async () => {
		const { db } = createDb({ ...marchSubscription, lastNotifiedDate: '2026-03-17' }, tokyoUser);
		expect((await runAt(db, '2026-03-17T15:00:00Z')).due).toBe(0);
		expect(sendSubscriptionReminderEmail).not.toHaveBeenCalled();
	});

	it('expires a missed reminder at the next local scheduled time rather than replaying history', async () => {
		const { db } = createDb(marchSubscription, tokyoUser);
		expect((await runAt(db, '2026-03-18T14:29:00Z')).sent).toBe(1);
		const missed = createDb(marchSubscription, tokyoUser);
		expect((await runAt(missed.db, '2026-03-18T14:30:00Z')).due).toBe(0);
		expect((await runAt(missed.db, '2026-03-20T15:00:00Z')).due).toBe(0);
	});

	it('does not send before an arbitrary local minute and sends at the next hourly run', async () => {
		const { db } = createDb({}, { defaultNotifyTime: '09:30' });
		expect((await runAt(db, '2026-07-19T09:00:00Z')).sent).toBe(0);
		expect((await runAt(db, '2026-07-19T10:00:00Z')).sent).toBe(1);
		expect((await runAt(db, '2026-07-19T11:00:00Z')).sent).toBe(0);
	});

	it('handles a fractional UTC offset without skipping the final local hour', async () => {
		const { db, subscription } = createDb(
			{},
			{ timeZone: 'Asia/Kathmandu', defaultNotifyTime: '23:50' }
		);
		expect((await runAt(db, '2026-07-19T18:00:00Z')).sent).toBe(0);
		expect((await runAt(db, '2026-07-19T19:00:00Z')).sent).toBe(1);
		expect(subscription.lastNotifiedDate).toBe('2026-07-19');
	});

	it('sends after the spring-forward gap when the selected local time does not exist', async () => {
		const { db, subscription } = createDb(
			{ firstPaymentDate: '2026-03-08', nextBillingAt: '2026-03-08' },
			{ timeZone: 'America/New_York', defaultNotifyTime: '02:30' }
		);
		expect((await runAt(db, '2026-03-08T06:00:00Z')).sent).toBe(0);
		expect((await runAt(db, '2026-03-08T07:00:00Z')).sent).toBe(1);
		expect(subscription.lastNotifiedDate).toBe('2026-03-08');
	});

	it('does not duplicate a reminder in a repeated fall-back hour', async () => {
		const { db } = createDb(
			{ firstPaymentDate: '2026-11-01', nextBillingAt: '2026-11-01' },
			{ timeZone: 'America/New_York', defaultNotifyTime: '01:30' }
		);
		expect((await runAt(db, '2026-11-01T05:30:00Z')).sent).toBe(1);
		expect((await runAt(db, '2026-11-01T06:00:00Z')).sent).toBe(0);
		expect((await runAt(db, '2026-11-01T06:30:00Z')).sent).toBe(0);
		expect(sendSubscriptionReminderEmail).toHaveBeenCalledTimes(1);
	});

	it('uses the original month-end anchor for notification eligibility', async () => {
		const { db } = createDb({ firstPaymentDate: '2026-01-31', notifyDaysBefore: 3 });
		expect((await runAt(db, '2026-03-25T12:00:00Z')).due).toBe(0);
		expect((await runAt(db, '2026-03-28T12:00:00Z')).sent).toBe(1);
		expect(sendSubscriptionReminderEmail).toHaveBeenCalledWith(
			expect.objectContaining({ billingDate: '2026-03-31', notifyDays: 3 })
		);
	});

	it.each([
		{ firstPaymentDate: 'not-a-date' },
		{ firstPaymentDate: '2026-02-30' },
		{ cycle: 'invalid' },
		{ notifyDaysBefore: -1 },
		{ notifyDaysBefore: 0.5 },
		{ notifyDaysBefore: NaN },
		{ notifyDaysBefore: Infinity },
		{ notifyDaysBefore: 366 },
		{ status: 'canceled' },
		{ userId: null }
	])('does not dispatch malformed or inactive data: %j', async (overrides) => {
		const { db } = createDb(overrides);
		expect((await dispatchSubscriptionNotifications(db)).due).toBe(0);
		expect(sendSubscriptionReminderEmail).not.toHaveBeenCalled();
	});

	it('marks partial delivery success and uses the scheduled date in the push tag', async () => {
		vi.stubEnv('VAPID_PUBLIC_KEY', 'test-public-key');
		vi.stubEnv('VAPID_PRIVATE_KEY', 'test-private-key');
		sendSubscriptionReminderEmail.mockRejectedValue(new Error('email failed'));
		const { db, subscription } = createDb(marchSubscription, {
			...tokyoUser,
			notificationMethod: 'both'
		});
		const result = await runAt(db, '2026-03-17T15:00:00Z');
		expect(result.sent).toBe(1);
		expect(result.failed).toBe(1);
		expect(subscription.lastNotifiedDate).toBe('2026-03-17');
		expect(sendWebPush).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				tag: 'subscription-1-2026-03-17',
				body: 'Test Service：支払いまであと2日です。'
			})
		);
		expect((await runAt(db, '2026-03-17T16:00:00Z')).due).toBe(0);
	});
});
