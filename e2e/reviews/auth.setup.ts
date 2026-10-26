import { expect, test as setup } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

setup('authenticate isolated review-test user without external services', async ({ request }) => {
	const response = await request.post('/api/auth/sign-up/email', {
		data: {
			name: 'Review Test User',
			email: 'review-test@example.test',
			password: 'SubTrack-review-e2e-password-1'
		}
	});
	expect(response.ok(), await response.text()).toBeTruthy();
	await mkdir('e2e/.auth', { recursive: true });
	await request.storageState({ path: 'e2e/.auth/review-user.json' });
});
