import { betterAuth } from 'better-auth';
import { stripe } from '@better-auth/stripe';
import Stripe from 'stripe';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { twoFactor } from 'better-auth/plugins/two-factor';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { DEFAULT_LOCALE } from '$lib/constant';
import { isAppLocale, SUBTRACK_LOCALE_COOKIE } from '$lib/locale-routing';
import { parseAdminUserIds } from '$lib/server/admin';
import { handleStripeLifetimeCheckoutEvent } from '$lib/server/stripe-lifetime';
import { PREMIUM_MONTHLY_LOOKUP_KEY, TEST_DAILY_LOOKUP_KEY } from '$lib/server/stripe-products';
import * as schema from './server/db/schema';
type Schema = typeof import('./server/db/schema');

const stripeSecretKey = process.env.SECRET_STRIPE_KEY;
const authBaseUrl =
	process.env.BETTER_AUTH_URL ?? process.env.PUBLIC_BETTER_AUTH_URL ?? process.env.APP_ORIGIN;
const authBasePath = '/api/auth';
type CreateAuthOptions = {
	requestOrigin?: string;
	initialLocale?: string | null;
};
type AuthHookContext = {
	headers?: Headers;
	request?: Request;
	getCookie?: (name: string) => string | null | undefined | Promise<string | null | undefined>;
} | null;

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

const getLocaleFromCookieHeader = (cookieHeader: string | null | undefined) => {
	if (!cookieHeader) return null;

	for (const cookie of cookieHeader.split(';')) {
		const [rawName, ...rawValue] = cookie.trim().split('=');
		if (rawName !== SUBTRACK_LOCALE_COOKIE) continue;

		const value = decodeURIComponent(rawValue.join('='));
		return isAppLocale(value) ? value : null;
	}

	return null;
};

const resolveInitialUserLocale = async (
	initialLocale: string | null | undefined,
	context?: AuthHookContext
) => {
	if (isAppLocale(initialLocale)) return initialLocale;

	const contextCookieLocale = await context?.getCookie?.(SUBTRACK_LOCALE_COOKIE);
	if (isAppLocale(contextCookieLocale)) return contextCookieLocale;

	const cookieLocale = getLocaleFromCookieHeader(
		context?.headers?.get('cookie') ?? context?.request?.headers.get('cookie')
	);
	if (cookieLocale) return cookieLocale;

	try {
		const locale = getRequestEvent()?.cookies.get(SUBTRACK_LOCALE_COOKIE);
		return isAppLocale(locale) ? locale : DEFAULT_LOCALE;
	} catch {
		return DEFAULT_LOCALE;
	}
};
const adminUserIds = parseAdminUserIds(process.env.ADMIN_USER_IDS);
const disableStripePlugin = process.env.E2E_AUTH_DISABLE_STRIPE === 'true';
const createStripeCustomerOnSignUp = process.env.E2E_STRIPE_CREATE_CUSTOMER_ON_SIGNUP !== 'false';

const stripeClient = disableStripePlugin
	? null
	: new Stripe(stripeSecretKey!, {
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
		user: {
			additionalFields: {
				locale: {
					type: 'string',
					required: false,
					input: false,
					defaultValue: DEFAULT_LOCALE
				}
			}
		},
		databaseHooks: {
			user: {
				create: {
					before: async (user, context) => ({
						data: {
							...user,
							locale: await resolveInitialUserLocale(options.initialLocale, context)
						}
					})
				}
			}
		},
		socialProviders: {
			google: {
				prompt: 'select_account',
				clientId: process.env.GOOGLE_CLIENT_ID!,
				clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
				redirectURI: resolveAuthRedirectURI(options.requestOrigin, 'google')
			}
		},

		plugins: [
			admin({
				adminUserIds: adminUserIds.length ? adminUserIds : undefined,
				bannedUserMessage:
					'This account is temporarily locked. Please try again later or contact another administrator.'
			}),
			twoFactor({
				issuer: 'SubTrack'
			}),
			...(stripeClient
				? [
						stripe({
							stripeClient,
							stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
							createCustomerOnSignUp: createStripeCustomerOnSignUp,
							onEvent: async (event) => {
								await handleStripeLifetimeCheckoutEvent(db, event);
							},
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
										lookupKey: PREMIUM_MONTHLY_LOOKUP_KEY,
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
					]
				: []),
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
