import { expect, test } from '@playwright/test';

test('language switcher updates page text during client navigation', async ({ page }) => {
	await page.goto('/ja/faq');
	await page.waitForLoadState('networkidle');

	await expect(page.locator('h1')).toHaveText('よくある質問');

	await page.getByRole('button', { name: '言語' }).click();
	await page.getByRole('menuitemradio', { name: 'en' }).click();

	await expect(page).toHaveURL(/\/en\/faq$/);
	await expect(page.locator('h1')).toHaveText('Frequently asked questions');
	await expect(page.getByRole('button', { name: 'Language' })).toContainText('en');
});
