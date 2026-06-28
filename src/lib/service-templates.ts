import type { AppLocale, CancellationMethod, SubscriptionCurrency } from '$lib/constant';
import type { SubscriptionColor } from '$lib/subscription-colors';

export type ServiceTemplateCategory = 'video' | 'music' | 'shopping' | 'cloud' | 'ai';
export type TemplateBillingCycle = 'monthly' | 'quarterly' | 'yearly';

type LocalizedText = Record<AppLocale, string>;

export type ServiceTemplatePriceRegion = 'JP' | 'US' | 'DE' | 'GB';

export type ServiceTemplatePlanPrice = {
	amount: number;
	currency: SubscriptionCurrency;
	region: ServiceTemplatePriceRegion;
	sourceUrl: string;
	verifiedAt: string;
};

export type ServiceTemplatePlan = {
	id: string;
	name: LocalizedText;
	prices: ServiceTemplatePlanPrice[];
	cycle: TemplateBillingCycle;
	note?: LocalizedText;
};

export type ServiceTemplate = {
	id: string;
	name: string;
	category: ServiceTemplateCategory;
	color: SubscriptionColor;
	tags: Record<AppLocale, string[]>;
	sourceUrl: string;
	lastVerifiedAt: string;
	plans: ServiceTemplatePlan[];
	cancellation: {
		method: CancellationMethod;
		url?: string;
		memo: LocalizedText;
		deadlineMemo?: LocalizedText;
	};
};

const verifiedAt = '2026-06-23';
const foreignPriceVerifiedAt = '2026-06-28';

const templatePrice = (
	amount: number,
	currency: SubscriptionCurrency,
	region: ServiceTemplatePriceRegion,
	sourceUrl: string,
	priceVerifiedAt = foreignPriceVerifiedAt
): ServiceTemplatePlanPrice => ({
	amount,
	currency,
	region,
	sourceUrl,
	verifiedAt: priceVerifiedAt
});

const jpyPrice = (amount: number, sourceUrl: string): ServiceTemplatePlanPrice =>
	templatePrice(amount, 'JPY', 'JP', sourceUrl, verifiedAt);

