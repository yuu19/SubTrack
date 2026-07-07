import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { createAuth } from '$lib/auth';
import { DEFAULT_LOCALE, type AppLocale } from '$lib/constant';
import { isAppLocale } from '$lib/locale-routing';
import {
	listActiveEntitlementsForUser,
	PREMIUM_LIFETIME_ENTITLEMENT_KEY
} from '$lib/server/entitlements';
import { createOneTimeCheckoutUrl, PREMIUM_LIFETIME_LOOKUP_KEY } from '$lib/server/stripe';
import {
	PREMIUM_LIFETIME_PRICE_CURRENCY,
	PREMIUM_LIFETIME_USD_PRICE_CURRENCY
} from '$lib/server/stripe-products';

const resolveStripeLocale = (locale: AppLocale) => (locale === 'en' ? 'en' : 'ja');
const resolveLifetimeCheckoutCurrency = (locale: AppLocale) =>
	locale === 'en' ? PREMIUM_LIFETIME_USD_PRICE_CURRENCY : PREMIUM_LIFETIME_PRICE_CURRENCY;

export const POST: RequestHandler = async ({ request, locals, url }) => {
	const db = locals.db;
	const auth = createAuth(db, { requestOrigin: url.origin });
	const session = await auth.api.getSession({ headers: request.headers });
	const userId = session?.user.id;

	if (!userId) {
		error(401, 'unauthorized');
	}

	const existingEntitlements = await listActiveEntitlementsForUser(db, userId);
	const hasLifetime = existingEntitlements.some(
		(entitlement) => entitlement.key === PREMIUM_LIFETIME_ENTITLEMENT_KEY
	);

	if (hasLifetime) {
		return json({ url: null, alreadyPurchased: true });
	}

	const body = (await request.json().catch(() => ({}))) as {
		returnPath?: string;
		locale?: string;
	};
	const returnPath =
		typeof body.returnPath === 'string' && body.returnPath.startsWith('/')
			? body.returnPath
			: '/me/settings';
	const successUrl = new URL(returnPath, url.origin);
	successUrl.searchParams.set('checkout', 'success');
	const cancelUrl = new URL(returnPath, url.origin);
	cancelUrl.searchParams.set('checkout', 'cancel');
	const userRecord = await db.query.user.findFirst({
		columns: { locale: true, stripeCustomerId: true },
		where: (user, { eq }) => eq(user.id, userId)
	});
	const checkoutLocale = isAppLocale(body.locale)
		? body.locale
		: isAppLocale(userRecord?.locale)
			? userRecord.locale
			: DEFAULT_LOCALE;

	const checkoutUrl = await createOneTimeCheckoutUrl({
		lookupKey: PREMIUM_LIFETIME_LOOKUP_KEY,
		userId,
		customerId: userRecord?.stripeCustomerId ?? null,
		customerEmail: session.user.email,
		successUrl: successUrl.toString(),
		cancelUrl: cancelUrl.toString(),
		entitlementKey: PREMIUM_LIFETIME_ENTITLEMENT_KEY,
		locale: resolveStripeLocale(checkoutLocale),
		currency: resolveLifetimeCheckoutCurrency(checkoutLocale)
	});

	if (!checkoutUrl) {
		error(500, 'failed to create checkout session');
	}

	return json({ url: checkoutUrl, alreadyPurchased: false });
};
