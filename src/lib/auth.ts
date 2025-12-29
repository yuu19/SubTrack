import { betterAuth } from 'better-auth';
import { stripe } from '@better-auth/stripe';
import Stripe from 'stripe';
import { magicLink } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import Database from 'better-sqlite3';
import { getRequestEvent } from '$app/server';
import {
	sendVerificationEmail,
	sendMagicLinkEmail,
	sendChangeEmailConfirmation
} from '$lib/server/email';
import * as schema from './server/db/schema';
type Schema = typeof import('./server/db/schema');

/**
 * stripeの管理画面から作成した商品の商品ID
 * annualは割引の場合(後で設定するかも)
 */
const PREMIUM_PRICE_ID = {
	default: 'change_me!'
	// annual: "price_1RurxWFomgCAvvs0hMaoC63b",
} as const;

const stripeSecretKey = process.env.SECRET_STRIPE_KEY;

const stripeClient = new Stripe(stripeSecretKey!, {
	apiVersion: '2025-11-17.clover'
});

export function createAuth(db: DrizzleD1Database<Schema> | BetterSQLite3Database<Schema>) {
	return betterAuth({
		trustedOrigins: process.env.TRUSTED_ORIGINS?.split(',') ?? [],
		database: drizzleAdapter(db, {
			schema,
			provider: 'sqlite'
		}),

		emailAndPassword: {
			enabled: true,
			requireEmailVerification: true //メールを検証するまでsigninできない
		},

		// メールアドレス検証メール
		emailVerification: {
			sendOnSignUp: true,
			autoSignInAfterVerification: true,
			sendVerificationEmail: async (data, request) => {
				try {
					await sendVerificationEmail(data);
				} catch (error) {
					console.error('Failed to send verification email:', error);
				}
			}
		},

		plugins: [
			admin(),
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
 							// annualDiscountPriceId: PLUS_PRICE_ID.annual,
 							freeTrial: {
 								days: 7
 							}
 						}
 					]
 				}
 			}),
			magicLink({
				sendMagicLink: async (data, request) => {
					try {
						await sendMagicLinkEmail(data);
					} catch (error) {
						console.error('Failed to send magic link:', error);
					}
				},
				expiresIn: 3600 // 1時間有効
			}),
			sveltekitCookies(getRequestEvent)
		],

		secret: process.env.BETTER_AUTH_SECRET,
		user: {
			changeEmail: {
				enabled: true,
				sendChangeEmailConfirmation: async ({ user, newEmail, url, token }, request) => {
					await sendChangeEmailConfirmation({ user, newEmail, url, token });
				}
			}
		}
	});
}

/**
 * Better Auth CLI を使用したスキーマ生成時のみ使用する
 */
// export const auth = betterAuth({
// 	trustedOrigins: process.env.TRUSTED_ORIGINS?.split(',') ?? [],
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
