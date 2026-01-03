import { betterAuth } from 'better-auth';
import { verifyPassword as verifyLegacyPassword } from 'better-auth/crypto';
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
	default: 'price_1SjMfPFomgCAvvs0P7MKz8GT',
	annual: "price_1SjMfPFomgCAvvs0V4y8b8lG",
} as const;
const TEST_PRICE_LOOKUP_KEY = 'test_daily';

const stripeSecretKey = process.env.SECRET_STRIPE_KEY;

const stripeClient = new Stripe(stripeSecretKey!, {
	apiVersion: '2025-11-17.clover'
});

const PASSWORD_PREFIX = 'pbkdf2_sha256';
const PASSWORD_ITERATIONS = 100_000;
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEY_BYTES = 32;
const encoder = new TextEncoder();

const bytesToBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const base64ToBytes = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

const timingSafeEqual = (a: Uint8Array, b: Uint8Array) => {
	let diff = a.length ^ b.length;
	const length = Math.max(a.length, b.length);
	for (let i = 0; i < length; i += 1) {
		diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
	}
	return diff === 0;
};

const derivePbkdf2Key = async (password: string, salt: Uint8Array, iterations: number) => {
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		encoder.encode(password),
		'PBKDF2',
		false,
		['deriveBits']
	);
	const bits = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			hash: 'SHA-256',
			salt,
			iterations
		},
		keyMaterial,
		PASSWORD_KEY_BYTES * 8
	);
	return new Uint8Array(bits);
};

const hashPasswordPbkdf2 = async (password: string) => {
	const salt = crypto.getRandomValues(new Uint8Array(PASSWORD_SALT_BYTES));
	const key = await derivePbkdf2Key(password, salt, PASSWORD_ITERATIONS);
	return `${PASSWORD_PREFIX}$${PASSWORD_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(key)}`;
};

const verifyPasswordPbkdf2 = async ({ hash, password }: { hash: string; password: string }) => {
	if (!hash.startsWith(`${PASSWORD_PREFIX}$`)) {
		return verifyLegacyPassword({ hash, password });
	}

	const parts = hash.split('$');
	if (parts.length !== 4) return false;

	const iterations = Number(parts[1]);
	if (!Number.isFinite(iterations) || iterations <= 0) return false;

	const salt = base64ToBytes(parts[2]);
	const expected = base64ToBytes(parts[3]);
	const derived = await derivePbkdf2Key(password, salt, iterations);
	return timingSafeEqual(derived, expected);
};

export function createAuth(db: DrizzleD1Database<Schema> | BetterSQLite3Database<Schema>) {
	return betterAuth({
		database: drizzleAdapter(db, {
			schema,
			provider: 'sqlite'
		}),

		emailAndPassword: {
			enabled: true,
			requireEmailVerification: true, //メールを検証するまでsigninできない
			password: {
				hash: hashPasswordPbkdf2,
				verify: verifyPasswordPbkdf2
			}
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
