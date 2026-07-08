import { expect, test } from '@playwright/test';
import { FaqPage } from '../pages';

test('language switcher updates page text during client navigation', async ({ page }) => {
	const faqPage = new FaqPage(page);

	await faqPage.gotoJapanese();
	await faqPage.expectJapaneseLoaded();

	await faqPage.switchToEnglish();
	await faqPage.expectEnglishLoaded();
});

test('locale-less public routes use Accept-Language as a redirect hint', async ({ page }) => {
	await page.setExtraHTTPHeaders({
		'Accept-Language': 'en-US,en;q=0.9,ja;q=0.5'
	});

	await page.goto('/faq');

	await expect(page).toHaveURL(/\/en\/faq$/);
	await expect(
		page.getByRole('heading', { level: 1, name: 'Frequently asked questions' })
	).toBeVisible();
});

test('locale cookie takes precedence over Accept-Language for public redirects', async ({
	context,
	page
}) => {
	await context.addCookies([
		{
			name: 'subtrack_locale',
			value: 'ja',
			url: 'http://127.0.0.1:4173'
		}
	]);
	await page.setExtraHTTPHeaders({
		'Accept-Language': 'en-US,en;q=0.9'
	});

	await page.goto('/faq');

	await expect(page).toHaveURL(/\/ja\/faq$/);
	await expect(page.getByRole('heading', { level: 1, name: 'よくある質問' })).toBeVisible();
});

test('unsupported two-letter locale-like prefixes return not found', async ({ page }) => {
	const response = await page.goto('/fr/faq');

	expect(response?.status()).toBe(404);
});
