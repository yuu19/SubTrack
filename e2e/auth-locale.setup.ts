import { expect, test as setup } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const authFile = 'e2e/.auth/user-en.json';
const email = 'e2e-user-en@example.com';
const password = 'SubTrack-e2e-password-1';

setup('authenticate e2e user with English initial locale', async ({ page }) => {
	await page.context().addCookies([
		{
			name: 'subtrack_locale',
			value: 'en',
			url: 'http://127.0.0.1:4173'
		}
	]);
	await page.goto('/en');

	const signUpResponse = await page.evaluate(
		async ({ email, password }) => {
			const response = await fetch('/api/auth/sign-up/email', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					name: 'E2E English User',
					email,
					password
				})
			});

			return {
				ok: response.ok,
				text: await response.text()
			};
		},
		{
			email,
			password
		}
	);

	expect(signUpResponse.ok, signUpResponse.text).toBeTruthy();

	await mkdir('e2e/.auth', { recursive: true });
	await page.context().storageState({ path: authFile });
});
