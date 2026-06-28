import { test } from '@playwright/test';
import { FaqPage } from '../pages';

test('language switcher updates page text during client navigation', async ({ page }) => {
	const faqPage = new FaqPage(page);

	await faqPage.gotoJapanese();
	await faqPage.expectJapaneseLoaded();

	await faqPage.switchToEnglish();
	await faqPage.expectEnglishLoaded();
});
