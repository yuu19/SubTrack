import { test as base } from '@playwright/test';
import Database from 'better-sqlite3';

export { expect } from '@playwright/test';

type SeedOptions = {
	name: string;
	days?: number;
	status?: 'active' | 'canceled';
};
type ReviewFixtures = {
	db: Database.Database;
	appLocale: 'ja' | 'en';
	seedSubscription: (options: SeedOptions) => number;
};

function calendarDate(timeZone: string, offset: number) {
	const today = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(new Date());
	const date = new Date(`${today}T12:00:00Z`);
	date.setUTCDate(date.getUTCDate() + offset);
	return date.toISOString().slice(0, 10);
}

export const test = base.extend<ReviewFixtures>({
	appLocale: async ({}, use, testInfo) => {
		await use(testInfo.project.name.includes('-ja-') ? 'ja' : 'en');
	},
	db: async ({ appLocale }, use, testInfo) => {
		if (process.env.E2E_DB_PATH !== '.tmp/e2e/subtrack-reviews.sqlite') {
			throw new Error('Refusing to open a non-isolated review-test database');
		}
		const db = new Database(process.env.E2E_DB_PATH);
		db.pragma('foreign_keys = ON');
		const { id } = db
			.prepare('SELECT id FROM user WHERE email = ?')
			.get('review-test@example.test') as {
			id: string;
		};
		db.prepare('DELETE FROM tracked_subscription WHERE user_id = ?').run(id);
		db.prepare(
			'UPDATE user SET locale = ?, time_zone = ?, onboarding_completed = 1, subscription_management_items_seeded = 1 WHERE id = ?'
		).run(appLocale, testInfo.project.use.timezoneId, id);
		await use(db);
		db.prepare('DELETE FROM tracked_subscription WHERE user_id = ?').run(id);
		db.close();
	},
	seedSubscription: async ({ db }, use, testInfo) => {
		const { id: userId } = db
			.prepare('SELECT id FROM user WHERE email = ?')
			.get('review-test@example.test') as {
			id: string;
		};
		await use(({ name, days = 0, status = 'active' }) => {
			const date = calendarDate(testInfo.project.use.timezoneId ?? 'UTC', days);
			const result = db
				.prepare(
					`INSERT INTO tracked_subscription
				(user_id, service_name, status, cycle, amount, currency, first_payment_date,
				next_billing_at, days_until_next_billing, tags, cancellation_url, cancellation_memo)
				VALUES (?, ?, ?, 'monthly', 1200, 'JPY', ?, ?, ?, '[]', ?, ?)`
				)
				.run(
					userId,
					name,
					status,
					date,
					date,
					days,
					'https://example.test/cancel',
					'Cancel on the provider website.'
				);
			return Number(result.lastInsertRowid);
		});
	},
	page: async ({ page }, use) => {
		// A test can inspect the saved cancellation URL, but must never open it or
		// send browser telemetry, analytics, payments, email, or notification traffic.
		await page.route('**/*', (route) => {
			const url = new URL(route.request().url());
			return url.hostname === '127.0.0.1' || url.hostname === 'localhost'
				? route.continue()
				: route.abort('blockedbyclient');
		});
		await use(page);
	}
});
