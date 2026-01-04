import Stripe from 'stripe';

const stripeSecretKey = process.env.SECRET_STRIPE_KEY;

const stripeClient = stripeSecretKey
	? new Stripe(stripeSecretKey, { apiVersion: '2025-11-17.clover' })
	: null;

export async function createBillingPortalUrl({
	customerId,
	returnUrl
}: {
	customerId: string;
	returnUrl: string;
}): Promise<string | null> {
	if (!stripeClient) {
		console.warn('[stripe] SECRET_STRIPE_KEY is not set; skipping billing portal');
		return null;
	}

	try {
		const session = await stripeClient.billingPortal.sessions.create({
			customer: customerId,
			return_url: returnUrl
		});

		return session.url ?? null;
	} catch (error) {
		console.error('[stripe] failed to create billing portal session', error);
		return null;
	}
}
