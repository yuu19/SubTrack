import { test } from '@playwright/test';
import { SubscriptionsPage } from '../pages';

test('authenticated English user stays on English subscriptions after locale-less navigation', async ({
	page
}) => {
	const subscriptionsPage = new SubscriptionsPage(page);

	await subscriptionsPage.gotoSubscriptions();
	await subscriptionsPage.expectPath(/\/en\/subscriptions$/);
	await subscriptionsPage.expectLoaded();
});
