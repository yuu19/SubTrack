import { defineConfig, devices } from '@playwright/test';

const e2eDbPath = process.env.E2E_DB_PATH ?? '.tmp/e2e/subtrack-e2e.sqlite';
const authFile = 'e2e/.auth/user.json';

export default defineConfig({
	testDir: './e2e',
	globalSetup: './e2e/global-setup.ts',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list'], ['html']],
	use: {
		baseURL: 'http://127.0.0.1:4173',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure'
	},
	projects: [
		{
			name: 'public',
			testMatch: /public\/.*\.test\.ts/,
			use: { ...devices['Desktop Chrome'] }
		},
		{
			name: 'auth.setup',
			testMatch: /auth\.setup\.ts/,
			use: { ...devices['Desktop Chrome'] }
		},
		{
			name: 'auth',
			dependencies: ['auth.setup'],
			testMatch: /auth\/.*\.test\.ts/,
			use: {
				...devices['Desktop Chrome'],
				storageState: authFile
			}
		}
	],
	webServer: {
		command: `E2E_DB_PATH=${e2eDbPath} E2E_AUTH_DISABLE_STRIPE=true BETTER_AUTH_SECRET=e2e-secret-for-subtrack-playwright pnpm exec vite dev --host 127.0.0.1 --port 4173`,
		url: 'http://127.0.0.1:4173',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
