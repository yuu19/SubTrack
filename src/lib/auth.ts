import { betterAuth } from 'better-auth';
import { stripe } from '@better-auth/stripe';
import Stripe from 'stripe';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { parseAdminUserIds } from '$lib/server/admin';
import * as schema from './server/db/schema';
type Schema = typeof import('./server/db/schema');

/**
 * stripeの管理画面から作成した商品の商品ID
 * annualは割引の場合(後で設定するかも)
 */
const PREMIUM_PRICE_ID = {
	default: 'price_1SjMfPFomgCAvvs0P7MKz8GT',
	annual: "price_1SjMfPFomgCAvvs0V4y8b8lG",
} as const;
const TEST_PRICE_LOOKUP_KEY = 'test_daily';

const stripeSecretKey = process.env.SECRET_STRIPE_KEY;
const authBaseUrl =
	process.env.BETTER_AUTH_URL ?? process.env.PUBLIC_BETTER_AUTH_URL ?? process.env.APP_ORIGIN;
const authBasePath = '/api/auth';
type CreateAuthOptions = {
	requestOrigin?: string;
};

const getRequestOrigin = (): string | undefined => {
	try {
		return getRequestEvent()?.url.origin;
	} catch {
		return undefined;
	}
};

const resolveAuthBaseUrl = (requestOrigin?: string) => {
	const origin = requestOrigin ?? getRequestOrigin();

	if (!authBaseUrl) return origin;
	if (!origin) return authBaseUrl;

	try {
		if (new URL(authBaseUrl).origin === origin) return authBaseUrl;
	} catch {
		return authBaseUrl;
	}

	return origin;
};

const resolveAuthRedirectURI = (requestOrigin?: string, providerId = 'google') => {
	const origin = resolveAuthBaseUrl(requestOrigin);
	if (!origin) return undefined;

	return new URL(`${authBasePath}/callback/${providerId}`, origin).toString();
};
const adminUserIds = parseAdminUserIds(process.env.ADMIN_USER_IDS);

const stripeClient = new Stripe(stripeSecretKey!, {
	apiVersion: '2025-11-17.clover'
});

export function createAuth(
	db: DrizzleD1Database<Schema> | BetterSQLite3Database<Schema>,
	options: CreateAuthOptions = {}
) {
	return betterAuth({
		database: drizzleAdapter(db, {
			schema,
			provider: 'sqlite'
		}),
		baseURL: resolveAuthBaseUrl(options.requestOrigin),
		emailAndPassword: {
			enabled: true
		},
		socialProviders: {
			google: {
				prompt: "select_account", 
				clientId: process.env.GOOGLE_CLIENT_ID!,
				clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
				redirectURI: resolveAuthRedirectURI(options.requestOrigin, 'google')
			}
		},

		plugins: [
			admin({
				adminUserIds: adminUserIds.length ? adminUserIds : undefined
			}),
			stripe({
				stripeClient,
				stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
				createCustomerOnSignUp: true,
				subscription: {
					enabled: true,
					allowReTrialsForDifferentPlans: true,
					plans: [
						{
							name: 'Free',
							// priceId を設定しない = 無料プラン
							limits: {
								projects: 1,
								storage: 1
							}
						},
						{
							name: 'Premium',
							priceId: PREMIUM_PRICE_ID.default,
							annualDiscountPriceId: PREMIUM_PRICE_ID.annual,
							freeTrial: {
								days: 7
							}
						},
						{
							name: 'Test 1 Day',
							lookupKey: TEST_PRICE_LOOKUP_KEY,
							freeTrial: {
								days: 1
							}
						}
					]
				}
			}),
			sveltekitCookies(getRequestEvent)
		],

		secret: process.env.BETTER_AUTH_SECRET
	});
}

/**
 * Better Auth CLI を使用したスキーマ生成時のみ使用する
 */
// export const auth = betterAuth({
// 	database: drizzleAdapter(new Database("./db.sqlite"), {
// 			schema,
// 			provider: 'sqlite'
// 		}),

// 		// Email & Password を使う場合の例
// 		emailAndPassword: {
// 			enabled: true,
// 			requireEmailVerification: true
// 		},

// 		// メールアドレス検証メール
// 		emailVerification: {
// 			sendOnSignUp: true,
// 			sendVerificationEmail: async (data, request) => {
// 				try {
// 					await sendVerificationEmail(data);
// 				} catch (error) {
// 					console.error('Failed to send verification email:', error);
// 				}
// 			}
// 		},

// 		// Magic Link プラグイン
// 	plugins: [
// 		admin(),
// 		stripe({
//  				stripeClient,
//  				stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
//  				createCustomerOnSignUp: true,
//  				subscription: {
//  					enabled: true,
//  					allowReTrialsForDifferentPlans: true,
//  					plans: [
//  						{
//  							name: 'Free',
//  							// priceId を設定しない = 無料プラン
//  							limits: {
//  								projects: 1,
//  								storage: 1
//  							}
//  						},
//  						{
//  							name: 'Premium',
//  							priceId: PREMIUM_PRICE_ID.default,
//  							// annualDiscountPriceId: PLUS_PRICE_ID.annual,
//  							freeTrial: {
//  								days: 7
//  							}
//  						}
//  					]
//  				}
// 			}),
// 		magicLink({
// 			sendMagicLink: async (data, request) => {
// 				try {
// 					await sendMagicLinkEmail(data);
// 				} catch (error) {
// 					console.error('Failed to send magic link:', error);
// 				}
// 			},
// 			expiresIn: 3600
// 		}),
// 		sveltekitCookies(getRequestEvent)
// 	],

// 		secret: process.env.BETTER_AUTH_SECRET,
// 		user: {
// 			changeEmail: {
// 				enabled: true,
// 				sendChangeEmailConfirmation: async ({ user, newEmail, url, token }, request) => {
// 					await sendChangeEmailConfirmation({ user, newEmail, url, token });
// 				}
// 			}
// 		}
// 	});
