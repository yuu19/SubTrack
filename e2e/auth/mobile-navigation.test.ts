import { expect, test } from '@playwright/test';
import { SubscriptionsPage } from '../pages';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test('mobile navigation responds while the next screen is loading', async ({ page }) => {
	const subscriptionsPage = new SubscriptionsPage(page);
	await subscriptionsPage.gotoSubscriptions();
	await subscriptionsPage.expectLoaded();
	// Wait for hydration through an actual interaction before testing client-side navigation.
	await expect(async () => {
		await page.getByRole('button', { name: /^(サブスクを追加|Add subscription)$/ }).click();
		await expect(page.getByRole('dialog')).toBeVisible({ timeout: 1_000 });
	}).toPass();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).toBeHidden();
	const navigation = page.getByRole('navigation', { name: 'Primary', exact: true });
	const subscriptions = navigation.getByRole('link', { name: /サブスク|Subscriptions/ });
	const calendar = navigation.getByRole('link', { name: /カレンダー|Calendar/ });
	await expect(calendar).toHaveAttribute('href', '/ja/calendar');
	await expect(subscriptions).toHaveAttribute('aria-current', 'page');

	let releaseResponse!: () => void;
	const responseGate = new Promise<void>((resolve) => {
		releaseResponse = resolve;
	});
	await page.route('**/calendar/__data.json*', async (route) => {
		await responseGate;
		await route.continue();
	});

	try {
		await calendar.tap();
		await expect(calendar).toHaveAttribute('aria-busy', 'true');
		await expect(calendar).toHaveClass(/bg-primary/);
		await expect(subscriptions).toHaveAttribute('aria-current', 'page');
		await expect(page).toHaveURL(/\/subscriptions\/?$/);
	} finally {
		releaseResponse();
	}

	await expect(page).toHaveURL(/\/calendar\/?$/);
	await expect(calendar).toHaveAttribute('aria-current', 'page');
	await expect(calendar).toHaveAttribute('aria-busy', 'false');
	await page.goBack();
	await expect(subscriptions).toHaveAttribute('aria-current', 'page');
	await expect(subscriptions).toHaveAttribute('aria-busy', 'false');
});
