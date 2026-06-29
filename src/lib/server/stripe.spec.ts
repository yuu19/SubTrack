import { describe, expect, it } from 'vitest';
import type Stripe from 'stripe';
import { getStripePriceMismatch } from './stripe';

const price = (overrides: Partial<Stripe.Price> = {}): Stripe.Price =>
	({
		id: 'price_lifetime',
		object: 'price',
		active: true,
		currency: 'jpy',
		unit_amount: 3000,
		recurring: null,
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
});
