import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import * as schema from './db/schema';
import { createTestDb } from './test-db';
import { PREMIUM_LIFETIME_ENTITLEMENT_KEY } from './entitlements';
import { PREMIUM_LIFETIME_LOOKUP_KEY, PREMIUM_MONTHLY_LOOKUP_KEY } from './stripe-products';

const stripeCalls = vi.hoisted(() => ({
	customers: { search: vi.fn(), create: vi.fn(), retrieve: vi.fn(), update: vi.fn() },
	prices: { list: vi.fn() },
	subscriptions: { list: vi.fn(), retrieve: vi.fn(), update: vi.fn() },
	checkout: { create: vi.fn() },
	billingPortal: { create: vi.fn() },
	network: vi.fn()
}));

vi.mock('$app/server', () => ({
	getRequestEvent: () => {
		throw new Error('No SvelteKit request in this isolated integration test');
	}
}));

vi.mock('stripe', async (importOriginal) => {
	const actual = await importOriginal<typeof import('stripe')>();
	return {
		...actual,
		default: class extends actual.default {
			constructor() {
				super('sk_test_subtrack_billing_compat', {
					httpClient: actual.default.createFetchHttpClient(stripeCalls.network)
				});
				Object.assign(this.customers, stripeCalls.customers);
				Object.assign(this.prices, stripeCalls.prices);
				Object.assign(this.subscriptions, stripeCalls.subscriptions);
				Object.assign(this.checkout.sessions, stripeCalls.checkout);
				Object.assign(this.billingPortal.sessions, stripeCalls.billingPortal);
			}
		}
	};
});

const origin = 'https://billing.example.test';
const webhookSecret = 'whsec_subtrack_billing_compat';
const customerId = 'cus_subtrack_compat';
const periodStart = 1_780_000_000;
const periodEnd = periodStart + 30 * 24 * 60 * 60;
const price = {
	id: 'price_subtrack_premium',
	object: 'price',
	lookup_key: PREMIUM_MONTHLY_LOOKUP_KEY,
	recurring: { interval: 'month', usage_type: 'licensed' }
};

