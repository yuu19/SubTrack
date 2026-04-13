import Stripe from 'stripe';

const stripeSecretKey = process.env.SECRET_STRIPE_KEY;
const stripeWebhookSecret =
	process.env.STRIPE_LIFETIME_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET;

const stripeClient = stripeSecretKey
	? new Stripe(stripeSecretKey, { apiVersion: '2025-11-17.clover' })
	: null;

export const PREMIUM_LIFETIME_LOOKUP_KEY = 'premium_lifetime';
export const PREMIUM_LIFETIME_PRICE_AMOUNT = 6000;

const lookupKeyCache = new Map<string, string>();

export function getStripeClient() {
	return stripeClient;
}

export function getStripeWebhookSecret() {
	return stripeWebhookSecret;
}

export async function getPriceIdByLookupKey(lookupKey: string) {
	if (!stripeClient) return null;
	if (lookupKeyCache.has(lookupKey)) {
		return lookupKeyCache.get(lookupKey) ?? null;
	}

	const list = await stripeClient.prices.list({
		lookup_keys: [lookupKey],
		active: true,
		limit: 1
	});
	const priceId = list.data[0]?.id ?? null;
	if (priceId) {
		lookupKeyCache.set(lookupKey, priceId);
	}
	return priceId;
}

export async function createOneTimeCheckoutUrl({
	lookupKey,
	userId,
	customerId,
	customerEmail,
	successUrl,
	cancelUrl,
	entitlementKey
}: {
	lookupKey: string;
	userId: string;
	customerId?: string | null;
	customerEmail?: string | null;
	successUrl: string;
	cancelUrl: string;
	entitlementKey: string;
}) {
	if (!stripeClient) {
		console.warn('[stripe] SECRET_STRIPE_KEY is not set; skipping checkout');
		return null;
	}

	const priceId = await getPriceIdByLookupKey(lookupKey);
	if (!priceId) {
		console.error('[stripe] failed to resolve price by lookup key', lookupKey);
		return null;
	}

	try {
		const session = await stripeClient.checkout.sessions.create({
			mode: 'payment',
			line_items: [{ price: priceId, quantity: 1 }],
			success_url: successUrl,
			cancel_url: cancelUrl,
			client_reference_id: userId,
			customer: customerId ?? undefined,
			customer_email: customerId ? undefined : (customerEmail ?? undefined),
			metadata: {
				userId,
				purchase_type: 'one_time',
				entitlement: entitlementKey,
				lookup_key: lookupKey
			}
		});

		return session.url ?? null;
	} catch (error) {
		console.error('[stripe] failed to create checkout session', error);
		return null;
	}
}

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
