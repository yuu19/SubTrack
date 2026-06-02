import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import Stripe from 'stripe';
import { handlePremiumLifetimeCheckoutSessionCompleted } from '$lib/server/stripe-lifetime';
import { getStripeClient, getStripeWebhookSecret } from '$lib/server/stripe';

export const POST: RequestHandler = async ({ request, locals }) => {
	const stripeClient = getStripeClient();
	const webhookSecret = getStripeWebhookSecret();

	if (!stripeClient || !webhookSecret) {
		error(500, 'stripe webhook not configured');
	}

	const signature = request.headers.get('stripe-signature');
	if (!signature) {
		error(400, 'missing stripe signature');
	}

	const payload = await request.text();
	let event: Stripe.Event;

	try {
		event = stripeClient.webhooks.constructEvent(payload, signature, webhookSecret);
	} catch (err) {
		console.error('[stripe-webhook] invalid signature', err);
		error(400, 'invalid stripe signature');
	}

	if (event.type === 'checkout.session.completed') {
		const session = event.data.object as Stripe.Checkout.Session;
		await handlePremiumLifetimeCheckoutSessionCompleted(locals.db, session);
	}

	return json({ received: true });
};