export const serviceTemplates: ServiceTemplate[] = [
	{
		id: 'netflix',
		name: 'Netflix',
		category: 'video',
		color: 'red',
		tags: {
			ja: ['動画', 'エンタメ'],
			en: ['Video', 'Entertainment']
		},
		sourceUrl: 'https://www.netflix.com/jp/',
		lastVerifiedAt: verifiedAt,
		plans: [
			{
				id: 'standard-with-ads',
				name: { ja: '広告つきプラン', en: 'Ad-supported plan' },
				prices: [
					jpyPrice(890, 'https://www.netflix.com/jp/'),
					templatePrice(4.99, 'EUR', 'DE', 'https://www.netflix.com/de-en/'),
					templatePrice(5.99, 'GBP', 'GB', 'https://www.netflix.com/gb/')
				],
				cycle: 'monthly',
				note: {
					ja: '公式ページで確認できる最低価格です。',
					en: 'Lowest price shown on the official page.'
				}
			},
			{
				id: 'custom',
				name: { ja: '自分で入力', en: 'Enter manually' },
				prices: [],
				cycle: 'monthly'
			}
		],
		cancellation: {
			method: 'web',
			url: 'https://www.netflix.com/account',
			memo: {
				ja: 'Netflixのアカウントページからメンバーシップ管理を確認します。パートナー経由で請求されている場合は、支払い元の案内に従ってください。',
				en: 'Open the Netflix account page and review membership settings. If billing is handled by a partner, follow the billing provider instructions.'
			}
		}
	},
	{
		id: 'youtube-premium',
		name: 'YouTube Premium',
		category: 'video',
		color: 'red',
		tags: {
			ja: ['動画', '音楽'],
			en: ['Video', 'Music']
		},
		sourceUrl: 'https://www.youtube.com/premium?gl=JP&hl=ja',
		lastVerifiedAt: verifiedAt,
		plans: [
			{
				id: 'custom',
				name: { ja: '自分で入力', en: 'Enter manually' },
				prices: [],
				cycle: 'monthly',
				note: {
					ja: '請求元やプランで料金が変わるため、実際の請求額を入力してください。',
					en: 'Enter the actual charge because pricing can vary by plan and billing provider.'
				}
			}
		],
		cancellation: {
			method: 'web',
			url: 'https://www.youtube.com/paid_memberships',
			memo: {
				ja: 'YouTubeの有料メンバーシップ管理ページから対象メンバーシップを確認します。Apple経由などの場合は請求元で解約してください。',
				en: 'Open YouTube paid memberships and review the target membership. If billed through Apple or another provider, cancel with that billing provider.'
			}
		}
	},
	{
		id: 'amazon-prime',
		name: 'Amazon Prime',
		category: 'shopping',
		color: 'orange',
		tags: {
			ja: ['買い物', '動画'],
			en: ['Shopping', 'Video']
		},
		sourceUrl: 'https://www.amazon.co.jp/amazonprime',
		lastVerifiedAt: verifiedAt,
		plans: [
			{
				id: 'custom',
				name: { ja: '自分で入力', en: 'Enter manually' },
				prices: [],
				cycle: 'monthly'
			}
		],
		cancellation: {
			method: 'web',
			url: 'https://www.amazon.co.jp/gp/primecentral',
			memo: {
				ja: 'Amazon Prime会員情報の管理ページから会員資格を確認します。実際の請求額はアカウントの表示に合わせて入力してください。',
				en: 'Open Amazon Prime membership management and review your membership. Enter the actual charge shown in your account.'
			}
		}
	},
	{
		id: 'spotify',
		name: 'Spotify',
		category: 'music',
		color: 'green',
		tags: {
			ja: ['音楽'],
			en: ['Music']
		},
		sourceUrl: 'https://www.spotify.com/jp/premium/',
		lastVerifiedAt: verifiedAt,
		plans: [
			{
				id: 'standard',
				name: { ja: 'Premium Standard', en: 'Premium Standard' },
				prices: [
					jpyPrice(1080, 'https://www.spotify.com/jp/premium/'),
					templatePrice(12.99, 'USD', 'US', 'https://www.spotify.com/us/premium/'),
					templatePrice(12.99, 'EUR', 'DE', 'https://www.spotify.com/de-en/premium/'),
					templatePrice(12.99, 'GBP', 'GB', 'https://www.spotify.com/uk/premium/')
				],
				cycle: 'monthly'
			},
			{
				id: 'student',
				name: { ja: 'Premium Student', en: 'Premium Student' },
				prices: [
					jpyPrice(580, 'https://www.spotify.com/jp/premium/'),
					templatePrice(6.99, 'USD', 'US', 'https://www.spotify.com/us/premium/'),
					templatePrice(6.99, 'EUR', 'DE', 'https://www.spotify.com/de-en/premium/'),
					templatePrice(5.99, 'GBP', 'GB', 'https://www.spotify.com/uk/premium/')
				],
				cycle: 'monthly'
			},
			{
				id: 'duo',
				name: { ja: 'Premium Duo', en: 'Premium Duo' },
				prices: [
					jpyPrice(1480, 'https://www.spotify.com/jp/premium/'),
					templatePrice(18.99, 'USD', 'US', 'https://www.spotify.com/us/premium/'),
					templatePrice(17.99, 'EUR', 'DE', 'https://www.spotify.com/de-en/premium/'),
					templatePrice(17.99, 'GBP', 'GB', 'https://www.spotify.com/uk/premium/')
				],
				cycle: 'monthly'
			},
			{
				id: 'family',
				name: { ja: 'Premium Family', en: 'Premium Family' },
				prices: [
					jpyPrice(1880, 'https://www.spotify.com/jp/premium/'),
					templatePrice(21.99, 'USD', 'US', 'https://www.spotify.com/us/premium/'),
					templatePrice(21.99, 'EUR', 'DE', 'https://www.spotify.com/de-en/premium/'),
					templatePrice(21.99, 'GBP', 'GB', 'https://www.spotify.com/uk/premium/')
				],
				cycle: 'monthly'
			}
		],
		cancellation: {
			method: 'web',
			url: 'https://www.spotify.com/account/subscription/',
			memo: {
				ja: 'Spotifyのアカウント情報ページからPremiumプランを確認します。',
				en: 'Open the Spotify account page and review your Premium plan.'
			}
		}
	},
	{
		id: 'apple-music',
		name: 'Apple Music',
		category: 'music',
		color: 'purple',
		tags: {
			ja: ['音楽'],
			en: ['Music']
		},
		sourceUrl: 'https://www.apple.com/jp/apple-music/',
		lastVerifiedAt: verifiedAt,
		plans: [
			{
				id: 'individual',
				name: { ja: '個人', en: 'Individual' },
				prices: [
					jpyPrice(1080, 'https://www.apple.com/jp/apple-music/'),
					templatePrice(10.99, 'USD', 'US', 'https://www.apple.com/apple-music/'),
					templatePrice(10.99, 'EUR', 'DE', 'https://www.apple.com/de/apple-music/'),
					templatePrice(10.99, 'GBP', 'GB', 'https://www.apple.com/uk/apple-music/')
				],
				cycle: 'monthly'
			},
			{
				id: 'family',
				name: { ja: 'ファミリー', en: 'Family' },
				prices: [
					jpyPrice(1680, 'https://www.apple.com/jp/apple-music/'),
					templatePrice(16.99, 'USD', 'US', 'https://www.apple.com/apple-music/'),
					templatePrice(16.99, 'EUR', 'DE', 'https://www.apple.com/de/apple-music/'),
					templatePrice(16.99, 'GBP', 'GB', 'https://www.apple.com/uk/apple-music/')
				],
				cycle: 'monthly'
			},
			{
				id: 'student',
				name: { ja: '学生', en: 'Student' },
				prices: [
					jpyPrice(580, 'https://www.apple.com/jp/apple-music/'),
					templatePrice(5.99, 'USD', 'US', 'https://www.apple.com/apple-music/'),
					templatePrice(5.99, 'EUR', 'DE', 'https://www.apple.com/de/apple-music/'),
					templatePrice(5.99, 'GBP', 'GB', 'https://www.apple.com/uk/apple-music/')
				],
				cycle: 'monthly'
			}
		],
		cancellation: {
			method: 'app_store',
			url: 'https://apps.apple.com/account/subscriptions',
			memo: {
				ja: 'Apple IDのサブスクリプション管理からApple Musicを確認します。',
				en: 'Open Apple ID subscription management and review Apple Music.'
			}
		}
	},
	{
		id: 'disney-plus',
		name: 'Disney+',
		category: 'video',
		color: 'blue',
		tags: {
			ja: ['動画', 'エンタメ'],
			en: ['Video', 'Entertainment']
		},
		sourceUrl: 'https://www.disneyplus.com/ja-jp',
		lastVerifiedAt: verifiedAt,
		plans: [
			{
				id: 'standard-with-ads-monthly',
				name: { ja: 'Standard 広告つき（月額）', en: 'Standard with Ads (Monthly)' },
				prices: [
					templatePrice(11.99, 'USD', 'US', 'https://www.disneyplus.com/en-us'),
					templatePrice(6.99, 'EUR', 'DE', 'https://www.disneyplus.com/de-de'),
					templatePrice(5.99, 'GBP', 'GB', 'https://www.disneyplus.com/en-gb')
				],
				cycle: 'monthly'
			},
			{
				id: 'standard-monthly',
				name: { ja: 'Standard（月額）', en: 'Standard (Monthly)' },
				prices: [
					jpyPrice(1250, 'https://www.disneyplus.com/ja-jp'),
					templatePrice(10.99, 'EUR', 'DE', 'https://www.disneyplus.com/de-de'),
					templatePrice(9.99, 'GBP', 'GB', 'https://www.disneyplus.com/en-gb')
				],
				cycle: 'monthly'
			},
			{
				id: 'standard-yearly',
				name: { ja: 'Standard（年額）', en: 'Standard (Yearly)' },
				prices: [
					jpyPrice(12500, 'https://www.disneyplus.com/ja-jp'),
					templatePrice(109.9, 'EUR', 'DE', 'https://www.disneyplus.com/de-de'),
					templatePrice(99.9, 'GBP', 'GB', 'https://www.disneyplus.com/en-gb')
				],
				cycle: 'yearly'
			},
			{
				id: 'premium-monthly',
				name: { ja: 'Premium（月額）', en: 'Premium (Monthly)' },
				prices: [
					jpyPrice(1670, 'https://www.disneyplus.com/ja-jp'),
					templatePrice(18.99, 'USD', 'US', 'https://www.disneyplus.com/en-us'),
					templatePrice(15.99, 'EUR', 'DE', 'https://www.disneyplus.com/de-de'),
					templatePrice(14.99, 'GBP', 'GB', 'https://www.disneyplus.com/en-gb')
				],
				cycle: 'monthly'
			},
			{
				id: 'premium-yearly',
				name: { ja: 'Premium（年額）', en: 'Premium (Yearly)' },
				prices: [
					jpyPrice(16700, 'https://www.disneyplus.com/ja-jp'),
					templatePrice(189.99, 'USD', 'US', 'https://www.disneyplus.com/en-us'),
					templatePrice(159.9, 'EUR', 'DE', 'https://www.disneyplus.com/de-de'),
					templatePrice(149.9, 'GBP', 'GB', 'https://www.disneyplus.com/en-gb')
				],
				cycle: 'yearly'
			},
			{
				id: 'custom',
				name: { ja: '自分で入力', en: 'Enter manually' },
				prices: [],
				cycle: 'monthly'
			}
		],
		cancellation: {
			method: 'web',
			url: 'https://www.disneyplus.com/account/subscription',
			memo: {
				ja: 'Disney+のアカウント管理ページからサブスクリプションを確認します。App StoreやGoogle Play経由の場合は請求元で確認してください。',
				en: 'Open Disney+ account management and review your subscription. If billed through App Store or Google Play, check that billing provider.'
			}
		}
	},
	{
		id: 'u-next',
		name: 'U-NEXT',
		category: 'video',
		color: 'orange',
		tags: {
			ja: ['動画'],
			en: ['Video']
		},
		sourceUrl: 'https://video.unext.jp/',
		lastVerifiedAt: verifiedAt,
		plans: [
			{
				id: 'custom',
				name: { ja: '自分で入力', en: 'Enter manually' },
				prices: [],
				cycle: 'monthly'
			}
		],
		cancellation: {
			method: 'web',
			url: 'https://account.unext.jp/',
			memo: {
				ja: 'U-NEXTのアカウント管理ページから契約内容を確認します。利用状況や登録経路によって解約方法が異なる場合があります。',
				en: 'Open U-NEXT account management and review your contract. Cancellation steps can vary by account and sign-up path.'
			}
		}
	},
	{
		id: 'icloud-plus',
		name: 'iCloud+',
		category: 'cloud',
		color: 'blue',
		tags: {
			ja: ['クラウド'],
			en: ['Cloud']
		},
		sourceUrl: 'https://support.apple.com/ja-jp/108047',
		lastVerifiedAt: verifiedAt,
		plans: [
			{
				id: '50gb',
				name: { ja: '50GB', en: '50GB' },
				prices: [
					jpyPrice(150, 'https://support.apple.com/ja-jp/108047'),
					templatePrice(0.99, 'USD', 'US', 'https://support.apple.com/en-us/108047'),
					templatePrice(0.99, 'EUR', 'DE', 'https://support.apple.com/de-de/108047'),
					templatePrice(0.99, 'GBP', 'GB', 'https://support.apple.com/en-gb/108047')
				],
				cycle: 'monthly'
			},
			{
				id: '200gb',
				name: { ja: '200GB', en: '200GB' },
				prices: [
					jpyPrice(450, 'https://support.apple.com/ja-jp/108047'),
					templatePrice(2.99, 'USD', 'US', 'https://support.apple.com/en-us/108047'),
					templatePrice(2.99, 'EUR', 'DE', 'https://support.apple.com/de-de/108047'),
					templatePrice(2.99, 'GBP', 'GB', 'https://support.apple.com/en-gb/108047')
				],
				cycle: 'monthly'
			},
			{
				id: '2tb',
				name: { ja: '2TB', en: '2TB' },
				prices: [
					jpyPrice(1500, 'https://support.apple.com/ja-jp/108047'),
					templatePrice(9.99, 'USD', 'US', 'https://support.apple.com/en-us/108047'),
					templatePrice(9.99, 'EUR', 'DE', 'https://support.apple.com/de-de/108047'),
					templatePrice(8.99, 'GBP', 'GB', 'https://support.apple.com/en-gb/108047')
				],
				cycle: 'monthly'
			},
			{
				id: '6tb',
				name: { ja: '6TB', en: '6TB' },
				prices: [
					jpyPrice(4500, 'https://support.apple.com/ja-jp/108047'),
					templatePrice(29.99, 'USD', 'US', 'https://support.apple.com/en-us/108047'),
					templatePrice(29.99, 'EUR', 'DE', 'https://support.apple.com/de-de/108047'),
					templatePrice(26.99, 'GBP', 'GB', 'https://support.apple.com/en-gb/108047')
				],
				cycle: 'monthly'
			},
			{
				id: '12tb',
				name: { ja: '12TB', en: '12TB' },
				prices: [
					jpyPrice(9000, 'https://support.apple.com/ja-jp/108047'),
					templatePrice(59.99, 'USD', 'US', 'https://support.apple.com/en-us/108047'),
					templatePrice(59.99, 'EUR', 'DE', 'https://support.apple.com/de-de/108047'),
					templatePrice(54.99, 'GBP', 'GB', 'https://support.apple.com/en-gb/108047')
				],
				cycle: 'monthly'
			}
		],
		cancellation: {
			method: 'app_store',
			url: 'https://apps.apple.com/account/subscriptions',
			memo: {
				ja: 'Apple IDのサブスクリプション管理からiCloud+を確認します。',
				en: 'Open Apple ID subscription management and review iCloud+.'
			}
		}
	},
	{
		id: 'google-one',
		name: 'Google One',
		category: 'cloud',
		color: 'green',
		tags: {
			ja: ['クラウド'],
			en: ['Cloud']
		},
		sourceUrl: 'https://one.google.com/about/plans',
		lastVerifiedAt: verifiedAt,
		plans: [
			{
				id: 'custom',
				name: { ja: '自分で入力', en: 'Enter manually' },
				prices: [],
				cycle: 'monthly'
			}
		],
		cancellation: {
			method: 'web',
			url: 'https://one.google.com/settings',
			memo: {
				ja: 'Google Oneの設定ページからメンバーシップや請求を確認します。',
				en: 'Open Google One settings and review your membership and billing.'
			}
		}
	},
	{
		id: 'chatgpt',
		name: 'ChatGPT',
		category: 'ai',
		color: 'purple',
		tags: {
			ja: ['AI', '仕事'],
			en: ['AI', 'Work']
		},
		sourceUrl: 'https://openai.com/chatgpt/pricing/',
		lastVerifiedAt: verifiedAt,
		plans: [
			{
				id: 'plus',
				name: { ja: 'Plus', en: 'Plus' },
				prices: [],
				cycle: 'monthly',
				note: {
					ja: '請求額と通貨はアカウントの表示に合わせて入力してください。',
					en: 'Enter the amount and currency shown in your account.'
				}
			},
			{
				id: 'pro',
				name: { ja: 'Pro', en: 'Pro' },
				prices: [],
				cycle: 'monthly',
				note: {
					ja: '請求額と通貨はアカウントの表示に合わせて入力してください。',
					en: 'Enter the amount and currency shown in your account.'
				}
			}
		],
		cancellation: {
			method: 'web',
			url: 'https://chatgpt.com/#settings/Subscription',
			memo: {
				ja: 'ChatGPTの設定からサブスクリプションを確認します。チームや外部経由の契約は管理者または請求元で確認してください。',
				en: 'Open ChatGPT settings and review the subscription. For team or externally billed plans, check with the admin or billing provider.'
			}
		}
	}
];

export const findServiceTemplate = (id: string | null | undefined) =>
	serviceTemplates.find((template) => template.id === id);

export const getTemplatePlanName = (
	template: ServiceTemplate,
	planId: string | null | undefined,
	locale: AppLocale
) => template.plans.find((plan) => plan.id === planId)?.name[locale] ?? '';

export const getTemplateDisplayName = (template: ServiceTemplate) => template.name;

export const getTemplateTags = (template: ServiceTemplate, locale: AppLocale) =>
	template.tags[locale];
