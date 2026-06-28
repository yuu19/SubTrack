import { expect, test as setup } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const authFile = 'e2e/.auth/user.json';
const email = 'e2e-user@example.com';
const password = 'SubTrack-e2e-password-1';

setup('authenticate e2e user', async ({ request }) => {
	const signUpResponse = await request.post('/api/auth/sign-up/email', {
		data: {
			name: 'E2E User',
			email,
			password
		}
	});

	expect(signUpResponse.ok(), await signUpResponse.text()).toBeTruthy();

	await mkdir('e2e/.auth', { recursive: true });
	await request.storageState({ path: authFile });
});
