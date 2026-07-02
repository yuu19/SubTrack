import type Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { grantStripeCheckoutEntitlement, PREMIUM_LIFETIME_ENTITLEMENT_KEY } from './entitlements';
import * as schema from './db/schema';
import { PREMIUM_LIFETIME_LOOKUP_KEY } from './stripe-products';

type Database = DrizzleD1Database<typeof schema> | BetterSQLite3Database<typeof schema>;

export function isPremiumLifetimeCheckoutSession(session: Stripe.Checkout.Session) {
	const metadata = session.metadata ?? {};
	const isOneTimePurchase = metadata.purchase_type === 'one_time';
	const isPremiumLifetime =
		metadata.entitlement === PREMIUM_LIFETIME_ENTITLEMENT_KEY ||
		metadata.lookup_key === PREMIUM_LIFETIME_LOOKUP_KEY;

	return Boolean(
		isOneTimePurchase &&
		isPremiumLifetime &&
		metadata.userId &&
		session.mode === 'payment' &&
		session.payment_status === 'paid'
	);
}

export async function handlePremiumLifetimeCheckoutSessionCompleted(
	db: Database,
	session: Stripe.Checkout.Session
) {
	if (!isPremiumLifetimeCheckoutSession(session)) return null;

	const metadata = session.metadata ?? {};
	const userId = metadata.userId;
	if (!userId) return null;
	const customerId = typeof session.customer === 'string' ? session.customer : null;

	if (customerId) {
		await db
			.update(schema.user)
			.set({ stripeCustomerId: customerId })
			.where(eq(schema.user.id, userId));
	}

	return grantStripeCheckoutEntitlement(db, {
		userId,
		key: PREMIUM_LIFETIME_ENTITLEMENT_KEY,
		stripeSessionId: session.id,
		stripePaymentIntentId:
			typeof session.payment_intent === 'string' ? session.payment_intent : null,
		metadata: {
			mode: session.mode,
			lookupKey: metadata.lookup_key ?? PREMIUM_LIFETIME_LOOKUP_KEY,
			customerId
		}
	});
}

export async function handleStripeLifetimeCheckoutEvent(db: Database, event: Stripe.Event) {
	if (event.type !== 'checkout.session.completed') return null;

	return handlePremiumLifetimeCheckoutSessionCompleted(
		db,
		event.data.object as Stripe.Checkout.Session
	);
}
