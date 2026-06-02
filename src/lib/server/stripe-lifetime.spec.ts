import { describe, expect, it } from 'vitest';
import type Stripe from 'stripe';
import { isPremiumLifetimeCheckoutSession } from './stripe-lifetime';
import { PREMIUM_LIFETIME_ENTITLEMENT_KEY } from './entitlements';
import { PREMIUM_LIFETIME_LOOKUP_KEY } from './stripe-products';

const checkoutSession = (
	overrides: Partial<Stripe.Checkout.Session> = {}
): Stripe.Checkout.Session =>
	({
		id: 'cs_test_lifetime',
		object: 'checkout.session',
		mode: 'payment',
		payment_status: 'paid',
		metadata: {
			userId: 'user_1',
			purchase_type: 'one_time',
			entitlement: PREMIUM_LIFETIME_ENTITLEMENT_KEY,
			lookup_key: PREMIUM_LIFETIME_LOOKUP_KEY
		},
		...overrides
	}) as Stripe.Checkout.Session;

describe('isPremiumLifetimeCheckoutSession', () => {
	it('accepts paid one-time premium lifetime checkout sessions', () => {
		expect(isPremiumLifetimeCheckoutSession(checkoutSession())).toBe(true);
	});

	it('rejects unpaid checkout sessions', () => {
		expect(isPremiumLifetimeCheckoutSession(checkoutSession({ payment_status: 'unpaid' }))).toBe(
			false
		);
	});

	it('rejects subscription checkout sessions', () => {
		expect(isPremiumLifetimeCheckoutSession(checkoutSession({ mode: 'subscription' }))).toBe(false);
	});

	it('rejects checkout sessions without a user id', () => {
		expect(
			isPremiumLifetimeCheckoutSession(
				checkoutSession({
					metadata: {
						purchase_type: 'one_time',
						entitlement: PREMIUM_LIFETIME_ENTITLEMENT_KEY,
						lookup_key: PREMIUM_LIFETIME_LOOKUP_KEY
					}
				})
			)
		).toBe(false);
	});
});
