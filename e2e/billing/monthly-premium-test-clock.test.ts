import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import {
	getCurrentUserId,
	getBillingSkipReason,
	PREMIUM_LIFETIME_ENTITLEMENT_KEY,
	PREMIUM_LIFETIME_LOOKUP_KEY,
	shouldRunBillingE2E,
	signStripeWebhookPayload,
	StripeBillingTestDriver,
	type BillingTestSubscription
} from '../helpers/billing';

test.skip(!shouldRunBillingE2E(), getBillingSkipReason() ?? 'Billing E2E is disabled');
test.setTimeout(180_000);

test('monthly Premium follows the Test Clock lifecycle and lifetime checkout restores access', async ({
	page,
	request
}) => {
	const billing = new StripeBillingTestDriver(request);
	const userId = await getCurrentUserId(request);
	let target: Partial<BillingTestSubscription> = {};

	try {
		await expectCsvExportStatus(request, 403);

		target = await billing.createMonthlyPremiumTrial('e2e-user@example.com');
		const trialSync = await billing.syncSubscription(target.subscriptionId!);
		expect(trialSync.status).toBe('trialing');

		await page.goto('/me/settings#plan-info');
		await expectPlanInfo(page, /Premium/);
		await expectPlanInfo(page, /Trialing|トライアル中|有効/);
		await expectCsvExportStatus(request, 200);

		await billing.advancePastTrial(target.subscriptionId!, target.clockId!);
		const activeSync = await billing.syncSubscription(target.subscriptionId!);
		expect(activeSync.status).toBe('active');

		await page.reload();
		await expectPlanInfo(page, /Premium/);
		await expectCsvExportStatus(request, 200);

		await billing.scheduleCancelAtPeriodEnd(target.subscriptionId!);
		const pendingCancelSync = await billing.syncSubscription(target.subscriptionId!);
		expect(pendingCancelSync.cancelAtPeriodEnd).toBe(true);

		await page.reload();
		await expectPlanInfo(page, /解約予定|Pending cancellation/);
		await expectCsvExportStatus(request, 200);

		await billing.advancePastCurrentPeriod(target.subscriptionId!, target.clockId!);
		const expiredSync = await billing.syncSubscription(target.subscriptionId!);
		expect(expiredSync.status).toBe('canceled');

		await page.reload();
		await expectPlanInfo(page, /Free|無料/);
		await expectCsvExportStatus(request, 403);

		await postLifetimeCheckoutCompletedWebhook(request, userId);

		await page.reload();
		await expectPlanInfo(page, /Premium Lifetime/);
		await expectPlanInfo(page, /購入済み|Purchased/);
		await expectCsvExportStatus(request, 200);
	} finally {
		await billing.cleanup(target);
	}
});

async function expectCsvExportStatus(request: APIRequestContext, status: number) {
	const response = await request.get('/subscriptions/export');
	expect(response.status(), await response.text()).toBe(status);
}

async function expectPlanInfo(page: Page, text: RegExp) {
	const planInfo = page.locator('#plan-info');
	await expect(planInfo).toContainText(text);
}

async function postLifetimeCheckoutCompletedWebhook(request: APIRequestContext, userId: string) {
	const now = Math.floor(Date.now() / 1000);
	const sessionId = `cs_test_subtrack_lifetime_${now}`;
	const payload = JSON.stringify({
		id: `evt_subtrack_lifetime_${now}`,
		object: 'event',
		api_version: '2025-11-17.clover',
		created: now,
		data: {
			object: {
				id: sessionId,
				object: 'checkout.session',
				client_reference_id: userId,
				customer: `cus_subtrack_lifetime_${now}`,
				livemode: false,
				metadata: {
					userId,
					purchase_type: 'one_time',
					entitlement: PREMIUM_LIFETIME_ENTITLEMENT_KEY,
					lookup_key: PREMIUM_LIFETIME_LOOKUP_KEY
				},
				mode: 'payment',
				payment_intent: `pi_subtrack_lifetime_${now}`,
				payment_status: 'paid'
			}
		},
		livemode: false,
		pending_webhooks: 1,
		request: null,
		type: 'checkout.session.completed'
	});
	const response = await request.post('/api/stripe/webhook', {
		data: payload,
		headers: {
			'content-type': 'application/json',
			'stripe-signature': signStripeWebhookPayload(payload)
		}
	});

	expect(response.ok(), await response.text()).toBeTruthy();
}
