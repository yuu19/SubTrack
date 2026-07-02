import { expect, test } from '@playwright/test';
import Stripe from 'stripe';
import { getBillingSkipReason, shouldRunBillingE2E } from '../helpers/billing';

test.skip(!shouldRunBillingE2E(), getBillingSkipReason() ?? 'Billing E2E is disabled');

const webhookSecret = () => process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_subtrack_e2e';

test('Better Auth Stripe webhook accepts signed payloads and rejects invalid signatures', async ({
	request
}) => {
	const payload = JSON.stringify({
		id: `evt_subtrack_e2e_${Date.now()}`,
		object: 'event',
		api_version: '2025-11-17.clover',
		created: Math.floor(Date.now() / 1000),
		data: {
			object: {
				id: `in_subtrack_e2e_${Date.now()}`,
				object: 'invoice'
			}
		},
		livemode: false,
		pending_webhooks: 1,
		request: null,
		type: 'invoice.created'
	});
	const signature = Stripe.webhooks.generateTestHeaderString({
		payload,
		secret: webhookSecret()
	});

	const accepted = await request.post('/api/auth/stripe/webhook', {
		data: payload,
		headers: {
			'content-type': 'application/json',
			'stripe-signature': signature
		}
	});
	expect(accepted.ok(), await accepted.text()).toBeTruthy();

	const rejected = await request.post('/api/auth/stripe/webhook', {
		data: payload,
		headers: {
			'content-type': 'application/json',
			'stripe-signature': 't=1,v1=invalid'
		}
	});
	expect(rejected.status()).toBe(400);
});
