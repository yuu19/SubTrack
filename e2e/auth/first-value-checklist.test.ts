import { expect, test } from '@playwright/test';
import { FirstValueChecklistPage } from '../pages/FirstValueChecklistPage';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
test.setTimeout(90_000);

test.beforeEach(async ({ page }) => {
	// Each case owns its account, so other parallel subscription tests cannot change its count.
	await page.context().clearCookies();
	const signup = await page.request.post('/api/auth/sign-up/email', {
		data: {
			name: 'Checklist test',
			email: `checklist-${crypto.randomUUID()}@example.com`,
			password: 'SubTrack-e2e-password-1'
		}
	});
	expect(signup.ok()).toBeTruthy();
});

test('mobile guide follows saved data and resumes after reload', async ({ page }, testInfo) => {
	const checklist = new FirstValueChecklistPage(page);
	await checklist.gotoSubscriptions();
	await checklist.expectProgress(0);
	await checklist.hideAndResume();
	await checklist.addSubscription(
		{
			serviceName: 'Checklist Video',
			amount: 1200,
			firstPaymentDate: '2026-01-31'
		},
		checklist.guide().getByRole('button', { name: '1件目を登録', exact: true })
	);
	await checklist.expectProgress(1);
	await checklist.guide().getByRole('button', { name: '請求日を確認した', exact: true }).click();
	await checklist.expectProgress(2);
	await page.reload();
	await checklist.expectProgress(2);
	await expect(checklist.guide().getByRole('link', { name: '通知設定を開く' })).toHaveAttribute(
		'href',
		'/ja/me/settings#notification-settings'
	);
	await checklist.guide().getByRole('button', { name: '通知方法を確認した', exact: true }).click();
	await checklist.expectProgress(3);
	await expect(
		checklist.guide().getByText('ここでの確認は、通知の受信確認ではありません。', { exact: true })
	).toBeVisible();
	await expect
		.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
		.toBe(true);
	await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
	await page.screenshot({ path: testInfo.outputPath('first-value-mobile.png'), fullPage: true });
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.emulateMedia({ colorScheme: 'dark' });
	await expect(page.locator('html')).toHaveClass(/dark/);
	await expect
		.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
		.toBe(true);
	await page.screenshot({
		path: testInfo.outputPath('first-value-desktop-dark.png'),
		fullPage: true
	});
});

test('English guide remains optional when browser storage is unavailable', async ({ page }) => {
	await page.addInitScript(() => {
		const getItem = Storage.prototype.getItem;
		const setItem = Storage.prototype.setItem;
		Storage.prototype.getItem = function (key) {
			if (key.startsWith('subtrack:first-value:'))
				throw new DOMException('Storage unavailable', 'SecurityError');
			return getItem.call(this, key);
		};
		Storage.prototype.setItem = function (key, value) {
			if (key.startsWith('subtrack:first-value:'))
				throw new DOMException('Storage unavailable', 'SecurityError');
			return setItem.call(this, key, value);
		};
	});
	await page.goto('/en/subscriptions');
	const checklist = new FirstValueChecklistPage(page);
	await checklist.expectProgress(0);
	await expect(
		checklist
			.guide()
			.getByText('Progress cannot be saved in this browser. You can still continue on this page.', {
				exact: true
			})
	).toBeVisible();
	await checklist.guide().getByRole('button', { name: 'Continue later', exact: true }).click();
	await expect(checklist.guide().getByRole('list')).toBeHidden();
	await page.getByRole('button', { name: 'Add subscription', exact: true }).click();
	await expect(page.getByRole('dialog')).toBeVisible();
});
