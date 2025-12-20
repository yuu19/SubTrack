import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import { sentrySvelteKit } from '@sentry/sveltekit';

export default defineConfig({
	plugins: [
		sentrySvelteKit(),
		tailwindcss(),
		sveltekit(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			// Prefer persisted user choice, fall back to URL, then base locale
			strategy: ['localStorage', 'cookie', 'url', 'baseLocale'],
			// Cloudflare/edge friendly: avoid AsyncLocalStorage
			disableAsyncLocalStorage: true,
			// urlPatterns部分は不要になった場合は削除する
			// Drop explicit port in generated localized URLs to avoid Codespaces forwarding issues
			urlPatterns: [
				{
					pattern: ':protocol://:domain(.*)/:path(.*)?',
					localized: [
						['ja', ':protocol://:domain(.*)/ja/:path(.*)?'],
						['en', ':protocol://:domain(.*)/:path(.*)?']
					]
				}
			]
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
