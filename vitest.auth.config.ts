import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Auth/billing integration tests do not need browser, Sentry, or Cloudflare plugins.
// Keep this entry point free of telemetry and external service initialization.
export default defineConfig({
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
			'$app/server': fileURLToPath(new URL('./tests/fixtures/request-event.ts', import.meta.url))
		}
	},
	test: {
		environment: 'node',
		expect: { requireAssertions: true },
		include: ['src/lib/server/auth-*.spec.ts', 'src/lib/server/stripe*.spec.ts']
	}
});
