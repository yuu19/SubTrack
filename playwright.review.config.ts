import { defineConfig, devices } from '@playwright/test';

// Deliberately do not load .env files or reuse a running server. This suite only
// uses a disposable SQLite file, synthetic credentials, and localhost requests.
Object.assign(process.env, {
	NODE_ENV: 'test',
	E2E_DB_PATH: '.tmp/e2e/subtrack-reviews.sqlite',
	E2E_AUTH_DISABLE_STRIPE: 'true',
	E2E_STRIPE_CREATE_CUSTOMER_ON_SIGNUP: 'false',
	E2E_BILLING_TEST_HELPERS: 'false',
	BETTER_AUTH_URL: 'http://127.0.0.1:4175',
	BETTER_AUTH_SECRET: 'isolated-review-tests-secret-0123456789abcdef',
	SECRET_STRIPE_KEY: '',
	STRIPE_WEBHOOK_SECRET: '',
	RESEND_API_KEY: '',
	SENTRY_DSN: '',
	PUBLIC_SENTRY_DSN: '',
	SENTRY_AUTH_TOKEN: '',
	SENTRY_TELEMETRY: 'false',
	SUBTRACK_LOCAL_CHECK: 'true',
	WRANGLER_SEND_METRICS: 'false'
});

export default defineConfig({
	testDir: './e2e',
	globalSetup: './e2e/reviews/global-setup.ts',
	workers: 1,
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	timeout: 60_000,
	reporter: [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL: 'http://127.0.0.1:4175',
		serviceWorkers: 'block',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	projects: [
		{
			name: 'reviews.setup',
			testMatch: /reviews\/auth\.setup\.ts/
		},
		{
			name: 'reviews-en',
			dependencies: ['reviews.setup'],
			testMatch: /reviews\/.*\.test\.ts/,
			use: {
				...devices['Desktop Chrome'],
				locale: 'en-US',
				timezoneId: 'America/Los_Angeles',
				storageState: 'e2e/.auth/review-user.json'
			}
		},
		{
			name: 'reviews-ja-mobile',
			dependencies: ['reviews.setup'],
			testMatch: /reviews\/.*\.test\.ts/,
			use: {
				...devices['Pixel 7'],
				locale: 'ja-JP',
				timezoneId: 'Asia/Tokyo',
				storageState: 'e2e/.auth/review-user.json'
			}
		}
	],
	webServer: {
		command: 'node node_modules/vite/bin/vite.js dev --host 127.0.0.1 --port 4175',
		url: 'http://127.0.0.1:4175',
		reuseExistingServer: false,
		timeout: 120_000
	}
});
