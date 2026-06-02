import { betterAuth } from 'better-auth';
import { stripe } from '@better-auth/stripe';
import Stripe from 'stripe';
import { admin } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import Database from 'better-sqlite3';
import { parseAdminUserIds } from './src/lib/server/admin';
import {
	PREMIUM_ANNUAL_LOOKUP_KEY,
	PREMIUM_MONTHLY_LOOKUP_KEY,
	TEST_DAILY_LOOKUP_KEY
} from './src/lib/server/stripe-products';
import * as schema from './src/lib/server/db/schema';

type Schema = typeof import('./src/lib/server/db/schema');

/**
 * CLI 用の Better Auth 設定。
 * SvelteKit の仮想モジュール ($app/*) に依存しないように分離。
 */
const stripeSecretKey = process.env.SECRET_STRIPE_KEY ?? 'sk_test_placeholder';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_placeholder';
const authBaseUrl =
	process.env.BETTER_AUTH_URL ?? process.env.PUBLIC_BETTER_AUTH_URL ?? 'http://localhost:3000';
const adminUserIds = parseAdminUserIds(process.env.ADMIN_USER_IDS);

const stripeClient = new Stripe(stripeSecretKey, {
	apiVersion: '2025-11-17.clover'
});

export const auth = betterAuth({
	database: drizzleAdapter(new Database('./db.sqlite'), {
		schema,
		provider: 'sqlite'
	}),
	baseURL: authBaseUrl,
	emailAndPassword: {
		enabled: true
	},
	socialProviders: {
		google: {
			prompt: 'select_account',
			clientId: process.env.GOOGLE_CLIENT_ID ?? 'google_client_id_placeholder',
			clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? 'google_client_secret_placeholder'
		}
	},

	plugins: [
		admin({
			adminUserIds: adminUserIds.length ? adminUserIds : undefined
		}),
		stripe({
			stripeClient,
			stripeWebhookSecret,
			createCustomerOnSignUp: true,
			subscription: {
				enabled: true,
				allowReTrialsForDifferentPlans: true,
				plans: [
					{
						name: 'Free',
						limits: {
							projects: 1,
							storage: 1
						}
					},
					{
						name: 'Premium',
						lookupKey: PREMIUM_MONTHLY_LOOKUP_KEY,
						annualDiscountLookupKey: PREMIUM_ANNUAL_LOOKUP_KEY,
						freeTrial: {
							days: 7
						}
					},
					{
						name: 'Test 1 Day',
						lookupKey: TEST_DAILY_LOOKUP_KEY,
						freeTrial: {
							days: 1
						}
					}
				]
			}
		})
	],

	secret: process.env.BETTER_AUTH_SECRET
});
