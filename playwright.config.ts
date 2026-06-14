import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run build && XDG_CONFIG_HOME=/tmp wrangler dev --ip 127.0.0.1 --port 4173',
		port: 4173,
		timeout: 180_000
	},
	testDir: 'e2e'
});
