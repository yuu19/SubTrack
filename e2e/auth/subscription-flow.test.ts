import { test } from '@playwright/test';
import { AnalysisPage, CalendarPage, SubscriptionsPage } from '../pages';

test.setTimeout(60_000);

test('authenticated user can create a subscription and see it across core views', async ({
	page
}) => {
	const serviceName = `E2E Video ${Date.now()}`;
	const firstPaymentDate = new Date().toISOString().slice(0, 10);
	const amount = 1200;
	const subscriptionsPage = new SubscriptionsPage(page);
	const calendarPage = new CalendarPage(page);
	const analysisPage = new AnalysisPage(page);

	await subscriptionsPage.gotoSubscriptions();
	await subscriptionsPage.expectLoaded();
	await subscriptionsPage.addSubscription({
		serviceName,
		amount,
		firstPaymentDate
	});
	await subscriptionsPage.expectSubscriptionVisible(serviceName);

	await calendarPage.gotoCalendar();
	await calendarPage.expectSubscriptionPaymentVisible(serviceName);

	await analysisPage.gotoAnalysis();
	await analysisPage.expectLoaded();
	await analysisPage.expectSubscriptionVisible(serviceName);
});