describe('Better Auth Stripe compatibility', () => {
	let fixture: Awaited<ReturnType<typeof createTestDb>>;
	let auth: ReturnType<typeof import('../auth').createAuth>;

	beforeEach(async () => {
		vi.resetModules();
		vi.resetAllMocks();
		vi.stubEnv('BETTER_AUTH_URL', origin);
		vi.stubEnv('BETTER_AUTH_SECRET', 'isolated-billing-test-secret-0123456789abcdef');
		vi.stubEnv('GOOGLE_CLIENT_ID', 'test-google-client');
		vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-google-secret');
		vi.stubEnv('SECRET_STRIPE_KEY', 'sk_test_subtrack_billing_compat');
		vi.stubEnv('STRIPE_WEBHOOK_SECRET', webhookSecret);
		vi.stubEnv('E2E_AUTH_DISABLE_STRIPE', 'false');
		vi.stubEnv('E2E_STRIPE_CREATE_CUSTOMER_ON_SIGNUP', 'true');
		vi.stubEnv('ADMIN_USER_IDS', '');
		stripeCalls.network.mockRejectedValue(new Error('Unexpected Stripe network request'));
		stripeCalls.customers.search.mockResolvedValue({ data: [] });
		stripeCalls.customers.create.mockResolvedValue({ id: customerId });
		stripeCalls.customers.retrieve.mockResolvedValue({
			id: customerId,
			email: 'billing@example.test'
		});
		stripeCalls.customers.update.mockResolvedValue({ id: customerId });
		stripeCalls.prices.list.mockResolvedValue({ data: [price] });
		stripeCalls.subscriptions.list.mockResolvedValue({ data: [] });
		stripeCalls.subscriptions.retrieve.mockRejectedValue(new Error('No subscription fixture'));
		stripeCalls.checkout.create.mockResolvedValue({
			id: 'cs_test_subtrack_compat',
			url: 'https://checkout.stripe.com/c/pay/test_compat'
		});
		stripeCalls.billingPortal.create.mockResolvedValue({
			url: 'https://billing.stripe.com/p/session/test_compat'
		});
		fixture = await createTestDb();
		const { createAuth } = await import('../auth');
		auth = createAuth(fixture.db, { requestOrigin: origin });
		// Better Auth skips origin checks under NODE_ENV=test. Exercise the
		// production checks too, including Stripe return/success URL validation.
		(await auth.$context).skipOriginCheck = false;
	});

	afterEach(() => {
		fixture?.sqlite.close();
		vi.unstubAllEnvs();
	});

	function request(path: string, body?: unknown, cookie?: string) {
		return auth.handler(
			new Request(`${origin}/api/auth${path}`, {
				method: body === undefined ? 'GET' : 'POST',
				headers: {
					origin,
					'content-type': 'application/json',
					...(cookie ? { cookie } : {})
				},
				body: body === undefined ? undefined : JSON.stringify(body)
			})
		);
	}

	async function signUp() {
		const response = await request('/sign-up/email', {
			name: 'Billing Test',
			email: 'billing@example.test',
			password: 'test-only-password-0123456789'
		});
		expect(response.status, await response.clone().text()).toBe(200);
		const { user } = (await response.json()) as { user: { id: string } };
		const cookie = response.headers
			.getSetCookie()
			.map((value) => value.split(';')[0])
			.join('; ');
		return { userId: user.id, cookie };
	}

	function stripeSubscription(overrides: Record<string, unknown> = {}) {
		return {
			id: 'sub_subtrack_compat',
			object: 'subscription',
			customer: customerId,
			status: 'active',
			metadata: {},
			cancel_at_period_end: false,
			cancel_at: null,
			canceled_at: null,
			ended_at: null,
			trial_start: null,
			trial_end: null,
			items: {
				data: [
					{
						id: 'si_subtrack_compat',
						price,
						quantity: 1,
						current_period_start: periodStart,
						current_period_end: periodEnd
					}
				]
			},
			...overrides
		};
	}

	function webhook(type: string, object: unknown, validSignature = true) {
		const timestamp = Math.floor(Date.now() / 1000);
		const payload = JSON.stringify({
			id: `evt_${type}`,
			object: 'event',
			type,
			created: timestamp,
			livemode: false,
			data: { object }
		});
		const signature = createHmac('sha256', webhookSecret)
			.update(`${timestamp}.${payload}`)
			.digest('hex');
		return auth.handler(
			new Request(`${origin}/api/auth/stripe/webhook`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'stripe-signature': `t=${timestamp},v1=${validSignature ? signature : 'invalid'}`
				},
				body: payload
			})
		);
	}

	it('does not link an existing customer by an unverified signup email', async () => {
		stripeCalls.customers.search.mockResolvedValue({
			data: [{ id: 'cus_existing_other_user', metadata: {} }]
		});
		const { userId } = await signUp();
		const user = await fixture.db.query.user.findFirst();

		expect(user?.stripeCustomerId).toBe(customerId);
		expect(stripeCalls.customers.create).toHaveBeenCalledWith(
			expect.objectContaining({
				email: 'billing@example.test',
				metadata: { userId, customerType: 'user' }
			})
		);
		expect(stripeCalls.network).not.toHaveBeenCalled();
	});

	it('creates Premium checkout with lookup pricing, a first trial and protected metadata', async () => {
		const { userId, cookie } = await signUp();
		const response = await request(
			'/subscription/upgrade',
			{
				plan: 'Premium',
				locale: 'ja',
				successUrl: '/ja/me/settings',
				cancelUrl: '/ja/me/settings',
				returnUrl: '/ja/me/settings',
				metadata: { userId: 'other-user', referenceId: 'other-user', subscriptionId: 'other-sub' }
			},
			cookie
		);
		expect(response.status, await response.clone().text()).toBe(200);
		const subscription = await fixture.db.query.subscription.findFirst();
		const params = stripeCalls.checkout.create.mock
			.calls[0][0] as Stripe.Checkout.SessionCreateParams;

		expect(subscription).toMatchObject({
			plan: 'premium',
			referenceId: userId,
			status: 'incomplete'
		});
		expect(stripeCalls.prices.list).toHaveBeenCalledWith({
			lookup_keys: [PREMIUM_MONTHLY_LOOKUP_KEY],
			active: true,
			limit: 1
		});
		expect(params).toMatchObject({
			mode: 'subscription',
			customer: customerId,
			locale: 'ja',
			line_items: [{ price: price.id, quantity: 1 }],
			client_reference_id: userId,
			cancel_url: `${origin}/ja/me/settings`,
			metadata: { userId, referenceId: userId, subscriptionId: subscription?.id },
			subscription_data: {
				trial_period_days: 7,
				metadata: { userId, referenceId: userId, subscriptionId: subscription?.id }
			}
		});
		expect(params.success_url).toContain('/api/auth/subscription/success?callbackURL=');
		expect(params.success_url).toContain('checkoutSessionId={CHECKOUT_SESSION_ID}');

		stripeCalls.subscriptions.retrieve.mockResolvedValue(
			stripeSubscription({
				status: 'trialing',
				trial_start: periodStart,
				trial_end: periodStart + 7 * 86_400
			})
		);
		const completion = await webhook('checkout.session.completed', {
			id: 'cs_test_subtrack_compat',
			object: 'checkout.session',
			mode: 'subscription',
			customer: customerId,
			subscription: 'sub_subtrack_compat',
			client_reference_id: userId,
			metadata: params.metadata
		});
		expect(completion.status, await completion.clone().text()).toBe(200);
		expect(await fixture.db.query.subscription.findFirst()).toMatchObject({
			id: subscription?.id,
			status: 'trialing',
			stripeSubscriptionId: 'sub_subtrack_compat',
			trialStart: new Date(periodStart * 1000),
			trialEnd: new Date((periodStart + 7 * 86_400) * 1000)
		});
		expect(stripeCalls.network).not.toHaveBeenCalled();
	});

	it('does not grant another trial after a previous plan trial', async () => {
		const { userId, cookie } = await signUp();
		await fixture.db.insert(schema.subscription).values({
			id: 'previous-trial',
			plan: 'test 1 day',
			referenceId: userId,
			status: 'canceled',
			trialStart: new Date((periodStart - 86_400) * 1000),
			trialEnd: new Date(periodStart * 1000)
		});
		const response = await request('/subscription/upgrade', { plan: 'Premium' }, cookie);

		expect(response.status, await response.clone().text()).toBe(200);
		expect(stripeCalls.checkout.create.mock.calls[0][0].subscription_data).not.toHaveProperty(
			'trial_period_days'
		);
	});

	it('opens the billing portal for the current customer and rejects an external return URL', async () => {
		const { cookie } = await signUp();
		const response = await request(
			'/subscription/billing-portal',
			{ locale: 'ja', returnUrl: '/ja/me/settings', disableRedirect: true },
			cookie
		);
		expect(response.status, await response.clone().text()).toBe(200);
		expect(await response.json()).toMatchObject({
			url: 'https://billing.stripe.com/p/session/test_compat',
			redirect: false
		});
		expect(stripeCalls.billingPortal.create).toHaveBeenCalledWith({
			locale: 'ja',
			customer: customerId,
			return_url: `${origin}/ja/me/settings`
		});

		stripeCalls.billingPortal.create.mockClear();
		const rejected = await request(
			'/subscription/billing-portal',
			{ returnUrl: 'https://untrusted.example.test/steal' },
			cookie
		);
		expect(rejected.status).toBe(403);
		expect(stripeCalls.billingPortal.create).not.toHaveBeenCalled();
	});

	it('restores the selected subscription and clears pending cancellation fields', async () => {
		const { userId, cookie } = await signUp();
		await fixture.db.insert(schema.subscription).values({
			id: 'pending-cancel',
			plan: 'premium',
			referenceId: userId,
			stripeCustomerId: customerId,
			stripeSubscriptionId: 'sub_subtrack_compat',
			status: 'active',
			cancelAtPeriodEnd: true,
			cancelAt: new Date(periodEnd * 1000),
			canceledAt: new Date(periodStart * 1000)
		});
		stripeCalls.subscriptions.retrieve.mockResolvedValue(
			stripeSubscription({ cancel_at_period_end: true, cancel_at: periodEnd })
		);
		stripeCalls.subscriptions.update.mockResolvedValue(stripeSubscription());
		const response = await request(
			'/subscription/restore',
			{ referenceId: userId, subscriptionId: 'sub_subtrack_compat' },
			cookie
		);

		expect(response.status, await response.clone().text()).toBe(200);
		expect(stripeCalls.subscriptions.retrieve).toHaveBeenCalledWith('sub_subtrack_compat');
		expect(stripeCalls.subscriptions.update).toHaveBeenCalledWith('sub_subtrack_compat', {
			cancel_at: ''
		});
		expect(await fixture.db.query.subscription.findFirst()).toMatchObject({
			cancelAtPeriodEnd: false,
			cancelAt: null,
			canceledAt: null
		});
	});

	it('does not allow the current user to select another billing reference', async () => {
		const { cookie } = await signUp();
		const response = await request(
			'/subscription/upgrade',
			{ plan: 'Premium', referenceId: 'another-user' },
			cookie
		);

		expect(response.status).toBe(400);
		expect(stripeCalls.checkout.create).not.toHaveBeenCalled();
		expect(await fixture.db.query.subscription.findMany()).toEqual([]);
	});

	it('persists signed recurring webhook creation, cancellation dates and deletion', async () => {
		const { userId, cookie } = await signUp();
		const created = await webhook('customer.subscription.created', stripeSubscription());
		expect(created.status, await created.clone().text()).toBe(200);
		expect(await fixture.db.query.subscription.findFirst()).toMatchObject({
			plan: 'premium',
			referenceId: userId,
			stripeSubscriptionId: 'sub_subtrack_compat',
			status: 'active',
			periodStart: new Date(periodStart * 1000),
			periodEnd: new Date(periodEnd * 1000),
			billingInterval: 'month'
		});

		const updated = await webhook(
			'customer.subscription.updated',
			stripeSubscription({
				cancel_at_period_end: true,
				cancel_at: periodEnd,
				canceled_at: periodStart + 60
			})
		);
		expect(updated.status, await updated.clone().text()).toBe(200);
		expect(await fixture.db.query.subscription.findFirst()).toMatchObject({
			cancelAtPeriodEnd: true,
			cancelAt: new Date(periodEnd * 1000),
			canceledAt: new Date((periodStart + 60) * 1000)
		});
		const listed = await request('/subscription/list', undefined, cookie);
		expect(await listed.json()).toEqual([
			expect.objectContaining({ plan: 'premium', status: 'active' })
		]);

		const deleted = await webhook(
			'customer.subscription.deleted',
			stripeSubscription({ status: 'canceled', ended_at: periodEnd })
		);
		expect(deleted.status, await deleted.clone().text()).toBe(200);
		expect(await fixture.db.query.subscription.findFirst()).toMatchObject({ status: 'canceled' });
		const afterCancellation = await request('/subscription/list', undefined, cookie);
		expect(await afterCancellation.json()).toEqual([]);
		expect(stripeCalls.network).not.toHaveBeenCalled();
	});

	it('rejects an invalid webhook signature before writing billing state', async () => {
		await signUp();
		const response = await webhook('customer.subscription.created', stripeSubscription(), false);

		expect(response.status).toBe(400);
		expect(await fixture.db.query.subscription.findMany()).toEqual([]);
		expect(await fixture.db.query.userEntitlement.findMany()).toEqual([]);
	});

	it('still runs the lifetime callback and makes repeated signed payment events idempotent', async () => {
		const { userId } = await signUp();
		const session = {
			id: 'cs_lifetime_compat',
			object: 'checkout.session',
			mode: 'payment',
			payment_status: 'paid',
			customer: customerId,
			payment_intent: 'pi_lifetime_compat',
			subscription: null,
			metadata: {
				userId,
				purchase_type: 'one_time',
				entitlement: PREMIUM_LIFETIME_ENTITLEMENT_KEY,
				lookup_key: PREMIUM_LIFETIME_LOOKUP_KEY
			}
		};

		for (let delivery = 0; delivery < 2; delivery++) {
			const response = await webhook('checkout.session.completed', session);
			expect(response.status, await response.clone().text()).toBe(200);
		}
		expect(await fixture.db.query.userEntitlement.findMany()).toEqual([
			expect.objectContaining({
				userId,
				key: PREMIUM_LIFETIME_ENTITLEMENT_KEY,
				stripeSessionId: session.id,
				stripePaymentIntentId: session.payment_intent,
				revokedAt: null
			})
		]);
		expect(await fixture.db.query.subscription.findMany()).toEqual([]);
		expect(stripeCalls.network).not.toHaveBeenCalled();
	});
});
