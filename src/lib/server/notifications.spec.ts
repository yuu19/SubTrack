import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { sendSubscriptionReminderEmail } = vi.hoisted(() => ({
	sendSubscriptionReminderEmail: vi.fn()
}));

vi.mock('$lib/server/email', () => ({
	sendSubscriptionReminderEmail,
	sendTrialEndingEmail: vi.fn()
}));
vi.mock('$lib/server/push', () => ({
	sendWebPush: vi.fn()
}));
vi.mock('$lib/server/stripe', () => ({
	createBillingPortalUrl: vi.fn()
}));

import { dispatchSubscriptionNotifications } from './notifications';

const createSubscription = () => ({
	id: 1,
	userId: 'user-1',
	status: 'active',
	serviceName: 'Test Service',
	firstPaymentDate: '2026-07-19',
	nextBillingAt: '2026-07-19',
	daysUntilNextBilling: 0,
	cycle: 'monthly',
	notifyDaysBefore: 0,
	lastNotifiedDate: null
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

const createDb = () => {
	const selectResults = [[createSubscription()], [createUser()], []];
	const updates: Record<string, unknown>[] = [];
	const db = {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: vi.fn(async () => selectResults.shift() ?? [])
			}))
		})),
		update: vi.fn(() => ({
			set: vi.fn((values: Record<string, unknown>) => ({
				where: vi.fn(async () => {
					updates.push(values);
				})
			}))
		})),
		delete: vi.fn(() => ({
			where: vi.fn(async () => undefined)
		}))
	};

	return { db, updates };
};

describe('dispatchSubscriptionNotifications', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-19T00:00:00.000Z'));
		vi.stubEnv('RESEND_API_KEY', 'test-resend-key');
		vi.stubEnv('VAPID_PUBLIC_KEY', '');
		vi.stubEnv('VAPID_PRIVATE_KEY', '');
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	it('records the local notification date after a successful delivery', async () => {
		sendSubscriptionReminderEmail.mockResolvedValue(undefined);
		const { db, updates } = createDb();

		const result = await dispatchSubscriptionNotifications(
			db as unknown as Parameters<typeof dispatchSubscriptionNotifications>[0]
		);

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

		const result = await dispatchSubscriptionNotifications(
			db as unknown as Parameters<typeof dispatchSubscriptionNotifications>[0]
		);

		expect(result.sent).toBe(0);
		expect(result.failed).toBe(1);
		expect(updates).not.toContainEqual(expect.objectContaining({ lastNotifiedDate: '2026-07-19' }));
	});
});
