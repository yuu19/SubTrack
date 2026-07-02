import { expect, type APIRequestContext } from '@playwright/test';
import Stripe from 'stripe';
import { hasStripeTestSecret, loadE2EEnvFiles } from './env';

loadE2EEnvFiles();

export const PREMIUM_MONTHLY_LOOKUP_KEY = 'premium_monthly';
export const PREMIUM_LIFETIME_ENTITLEMENT_KEY = 'premium_lifetime';
export const PREMIUM_LIFETIME_LOOKUP_KEY = 'premium_lifetime_3000';
const TEST_CARD_PAYMENT_METHOD = 'pm_card_visa';

export function shouldRunBillingE2E() {
	return hasStripeTestSecret();
}

export function getBillingSkipReason() {
	if (!process.env.SECRET_STRIPE_KEY) {
		return 'SECRET_STRIPE_KEY is not set';
	}

	if (!process.env.SECRET_STRIPE_KEY.startsWith('sk_test_')) {
		return 'SECRET_STRIPE_KEY must be a Stripe test-mode key for billing E2E';
	}

	return null;
}

export async function getCurrentUserId(request: APIRequestContext) {
	const response = await request.get('/api/auth/get-session');
	expect(response.ok(), await response.text()).toBeTruthy();

	const session = (await response.json()) as { user?: { id?: unknown } } | null;
	const userId = session?.user?.id;
	if (typeof userId !== 'string' || !userId) {
		throw new Error('Failed to resolve the authenticated E2E user id');
	}

	return userId;
}

export function signStripeWebhookPayload(payload: string) {
	return Stripe.webhooks.generateTestHeaderString({
		payload,
		secret: process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_subtrack_e2e'
	});
}

export type BillingTestSubscription = {
	clockId: string;
	customerId: string;
	subscriptionId: string;
};

export class StripeBillingTestDriver {
	private readonly stripe: Stripe;

	constructor(private readonly request: APIRequestContext) {
		if (!process.env.SECRET_STRIPE_KEY?.startsWith('sk_test_')) {
			throw new Error(getBillingSkipReason() ?? 'Stripe test key is not configured');
		}

		this.stripe = new Stripe(process.env.SECRET_STRIPE_KEY, {
			apiVersion: '2025-11-17.clover'
		});
	}

	async createMonthlyPremiumTrial(email: string): Promise<BillingTestSubscription> {
		const price = await this.getPremiumMonthlyPrice();
		const clock = await this.stripe.testHelpers.testClocks.create({
			frozen_time: Math.floor(Date.now() / 1000),
			name: `SubTrack billing E2E ${Date.now()}`
		});
		const customer = await this.stripe.customers.create({
			email,
			test_clock: clock.id
		});

		await this.stripe.paymentMethods.attach(TEST_CARD_PAYMENT_METHOD, {
			customer: customer.id
		});
		await this.stripe.customers.update(customer.id, {
			invoice_settings: {
				default_payment_method: TEST_CARD_PAYMENT_METHOD
			}
		});

		const subscription = await this.stripe.subscriptions.create({
			customer: customer.id,
			items: [{ price: price.id }],
			trial_period_days: 7,
			metadata: {
				e2e: 'subtrack-billing'
			}
		});

		return {
			clockId: clock.id,
			customerId: customer.id,
			subscriptionId: subscription.id
		};
	}

	async syncSubscription(subscriptionId: string) {
		const response = await this.request.post('/api/e2e/billing/sync', {
			data: {
				subscriptionId,
				planName: 'Premium'
			}
		});

		expect(response.ok(), await response.text()).toBeTruthy();
		return (await response.json()) as {
			status: string;
			cancelAtPeriodEnd: boolean;
			testClockNow: number | null;
			periodEnd: string | null;
			trialEnd: string | null;
		};
	}

	async advancePastTrial(subscriptionId: string, clockId: string) {
		const subscription = await this.retrieveSubscription(subscriptionId);
		const trialEnd = subscription.trial_end;
		if (!trialEnd) throw new Error(`Subscription ${subscriptionId} has no trial_end`);

		await this.advanceClock(clockId, trialEnd + 120);
		return this.retrieveSubscription(subscriptionId);
	}

	async scheduleCancelAtPeriodEnd(subscriptionId: string) {
		return this.stripe.subscriptions.update(subscriptionId, {
			cancel_at_period_end: true
		});
	}

	async advancePastCurrentPeriod(subscriptionId: string, clockId: string) {
		const subscription = await this.retrieveSubscription(subscriptionId);
		const periodEnd = this.getCurrentPeriodEnd(subscription);

		await this.advanceClock(clockId, periodEnd + 120);
		return this.retrieveSubscription(subscriptionId);
	}

	async cleanup(target: Partial<BillingTestSubscription>) {
		if (target.subscriptionId) {
			await this.stripe.subscriptions.cancel(target.subscriptionId).catch(() => undefined);
		}
		if (target.customerId) {
			await this.stripe.customers.del(target.customerId).catch(() => undefined);
		}
		if (target.clockId) {
			await this.stripe.testHelpers.testClocks.del(target.clockId).catch(() => undefined);
		}
	}

	private async getPremiumMonthlyPrice() {
		const prices = await this.stripe.prices.list({
			lookup_keys: [PREMIUM_MONTHLY_LOOKUP_KEY],
			active: true,
			limit: 1
		});
		const price = prices.data[0];
		if (!price) {
			throw new Error(`Stripe price lookup key ${PREMIUM_MONTHLY_LOOKUP_KEY} was not found`);
		}
		if (!price.recurring || price.recurring.interval !== 'month') {
			throw new Error(`Stripe price ${price.id} is not a monthly recurring price`);
		}

		return price;
	}

	private async advanceClock(clockId: string, frozenTime: number) {
		await this.stripe.testHelpers.testClocks.advance(clockId, {
			frozen_time: frozenTime
		});
		await this.waitForClockReady(clockId);
	}

	private async waitForClockReady(clockId: string) {
		for (let attempt = 0; attempt < 40; attempt += 1) {
			const clock = await this.stripe.testHelpers.testClocks.retrieve(clockId);
			if (clock.status === 'ready') return clock;
			await new Promise((resolve) => setTimeout(resolve, 500));
		}

		throw new Error(`Stripe test clock ${clockId} did not become ready`);
	}

	private async retrieveSubscription(subscriptionId: string) {
		return this.stripe.subscriptions.retrieve(subscriptionId, {
			expand: ['items.data.price']
		});
	}

	private getCurrentPeriodEnd(subscription: Stripe.Subscription) {
		const item = subscription.items.data[0] as Stripe.SubscriptionItem & {
			current_period_end?: number;
		};
		if (!item?.current_period_end) {
			throw new Error(`Subscription ${subscription.id} has no current period end`);
		}

		return item.current_period_end;
	}
}
