import { describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import { constructStripeWebhookEvent } from './stripe-webhook';

describe('constructStripeWebhookEvent', () => {
	it('uses constructEventAsync when available', async () => {
		const event = { id: 'evt_async', type: 'checkout.session.completed' } as Stripe.Event;
		const constructEvent = vi.fn();
		const constructEventAsync = vi.fn().mockResolvedValue(event);
		const stripeClient = {
			webhooks: {
				constructEvent,
				constructEventAsync
			}
		} as unknown as Stripe;

		await expect(
			constructStripeWebhookEvent(stripeClient, 'payload', 'sig', 'whsec_test')
		).resolves.toBe(event);

		expect(constructEventAsync).toHaveBeenCalledWith('payload', 'sig', 'whsec_test');
		expect(constructEvent).not.toHaveBeenCalled();
	});

	it('falls back to constructEvent when async helper is unavailable', async () => {
		const event = { id: 'evt_sync', type: 'invoice.created' } as Stripe.Event;
		const constructEvent = vi.fn().mockReturnValue(event);
		const stripeClient = {
			webhooks: {
				constructEvent
			}
		} as unknown as Stripe;

		await expect(
			constructStripeWebhookEvent(stripeClient, 'payload', 'sig', 'whsec_test')
		).resolves.toBe(event);

		expect(constructEvent).toHaveBeenCalledWith('payload', 'sig', 'whsec_test');
	});
});
