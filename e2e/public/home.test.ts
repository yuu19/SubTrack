import { test } from '@playwright/test';
import { HomePage } from '../pages';

test('home page has expected h1', async ({ page }) => {
	const homePage = new HomePage(page);

	await homePage.gotoHome();
	await homePage.expectLoaded();
});
