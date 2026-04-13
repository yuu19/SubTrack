import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import Stripe from 'stripe';
import {
	grantStripeCheckoutEntitlement,
	PREMIUM_LIFETIME_ENTITLEMENT_KEY
} from '$lib/server/entitlements';
import {
	getStripeClient,
	getStripeWebhookSecret,
	PREMIUM_LIFETIME_LOOKUP_KEY
} from '$lib/server/stripe';

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
		const metadata = session.metadata ?? {};
		const isOneTimePurchase = metadata.purchase_type === 'one_time';
		const isPremiumLifetime =
			metadata.entitlement === PREMIUM_LIFETIME_ENTITLEMENT_KEY ||
			metadata.lookup_key === PREMIUM_LIFETIME_LOOKUP_KEY;
		const userId = metadata.userId;

		if (isOneTimePurchase && isPremiumLifetime && userId && session.payment_status === 'paid') {
			await grantStripeCheckoutEntitlement(locals.db, {
				userId,
				key: PREMIUM_LIFETIME_ENTITLEMENT_KEY,
				stripeSessionId: session.id,
				stripePaymentIntentId:
					typeof session.payment_intent === 'string' ? session.payment_intent : null,
				metadata: {
					mode: session.mode,
					lookupKey: metadata.lookup_key ?? PREMIUM_LIFETIME_LOOKUP_KEY,
					customerId: typeof session.customer === 'string' ? session.customer : null
				}
			});
		}
	}

	return json({ received: true });
};
