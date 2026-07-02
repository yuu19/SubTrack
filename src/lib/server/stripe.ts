import Stripe from 'stripe';
import {
	PREMIUM_LIFETIME_LOOKUP_KEY,
	PREMIUM_LIFETIME_PRICE_AMOUNT,
	PREMIUM_LIFETIME_PRICE_CURRENCY
} from './stripe-products';

export { PREMIUM_LIFETIME_LOOKUP_KEY, PREMIUM_LIFETIME_PRICE_AMOUNT } from './stripe-products';

const stripeSecretKey = process.env.SECRET_STRIPE_KEY;
const stripeWebhookSecret =
	process.env.STRIPE_LIFETIME_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET;

const stripeClient = stripeSecretKey
	? new Stripe(stripeSecretKey, { apiVersion: '2025-11-17.clover' })
	: null;

const lookupKeyCache = new Map<string, Stripe.Price>();

type ExpectedStripePrice = {
	unitAmount?: number;
	currency?: string;
	recurring?: boolean;
};

type OneTimeCheckoutSessionParams = {
	priceId: string;
	userId: string;
	customerId?: string | null;
	customerEmail?: string | null;
	successUrl: string;
	cancelUrl: string;
	entitlementKey: string;
	lookupKey: string;
};

export function getStripeClient() {
	return stripeClient;
}

export function getStripeWebhookSecret() {
	return stripeWebhookSecret;
}

export function getStripePriceMismatch(price: Stripe.Price, expected: ExpectedStripePrice) {
	const mismatches: string[] = [];
	if (expected.unitAmount !== undefined && price.unit_amount !== expected.unitAmount) {
		mismatches.push(`unit_amount=${price.unit_amount ?? 'null'}`);
	}
	if (expected.currency !== undefined && price.currency !== expected.currency.toLowerCase()) {
		mismatches.push(`currency=${price.currency}`);
	}
	if (expected.recurring !== undefined && Boolean(price.recurring) !== expected.recurring) {
		mismatches.push(`recurring=${price.recurring ? price.recurring.interval : 'none'}`);
	}

	return mismatches;
}

export async function getPriceByLookupKey(lookupKey: string) {
	if (!stripeClient) return null;
	if (lookupKeyCache.has(lookupKey)) {
		return lookupKeyCache.get(lookupKey) ?? null;
	}

	const list = await stripeClient.prices.list({
		lookup_keys: [lookupKey],
		active: true,
		limit: 1
	});
	const price = list.data[0] ?? null;
	if (price) {
		lookupKeyCache.set(lookupKey, price);
	}
	return price;
}

export async function getPriceIdByLookupKey(lookupKey: string, expected?: ExpectedStripePrice) {
	const price = await getPriceByLookupKey(lookupKey);
	if (!price) return null;

	if (expected) {
		const mismatches = getStripePriceMismatch(price, expected);
		if (mismatches.length > 0) {
			console.error('[stripe] price lookup key resolved to an unexpected price', {
				lookupKey,
				priceId: price.id,
				mismatches
			});
			return null;
		}
	}

	return price.id;
}

export function isRecoverableCheckoutCustomerError(error: unknown, customerId?: string | null) {
	if (!customerId) return false;

	const stripeError = error as {
		type?: string;
		code?: string;
		param?: string;
		message?: string;
	};

	if (stripeError.type !== 'StripeInvalidRequestError') return false;
	if (stripeError.param === 'customer') return true;

	const message = stripeError.message ?? '';
	return (
		stripeError.code === 'resource_missing' &&
		(message.includes(customerId) || message.toLowerCase().includes('customer'))
	);
}

function buildOneTimeCheckoutSessionParams({
	priceId,
	userId,
	customerId,
	customerEmail,
	successUrl,
	cancelUrl,
	entitlementKey,
	lookupKey
}: OneTimeCheckoutSessionParams): Stripe.Checkout.SessionCreateParams {
	return {
		mode: 'payment',
		line_items: [{ price: priceId, quantity: 1 }],
		success_url: successUrl,
		cancel_url: cancelUrl,
		client_reference_id: userId,
		customer: customerId ?? undefined,
		customer_email: customerId ? undefined : (customerEmail ?? undefined),
		customer_creation: customerId ? undefined : 'always',
		metadata: {
			userId,
			purchase_type: 'one_time',
			entitlement: entitlementKey,
			lookup_key: lookupKey
		}
	};
}

export async function createOneTimeCheckoutSession(
	stripeClient: Stripe,
	params: OneTimeCheckoutSessionParams
) {
	try {
		return await stripeClient.checkout.sessions.create(buildOneTimeCheckoutSessionParams(params));
	} catch (error) {
		if (!isRecoverableCheckoutCustomerError(error, params.customerId)) {
			throw error;
		}

		console.warn('[stripe] checkout customer is unavailable; retrying without customer', {
			customerId: params.customerId
		});

		return stripeClient.checkout.sessions.create(
			buildOneTimeCheckoutSessionParams({
				...params,
				customerId: null
			})
		);
	}
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

	const priceId = await getPriceIdByLookupKey(lookupKey, {
		unitAmount: PREMIUM_LIFETIME_PRICE_AMOUNT,
		currency: PREMIUM_LIFETIME_PRICE_CURRENCY,
		recurring: false
	});
	if (!priceId) {
		console.error('[stripe] failed to resolve price by lookup key', lookupKey);
		return null;
	}

	try {
		const session = await createOneTimeCheckoutSession(stripeClient, {
			priceId,
			userId,
			customerId,
			customerEmail,
			successUrl,
			cancelUrl,
			entitlementKey,
			lookupKey
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
