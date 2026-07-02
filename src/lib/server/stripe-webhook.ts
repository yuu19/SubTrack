import type Stripe from 'stripe';

export async function constructStripeWebhookEvent(
	stripeClient: Stripe,
	payload: string,
	signature: string,
	webhookSecret: string
): Promise<Stripe.Event> {
	if (typeof stripeClient.webhooks.constructEventAsync === 'function') {
		return stripeClient.webhooks.constructEventAsync(payload, signature, webhookSecret);
	}

	return stripeClient.webhooks.constructEvent(payload, signature, webhookSecret);
}
