import { describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import {
	createOneTimeCheckoutSession,
	getStripePriceMismatch,
	isRecoverableCheckoutCustomerError
} from './stripe';

const price = (overrides: Partial<Stripe.Price> = {}): Stripe.Price =>
	({
		id: 'price_lifetime',
		object: 'price',
		active: true,
		currency: 'jpy',
		unit_amount: 3000,
		recurring: null,
		currency_options: {
			usd: {
				unit_amount: 1900
			}
		},
		...overrides
	}) as Stripe.Price;

describe('getStripePriceMismatch', () => {
	it('accepts a matching one-time fixed price', () => {
		expect(
			getStripePriceMismatch(price(), {
				unitAmount: 3000,
				currency: 'jpy',
				recurring: false
			})
		).toEqual([]);
	});

	it('accepts a matching multi-currency option', () => {
		expect(
			getStripePriceMismatch(price(), {
				unitAmount: 3000,
				currency: 'jpy',
				recurring: false,
				currencyOptions: {
					usd: { unitAmount: 1900 }
				}
			})
		).toEqual([]);
	});

	it('reports amount, currency, and recurring mismatches', () => {
		expect(
			getStripePriceMismatch(
				price({
					currency: 'usd',
					unit_amount: 5000,
					recurring: { interval: 'month' } as Stripe.Price.Recurring
				}),
				{
					unitAmount: 3000,
					currency: 'jpy',
					recurring: false
				}
			)
		).toEqual(['unit_amount=5000', 'currency=usd', 'recurring=month']);
	});

	it('reports missing or mismatched multi-currency options', () => {
		expect(
			getStripePriceMismatch(price({ currency_options: {} }), {
				currencyOptions: {
					usd: { unitAmount: 1900 }
				}
			})
		).toEqual(['currency_options.usd=missing']);
		expect(
			getStripePriceMismatch(
				price({
					currency_options: {
						usd: { unit_amount: 2000 } as Stripe.Price.CurrencyOptions
					}
				}),
				{
					currencyOptions: {
						usd: { unitAmount: 1900 }
					}
				}
			)
		).toEqual(['currency_options.usd.unit_amount=2000']);
	});
});

describe('isRecoverableCheckoutCustomerError', () => {
	it('accepts missing customer errors for a provided customer id', () => {
		expect(
			isRecoverableCheckoutCustomerError(
				{
					type: 'StripeInvalidRequestError',
					code: 'resource_missing',
					message: 'No such customer: cus_deleted'
				},
				'cus_deleted'
			)
		).toBe(true);
	});

	it('rejects non-customer checkout errors', () => {
		expect(
			isRecoverableCheckoutCustomerError(
				{
					type: 'StripeInvalidRequestError',
					code: 'parameter_invalid_integer',
					param: 'line_items',
					message: 'Invalid quantity'
				},
				'cus_valid'
			)
		).toBe(false);
	});
});

describe('createOneTimeCheckoutSession', () => {
	it('retries without a stale customer and keeps the email for customer creation', async () => {
		const session = { id: 'cs_test', url: 'https://checkout.stripe.com/test' };
		const create = vi
			.fn()
			.mockRejectedValueOnce({
				type: 'StripeInvalidRequestError',
				code: 'resource_missing',
				param: 'customer',
				message: 'No such customer: cus_deleted'
			})
			.mockResolvedValueOnce(session);
		const stripeClient = {
			checkout: {
				sessions: {
					create
				}
			}
		} as unknown as Stripe;

		await expect(
			createOneTimeCheckoutSession(stripeClient, {
				priceId: 'price_lifetime',
				userId: 'user_1',
				customerId: 'cus_deleted',
				customerEmail: 'user@example.com',
				successUrl: 'https://example.com/success',
				cancelUrl: 'https://example.com/cancel',
				entitlementKey: 'premium_lifetime',
				lookupKey: 'premium_lifetime_3000',
				locale: 'en',
				currency: 'usd'
			})
		).resolves.toBe(session);

		expect(create).toHaveBeenCalledTimes(2);
		expect(create).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				customer: 'cus_deleted',
				customer_email: undefined,
				customer_creation: undefined,
				locale: 'en',
				currency: 'usd'
			})
		);
		expect(create).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				customer: undefined,
				customer_email: 'user@example.com',
				customer_creation: 'always',
				locale: 'en',
				currency: 'usd'
			})
		);
	});
});
