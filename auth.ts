import { betterAuth } from 'better-auth';
import { stripe } from '@better-auth/stripe';
import Stripe from 'stripe';
import { magicLink } from 'better-auth/plugins';
import { admin } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import Database from 'better-sqlite3';
import * as schema from './src/lib/server/db/schema';

type Schema = typeof import('./src/lib/server/db/schema');

/**
 * CLI 用の Better Auth 設定。
 * SvelteKit の仮想モジュール ($app/*) に依存しないように分離。
 */
const PREMIUM_PRICE_ID = {
	default: 'price_1SjMfPFomgCAvvs0P7MKz8GT'
} as const;

const stripeSecretKey = process.env.SECRET_STRIPE_KEY ?? 'sk_test_placeholder';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_placeholder';

const stripeClient = new Stripe(stripeSecretKey, {
	apiVersion: '2025-11-17.clover'
});

const noop = async () => {};

export const auth = betterAuth({
	trustedOrigins: process.env.TRUSTED_ORIGINS?.split(',') ?? [],
	database: drizzleAdapter(new Database('./db.sqlite'), {
		schema,
		provider: 'sqlite'
	}),

	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true
	},

	emailVerification: {
		sendOnSignUp: true,
		sendVerificationEmail: async () => {
			await noop();
		}
	},

	plugins: [
		admin(),
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
						priceId: PREMIUM_PRICE_ID.default,
						freeTrial: {
							days: 7
						}
					}
				]
			}
		}),
		magicLink({
			sendMagicLink: async () => {
				await noop();
			},
			expiresIn: 3600
		})
	],

	secret: process.env.BETTER_AUTH_SECRET,
	user: {
		changeEmail: {
			enabled: true,
			sendChangeEmailConfirmation: async () => {
				await noop();
			}
		}
	}
});
