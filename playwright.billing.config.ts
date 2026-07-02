import { defineConfig, devices } from '@playwright/test';
import { hasStripeTestSecret, loadE2EEnvFiles } from './e2e/helpers/env';

loadE2EEnvFiles();

const e2eDbPath = process.env.E2E_DB_PATH ?? '.tmp/e2e/subtrack-billing-e2e.sqlite';
const authFile = 'e2e/.auth/user.json';
const hasStripeTestKey = hasStripeTestSecret();
const stripePluginEnabled = hasStripeTestKey ? 'false' : 'true';

process.env.E2E_DB_PATH = e2eDbPath;
process.env.E2E_BILLING_TEST_HELPERS = 'true';
process.env.E2E_AUTH_DISABLE_STRIPE = stripePluginEnabled;
process.env.E2E_STRIPE_CREATE_CUSTOMER_ON_SIGNUP = 'false';
process.env.BETTER_AUTH_SECRET ??= 'e2e-secret-for-subtrack-playwright';
process.env.STRIPE_WEBHOOK_SECRET ??= 'whsec_subtrack_e2e';

export default defineConfig({
	testDir: './e2e',
	globalSetup: './e2e/global-setup.ts',
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list'], ['html']],
	use: {
		baseURL: 'http://127.0.0.1:4174',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure'
	},
	projects: [
		{
			name: 'auth.setup',
			testMatch: /auth\.setup\.ts/,
			use: { ...devices['Desktop Chrome'] }
		},
		{
			name: 'billing',
			dependencies: ['auth.setup'],
			testMatch: /billing\/.*\.test\.ts/,
			use: {
				...devices['Desktop Chrome'],
				storageState: authFile
			}
		}
	],
	webServer: {
		command: 'pnpm exec vite dev --host 127.0.0.1 --port 4174',
		url: 'http://127.0.0.1:4174',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
