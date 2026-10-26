import type { AppLocale, CancellationMethod, SubscriptionCurrency } from '$lib/constant';
import type { SubscriptionColor } from '$lib/subscription-colors';

export type ServiceTemplateCategory =
	| 'video'
	| 'music'
	| 'ai'
	| 'tools'
	| 'storage'
	| 'development'
	| 'design'
	| 'business'
	| 'card'
	| 'shopping'
	| 'other';
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
const serviceExpansionVerifiedAt = '2026-06-29';
const chatGptPriceVerifiedAt = '2026-07-05';
const catalogExpansionVerifiedAt = '2026-10-27';

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

const catalogPrice = (
	amount: number,
	currency: SubscriptionCurrency,
	region: ServiceTemplatePriceRegion,
	sourceUrl: string
): ServiceTemplatePlanPrice =>
	templatePrice(amount, currency, region, sourceUrl, catalogExpansionVerifiedAt);

const catalogJpyPrice = (amount: number, sourceUrl: string): ServiceTemplatePlanPrice =>
	catalogPrice(amount, 'JPY', 'JP', sourceUrl);

const expandedPrice = (
	amount: number,
	currency: SubscriptionCurrency,
	region: ServiceTemplatePriceRegion,
	sourceUrl: string
): ServiceTemplatePlanPrice =>
	templatePrice(amount, currency, region, sourceUrl, serviceExpansionVerifiedAt);

const expandedJpyPrice = (amount: number, sourceUrl: string): ServiceTemplatePlanPrice =>
	expandedPrice(amount, 'JPY', 'JP', sourceUrl);

const perUserPriceNote: LocalizedText = {
	ja: '1ユーザーまたは1席あたりの参考価格です。実際の請求額は席数、契約条件、税の扱いで変わる場合があります。',
	en: 'Reference price per user or seat. The actual charge can vary by seat count, contract terms, and tax treatment.'
};

const dynamicPriceNote: LocalizedText = {
	ja: '公式ページで地域別の通常価格を安定して確認できなかったため、実際の請求額を入力してください。',
	en: 'Enter the actual charge because the official regional recurring price was not stable in the source checked.'
};

const usdReferencePriceNote: LocalizedText = {
	ja: 'USDの参考価格です。実際の請求額、税、通貨はアカウントの表示に合わせて確認してください。',
	en: 'Reference price in USD. Confirm the actual charge, tax, and currency shown in your account.'
};

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
		lastVerifiedAt: catalogExpansionVerifiedAt,
		plans: [
			{
				id: 'standard-with-ads',
				name: { ja: '広告つきプラン', en: 'Ad-supported plan' },
				prices: [
					catalogJpyPrice(890, 'https://www.netflix.com/jp-ja/browse/genre/839338'),
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
				id: 'standard',
				name: { ja: 'スタンダード', en: 'Standard' },
				prices: [catalogJpyPrice(1590, 'https://www.netflix.com/jp-ja/browse/genre/839338')],
				cycle: 'monthly'
			},
			{
				id: 'premium',
				name: { ja: 'プレミアム', en: 'Premium' },
				prices: [catalogJpyPrice(2290, 'https://www.netflix.com/jp-ja/browse/genre/839338')],
				cycle: 'monthly'
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
		lastVerifiedAt: catalogExpansionVerifiedAt,
		plans: [
			{
				id: 'individual-monthly',
				name: { ja: '個人（月払い・Web/Android）', en: 'Individual (monthly, web/Android)' },
				prices: [
					catalogJpyPrice(1280, 'https://store.google.com/jp/magazine/youtube-premium-trial?hl=ja')
				],
				cycle: 'monthly'
			},
			{
				id: 'individual-yearly',
				name: { ja: '個人（年払い）', en: 'Individual (annual)' },
				prices: [
					catalogJpyPrice(12800, 'https://store.google.com/jp/magazine/youtube-premium-trial?hl=ja')
				],
				cycle: 'yearly'
			},
			{
				id: 'family-monthly',
				name: { ja: 'ファミリー（月払い）', en: 'Family (monthly)' },
				prices: [
					catalogJpyPrice(2280, 'https://store.google.com/jp/magazine/youtube-premium-trial?hl=ja')
				],
				cycle: 'monthly'
			},
			{
				id: 'student-monthly',
				name: { ja: '学割（月払い）', en: 'Student (monthly)' },
				prices: [
					catalogJpyPrice(780, 'https://store.google.com/jp/magazine/youtube-premium-trial?hl=ja')
				],
				cycle: 'monthly'
			},
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
		lastVerifiedAt: catalogExpansionVerifiedAt,
		plans: [
			{
				id: 'monthly',
				name: { ja: '通常会員（月払い）', en: 'Prime (monthly)' },
				prices: [
					catalogJpyPrice(
						600,
						'https://www.aboutamazon.jp/news/amazon-prime/prime-membership-seven-benefits'
					)
				],
				cycle: 'monthly'
			},
			{
				id: 'yearly',
				name: { ja: '通常会員（年払い）', en: 'Prime (annual)' },
				prices: [
					catalogJpyPrice(
						5900,
						'https://www.aboutamazon.jp/news/amazon-prime/prime-membership-seven-benefits'
					)
				],
				cycle: 'yearly'
			},
			{
				id: 'student-monthly',
				name: { ja: 'Prime Student（月払い）', en: 'Prime Student (monthly)' },
				prices: [
					catalogJpyPrice(
						300,
						'https://www.aboutamazon.jp/news/amazon-prime/what-are-the-benefits-of-amazon-prime-student'
					)
				],
				cycle: 'monthly'
			},
			{
				id: 'student-yearly',
				name: { ja: 'Prime Student（年払い）', en: 'Prime Student (annual)' },
				prices: [
					catalogJpyPrice(
						2950,
						'https://www.aboutamazon.jp/news/amazon-prime/what-are-the-benefits-of-amazon-prime-student'
					)
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
		lastVerifiedAt: catalogExpansionVerifiedAt,
		plans: [
			{
				id: 'individual',
				name: { ja: '個人', en: 'Individual' },
				prices: [
					catalogJpyPrice(1180, 'https://www.apple.com/jp/apple-music/'),
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
					catalogJpyPrice(1980, 'https://www.apple.com/jp/apple-music/'),
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
					catalogJpyPrice(680, 'https://www.apple.com/jp/apple-music/'),
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
		lastVerifiedAt: catalogExpansionVerifiedAt,
		plans: [
			{
				id: 'monthly-web',
				name: { ja: '月額プラン（Web登録）', en: 'Monthly plan (web)' },
				prices: [catalogJpyPrice(2189, 'https://help.unext.jp/guide/detail/price-description')],
				cycle: 'monthly'
			},
			{
				id: 'monthly-app',
				name: { ja: '月額プラン（アプリ登録）', en: 'Monthly plan (in-app)' },
				prices: [catalogJpyPrice(2400, 'https://help.unext.jp/guide/detail/types-of-service-plan')],
				cycle: 'monthly'
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
		category: 'storage',
		color: 'blue',
		tags: {
			ja: ['クラウド'],
			en: ['Cloud']
		},
		sourceUrl: 'https://support.apple.com/ja-jp/108047',
		lastVerifiedAt: catalogExpansionVerifiedAt,
		plans: [
			{
				id: '50gb',
				name: { ja: '50GB', en: '50GB' },
				prices: [
					catalogJpyPrice(180, 'https://support.apple.com/ja-jp/108047'),
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
					catalogJpyPrice(540, 'https://support.apple.com/ja-jp/108047'),
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
					catalogJpyPrice(1800, 'https://support.apple.com/ja-jp/108047'),
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
					catalogJpyPrice(5500, 'https://support.apple.com/ja-jp/108047'),
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
					catalogJpyPrice(11000, 'https://support.apple.com/ja-jp/108047'),
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
		category: 'storage',
		color: 'green',
		tags: {
			ja: ['クラウド'],
			en: ['Cloud']
		},
		sourceUrl: 'https://one.google.com/about/plans',
		lastVerifiedAt: serviceExpansionVerifiedAt,
		plans: [
			{
				id: 'basic-100gb-monthly',
				name: { ja: 'Basic 100GB（月額）', en: 'Basic 100GB (Monthly)' },
				prices: [expandedJpyPrice(290, 'https://one.google.com/about/plans')],
				cycle: 'monthly'
			},
			{
				id: 'basic-100gb-yearly',
				name: { ja: 'Basic 100GB（年額）', en: 'Basic 100GB (Yearly)' },
				prices: [expandedJpyPrice(2900, 'https://one.google.com/about/plans')],
				cycle: 'yearly'
			},
			{
				id: 'google-ai-plus-2tb-monthly',
				name: { ja: 'Google AI Plus 2TB（月額）', en: 'Google AI Plus 2TB (Monthly)' },
				prices: [expandedJpyPrice(1450, 'https://one.google.com/about/plans')],
				cycle: 'monthly'
			},
			{
				id: 'google-ai-plus-2tb-yearly',
				name: { ja: 'Google AI Plus 2TB（年額）', en: 'Google AI Plus 2TB (Yearly)' },
				prices: [expandedJpyPrice(14500, 'https://one.google.com/about/plans')],
				cycle: 'yearly'
			},
			{
				id: 'google-ai-pro-5tb-monthly',
				name: { ja: 'Google AI Pro 5TB（月額）', en: 'Google AI Pro 5TB (Monthly)' },
				prices: [expandedJpyPrice(2900, 'https://one.google.com/about/plans')],
				cycle: 'monthly'
			},
			{
				id: 'google-ai-pro-5tb-yearly',
				name: { ja: 'Google AI Pro 5TB（年額）', en: 'Google AI Pro 5TB (Yearly)' },
				prices: [expandedJpyPrice(29000, 'https://one.google.com/about/plans')],
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
			url: 'https://one.google.com/settings',
			memo: {
				ja: 'Google Oneの設定ページからメンバーシップや請求を確認します。',
				en: 'Open Google One settings and review your membership and billing.'
			}
		}
	},
	{
		id: 'notion',
		name: 'Notion',
		category: 'tools',
		color: 'purple',
		tags: {
			ja: ['仕事', 'ツール'],
			en: ['Work', 'Tools']
		},
		sourceUrl: 'https://www.notion.com/pricing',
		lastVerifiedAt: serviceExpansionVerifiedAt,
		plans: [
			{
				id: 'plus-1-member-monthly',
				name: { ja: 'Plus（1メンバー/月額）', en: 'Plus (1 member monthly)' },
				prices: [
					expandedJpyPrice(2000, 'https://www.notion.com/pricing'),
					expandedPrice(12, 'USD', 'US', 'https://www.notion.com/pricing')
				],
				cycle: 'monthly',
				note: perUserPriceNote
			},
			{
				id: 'plus-1-member-yearly',
				name: { ja: 'Plus（1メンバー/年額）', en: 'Plus (1 member yearly)' },
				prices: [
					expandedJpyPrice(19800, 'https://www.notion.com/pricing'),
					expandedPrice(120, 'USD', 'US', 'https://www.notion.com/pricing')
				],
				cycle: 'yearly',
				note: perUserPriceNote
			},
			{
				id: 'business-1-member-monthly',
				name: { ja: 'Business（1メンバー/月額）', en: 'Business (1 member monthly)' },
				prices: [
					expandedJpyPrice(3800, 'https://www.notion.com/pricing'),
					expandedPrice(24, 'USD', 'US', 'https://www.notion.com/pricing')
				],
				cycle: 'monthly',
				note: perUserPriceNote
			},
			{
				id: 'business-1-member-yearly',
				name: { ja: 'Business（1メンバー/年額）', en: 'Business (1 member yearly)' },
				prices: [
					expandedJpyPrice(37800, 'https://www.notion.com/pricing'),
					expandedPrice(240, 'USD', 'US', 'https://www.notion.com/pricing')
				],
				cycle: 'yearly',
				note: perUserPriceNote
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
			url: 'https://www.notion.com/settings/billing',
			memo: {
				ja: 'Notionの設定から対象ワークスペースの請求設定を確認します。ワークスペースや権限によって表示される設定が異なる場合があります。',
				en: 'Open Notion settings and review billing for the target workspace. Available settings can vary by workspace and permissions.'
			}
		}
	},
	{
		id: 'figma',
		name: 'Figma',
		category: 'design',
		color: 'yellow',
		tags: {
			ja: ['デザイン', '仕事'],
			en: ['Design', 'Work']
		},
		sourceUrl: 'https://www.figma.com/pricing/',
		lastVerifiedAt: serviceExpansionVerifiedAt,
		plans: [
			{
				id: 'professional-full-seat-monthly',
				name: {
					ja: 'Professional Full seat（1席/月額）',
					en: 'Professional Full seat (1 seat monthly)'
				},
				prices: [expandedPrice(16, 'USD', 'US', 'https://www.figma.com/pricing/')],
				cycle: 'monthly',
				note: perUserPriceNote
			},
			{
				id: 'organization-full-seat',
				name: {
					ja: 'Organization Full seat（1席）',
					en: 'Organization Full seat (1 seat)'
				},
				prices: [],
				cycle: 'monthly',
				note: {
					ja: '公式ページでは年払いの月額表示として確認したため、実際の請求額を入力してください。',
					en: 'Enter the actual charge because the official page showed this as a monthly display for annual billing.'
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
			url: 'https://www.figma.com/settings',
			memo: {
				ja: 'Figmaの管理画面から対象チームまたは組織の請求設定を確認します。プランや権限によっては管理者操作が必要です。',
				en: 'Open the Figma admin area and review billing for the target team or organization. Some plans require admin permissions.'
			}
		}
	},
	{
		id: 'adobe-creative-cloud',
		name: 'Adobe Creative Cloud',
		category: 'design',
		color: 'orange',
		tags: {
			ja: ['制作', 'デザイン'],
			en: ['Creative', 'Design']
		},
		sourceUrl: 'https://www.adobe.com/creativecloud/plans.html',
		lastVerifiedAt: serviceExpansionVerifiedAt,
		plans: [
			{
				id: 'all-apps-individual',
				name: { ja: 'コンプリートプラン（個人）', en: 'All Apps (Individual)' },
				prices: [],
				cycle: 'monthly',
				note: dynamicPriceNote
			},
			{
				id: 'all-apps-teams-1-license',
				name: {
					ja: 'コンプリートプラン法人版（1ライセンス）',
					en: 'All Apps for teams (1 license)'
				},
				prices: [],
				cycle: 'monthly',
				note: dynamicPriceNote
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
			url: 'https://account.adobe.com/plans',
			memo: {
				ja: 'Adobeアカウントのプラン管理から契約内容を確認します。法人契約は管理者または契約元で確認してください。',
				en: 'Open Adobe account plan management and review your subscription. For team contracts, check with the admin or billing owner.'
			}
		}
	},
	{
		id: 'canva',
		name: 'Canva',
		category: 'design',
		color: 'purple',
		tags: {
			ja: ['デザイン', '制作'],
			en: ['Design', 'Creative']
		},
		sourceUrl: 'https://www.canva.com/pricing/',
		lastVerifiedAt: serviceExpansionVerifiedAt,
		plans: [
			{
				id: 'pro-monthly',
				name: { ja: 'Pro（月額）', en: 'Pro (Monthly)' },
				prices: [],
				cycle: 'monthly',
				note: dynamicPriceNote
			},
			{
				id: 'teams-1-user-monthly',
				name: { ja: 'Teams（1ユーザー/月額）', en: 'Teams (1 user monthly)' },
				prices: [],
				cycle: 'monthly',
				note: perUserPriceNote
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
			url: 'https://www.canva.com/settings/billing',
			memo: {
				ja: 'Canvaの設定から請求とプランを確認します。チーム契約はチームの管理者権限が必要な場合があります。',
				en: 'Open Canva billing settings and review your plan. Team subscriptions may require team admin permissions.'
			}
		}
	},
	{
		id: 'dropbox',
		name: 'Dropbox',
		category: 'storage',
		color: 'blue',
		tags: {
			ja: ['クラウド', '仕事'],
			en: ['Cloud', 'Work']
		},
		sourceUrl: 'https://www.dropbox.com/plans',
		lastVerifiedAt: serviceExpansionVerifiedAt,
		plans: [
			{
				id: 'plus-monthly',
				name: { ja: 'Plus（月額）', en: 'Plus (Monthly)' },
				prices: [expandedJpyPrice(1200, 'https://www.dropbox.com/plans')],
				cycle: 'monthly'
			},
			{
				id: 'standard-1-user-monthly',
				name: { ja: 'Standard（1ユーザー/月額）', en: 'Standard (1 user monthly)' },
				prices: [expandedJpyPrice(1500, 'https://www.dropbox.com/plans')],
				cycle: 'monthly',
				note: perUserPriceNote
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
			url: 'https://www.dropbox.com/account/billing',
			memo: {
				ja: 'Dropboxのアカウント請求ページからプランと請求状況を確認します。チーム契約は管理者ページで確認してください。',
				en: 'Open Dropbox account billing and review your plan. Team subscriptions should be checked in the admin area.'
			}
		}
	},
	{
		id: 'microsoft-365',
		name: 'Microsoft 365',
		category: 'tools',
		color: 'blue',
		tags: {
			ja: ['仕事', 'ツール'],
			en: ['Work', 'Tools']
		},
		sourceUrl:
			'https://www.microsoft.com/ja-jp/microsoft-365/buy/compare-all-microsoft-365-products',
		lastVerifiedAt: serviceExpansionVerifiedAt,
		plans: [
			{
				id: 'personal-monthly',
				name: { ja: 'Personal（月額）', en: 'Personal (Monthly)' },
				prices: [
					expandedJpyPrice(
						2130,
						'https://www.microsoft.com/ja-jp/microsoft-365/buy/compare-all-microsoft-365-products'
					),
					expandedPrice(
						9.99,
						'USD',
						'US',
						'https://www.microsoft.com/en-us/microsoft-365/buy/compare-all-microsoft-365-products'
					)
				],
				cycle: 'monthly'
			},
			{
				id: 'personal-yearly',
				name: { ja: 'Personal（年額）', en: 'Personal (Yearly)' },
				prices: [
					expandedPrice(
						99.99,
						'USD',
						'US',
						'https://www.microsoft.com/en-us/microsoft-365/buy/compare-all-microsoft-365-products'
					)
				],
				cycle: 'yearly'
			},
			{
				id: 'business-standard-1-user-monthly',
				name: {
					ja: 'Business Standard（1ユーザー/月額）',
					en: 'Business Standard (1 user monthly)'
				},
				prices: [
					expandedJpyPrice(
						2249,
						'https://www.microsoft.com/ja-jp/microsoft-365/business/compare-all-microsoft-365-business-products'
					),
					expandedPrice(
						15,
						'USD',
						'US',
						'https://www.microsoft.com/en-us/microsoft-365/business/compare-all-microsoft-365-business-products'
					)
				],
				cycle: 'monthly',
				note: perUserPriceNote
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
			url: 'https://account.microsoft.com/services',
			memo: {
				ja: 'Microsoftアカウントのサービスとサブスクリプションから契約を確認します。法人契約はMicrosoft 365管理センターで確認してください。',
				en: 'Open Microsoft account services and subscriptions. Business subscriptions should be reviewed in the Microsoft 365 admin center.'
			}
		}
	},
	{
		id: 'google-workspace',
		name: 'Google Workspace',
		category: 'business',
		color: 'green',
		tags: {
			ja: ['仕事', 'ツール'],
			en: ['Work', 'Tools']
		},
		sourceUrl: 'https://workspace.google.com/intl/ja/pricing.html',
		lastVerifiedAt: serviceExpansionVerifiedAt,
		plans: [
			{
				id: 'business-starter-1-user-monthly',
				name: {
					ja: 'Business Starter（1ユーザー/月額）',
					en: 'Business Starter (1 user monthly)'
				},
				prices: [expandedJpyPrice(800, 'https://workspace.google.com/intl/ja/pricing.html')],
				cycle: 'monthly',
				note: perUserPriceNote
			},
			{
				id: 'business-starter-1-user-yearly',
				name: {
					ja: 'Business Starter（1ユーザー/年額）',
					en: 'Business Starter (1 user yearly)'
				},
				prices: [expandedJpyPrice(9600, 'https://workspace.google.com/pricing.html')],
				cycle: 'yearly',
				note: perUserPriceNote
			},
			{
				id: 'business-standard-1-user-monthly',
				name: {
					ja: 'Business Standard（1ユーザー/月額）',
					en: 'Business Standard (1 user monthly)'
				},
				prices: [expandedJpyPrice(1600, 'https://workspace.google.com/intl/ja/pricing.html')],
				cycle: 'monthly',
				note: perUserPriceNote
			},
			{
				id: 'business-standard-1-user-yearly',
				name: {
					ja: 'Business Standard（1ユーザー/年額）',
					en: 'Business Standard (1 user yearly)'
				},
				prices: [expandedJpyPrice(19200, 'https://workspace.google.com/pricing.html')],
				cycle: 'yearly',
				note: perUserPriceNote
			},
			{
				id: 'business-plus-1-user-monthly',
				name: {
					ja: 'Business Plus（1ユーザー/月額）',
					en: 'Business Plus (1 user monthly)'
				},
				prices: [expandedJpyPrice(2500, 'https://workspace.google.com/pricing.html')],
				cycle: 'monthly',
				note: perUserPriceNote
			},
			{
				id: 'business-plus-1-user-yearly',
				name: {
					ja: 'Business Plus（1ユーザー/年額）',
					en: 'Business Plus (1 user yearly)'
				},
				prices: [expandedJpyPrice(30000, 'https://workspace.google.com/pricing.html')],
				cycle: 'yearly',
				note: perUserPriceNote
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
			url: 'https://admin.google.com/ac/billing',
			memo: {
				ja: 'Google管理コンソールの請求ページから契約を確認します。管理者権限が必要です。',
				en: 'Open billing in the Google Admin console. Admin permissions are required.'
			}
		}
	},
	{
		id: 'slack',
		name: 'Slack',
		category: 'business',
		color: 'green',
		tags: {
			ja: ['仕事', 'コミュニケーション'],
			en: ['Work', 'Communication']
		},
		sourceUrl: 'https://slack.com/intl/ja-jp/pricing',
		lastVerifiedAt: serviceExpansionVerifiedAt,
		plans: [
			{
				id: 'pro-1-user-monthly',
				name: { ja: 'プロ（1ユーザー/月額）', en: 'Pro (1 user monthly)' },
				prices: [expandedJpyPrice(1050, 'https://slack.com/intl/ja-jp/pricing')],
				cycle: 'monthly',
				note: perUserPriceNote
			},
			{
				id: 'business-plus-1-user-monthly',
				name: {
					ja: 'ビジネスプラス（1ユーザー/月額）',
					en: 'Business+ (1 user monthly)'
				},
				prices: [expandedJpyPrice(2160, 'https://slack.com/intl/ja-jp/pricing')],
				cycle: 'monthly',
				note: perUserPriceNote
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
			url: 'https://slack.com/account/billing',
			memo: {
				ja: 'Slackのワークスペース請求設定からプランを確認します。ワークスペース管理者またはオーナー権限が必要な場合があります。',
				en: 'Open Slack workspace billing settings and review the plan. Workspace admin or owner permissions may be required.'
			}
		}
	},
	{
		id: 'zoom',
		name: 'Zoom',
		category: 'business',
		color: 'blue',
		tags: {
			ja: ['仕事', '会議'],
			en: ['Work', 'Meetings']
		},
		sourceUrl: 'https://www.zoom.com/pricing',
		lastVerifiedAt: serviceExpansionVerifiedAt,
		plans: [
			{
				id: 'pro-monthly',
				name: { ja: 'Pro（月額）', en: 'Pro (Monthly)' },
				prices: [],
				cycle: 'monthly',
				note: dynamicPriceNote
			},
			{
				id: 'business-1-user-monthly',
				name: { ja: 'Business（1ユーザー/月額）', en: 'Business (1 user monthly)' },
				prices: [],
				cycle: 'monthly',
				note: dynamicPriceNote
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
			url: 'https://zoom.us/billing',
			memo: {
				ja: 'Zoomの請求ページから現在のプランを確認します。組織契約は管理者権限が必要な場合があります。',
				en: 'Open Zoom billing and review the current plan. Organization subscriptions may require admin permissions.'
			}
		}
	},
	{
		id: 'github',
		name: 'GitHub',
		category: 'development',
		color: 'purple',
		tags: {
			ja: ['開発', '仕事'],
			en: ['Development', 'Work']
		},
		sourceUrl: 'https://github.com/pricing',
		lastVerifiedAt: serviceExpansionVerifiedAt,
		plans: [
			{
				id: 'team-1-user-monthly',
				name: { ja: 'Team（1ユーザー/月額）', en: 'Team (1 user monthly)' },
				prices: [expandedPrice(4, 'USD', 'US', 'https://github.com/pricing')],
				cycle: 'monthly',
				note: perUserPriceNote
			},
			{
				id: 'enterprise-1-user-monthly',
				name: { ja: 'Enterprise（1ユーザー/月額）', en: 'Enterprise (1 user monthly)' },
				prices: [expandedPrice(21, 'USD', 'US', 'https://github.com/pricing')],
				cycle: 'monthly',
				note: perUserPriceNote
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
			url: 'https://github.com/settings/billing/summary',
			memo: {
				ja: 'GitHubの請求設定から個人または組織のプランを確認します。組織契約は対象Organizationの管理権限が必要です。',
				en: 'Open GitHub billing settings and review the personal or organization plan. Organization subscriptions require admin permissions for the target organization.'
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
		lastVerifiedAt: chatGptPriceVerifiedAt,
		plans: [
			{
				id: 'plus',
				name: { ja: 'Plus', en: 'Plus' },
				prices: [
					templatePrice(
						20,
						'USD',
						'US',
						'https://openai.com/index/chatgpt-plus/',
						chatGptPriceVerifiedAt
					)
				],
				cycle: 'monthly',
				note: usdReferencePriceNote
			},
			{
				id: 'pro',
				name: { ja: 'Pro', en: 'Pro' },
				prices: [
					templatePrice(
						200,
						'USD',
						'US',
						'https://openai.com/index/introducing-chatgpt-pro/',
						chatGptPriceVerifiedAt
					)
				],
				cycle: 'monthly',
				note: usdReferencePriceNote
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
	},
	{
		id: 'hulu',
		name: 'Hulu',
		category: 'video',
		color: 'green',
		tags: {
			ja: ['動画'],
			en: ['Video']
		},
		sourceUrl: 'https://www.hulu.jp/static/legal/act/',
		lastVerifiedAt: catalogExpansionVerifiedAt,
		plans: [
			{
				id: 'monthly-web',
				name: {
					ja: '見放題（Web等・ポイント付き）',
					en: 'Streaming (web, with points)'
				},
				prices: [catalogJpyPrice(1320, 'https://www.hulu.jp/static/legal/act/')],
				cycle: 'monthly'
			},
			{
				id: 'monthly-app',
				name: {
					ja: '見放題（アプリ内課金・改定後）',
					en: 'Streaming (in-app, revised price)'
				},
				prices: [catalogJpyPrice(1450, 'https://www.hulu.jp/static/legal/act/')],
				cycle: 'monthly',
				note: {
					ja: '2026年10月の料金改定後の参考価格です。既存契約への適用日は請求元によって異なります。',
					en: 'Reference price after the October 2026 revision. Effective dates for existing subscriptions vary by billing provider.'
				}
			},
			{
				id: 'monthly-partner',
				name: {
					ja: '見放題（Huluチケット・対象事業者経由）',
					en: 'Streaming (Hulu ticket/eligible partner)'
				},
				prices: [catalogJpyPrice(1026, 'https://www.hulu.jp/static/legal/act/')],
				cycle: 'monthly'
			},
			{
				id: 'custom',
				name: {
					ja: '自分で入力',
					en: 'Enter manually'
				},
				prices: [],
				cycle: 'monthly'
			}
		],
		cancellation: {
			method: 'web',
			memo: {
				ja: 'Huluのアカウントページで契約と請求元を確認します。アプリやパートナー経由の契約は、その請求元で解約してください。',
				en: 'Review your subscription and billing provider in your Hulu account. For app or partner billing, cancel with that provider.'
			},
			url: 'https://id.hulu.jp/account'
		}
	},
	{
		id: 'dmm-tv',
		name: 'DMM TV',
		category: 'video',
		color: 'blue',
		tags: {
			ja: ['動画'],
			en: ['Video']
		},
		sourceUrl: 'https://premium.dmm.com/about/',
		lastVerifiedAt: catalogExpansionVerifiedAt,
		plans: [
			{
				id: 'premium-web',
				name: {
					ja: 'DMMプレミアム（Web登録）',
					en: 'DMM Premium (web)'
				},
				prices: [catalogJpyPrice(550, 'https://premium.dmm.com/about/')],
				cycle: 'monthly'
			},
			{
				id: 'premium-app',
				name: {
					ja: 'DMMプレミアム（App Store/Google Play）',
					en: 'DMM Premium (App Store/Google Play)'
				},
				prices: [catalogJpyPrice(650, 'https://premium.dmm.com/about/')],
				cycle: 'monthly'
			},
			{
				id: 'custom',
				name: {
					ja: '自分で入力',
					en: 'Enter manually'
				},
				prices: [],
				cycle: 'monthly'
			}
		],
		cancellation: {
			method: 'web',
			memo: {
				ja: 'DMMプレミアム利用状況からプランの解約に進みます。アプリ内課金の場合はApp StoreやGoogle Playなどの請求元で解約してください。',
				en: 'Open DMM Premium membership settings to cancel. For in-app purchases, cancel through the billing provider such as the App Store or Google Play.'
			},
			url: 'https://accounts.premium.dmm.com/settings/'
		}
	},
	{
		id: 'd-anime-store',
		name: 'dアニメストア',
		category: 'video',
		color: 'orange',
		tags: {
			ja: ['動画'],
			en: ['Video']
		},
		sourceUrl: 'https://animestore.docomo.ne.jp/animestore/CF/specified_commercial_transactions',
		lastVerifiedAt: catalogExpansionVerifiedAt,
		plans: [
			{
				id: 'monthly-web',
				name: {
					ja: '見放題（Web登録）',
					en: 'Streaming (web)'
				},
				prices: [
					catalogJpyPrice(
						660,
						'https://animestore.docomo.ne.jp/animestore/CF/specified_commercial_transactions'
					)
				],
				cycle: 'monthly'
			},
			{
				id: 'custom',
				name: {
					ja: '自分で入力',
					en: 'Enter manually'
				},
				prices: [],
				cycle: 'monthly'
			}
		],
		cancellation: {
			method: 'web',
			memo: {
				ja: 'dアニメストアの「メニュー」から「ユーザー設定」を開き、解約へ進みます。アプリ内課金や他社経由の場合は、その請求元で確認してください。',
				en: 'Open User Settings from the d Anime Store menu to cancel. For in-app or partner billing, check with the billing provider.'
			}
		}
	},
	{
		id: 'apple-tv',
		name: 'Apple TV',
		category: 'video',
		color: 'purple',
		tags: {
			ja: ['動画'],
			en: ['Video']
		},
		sourceUrl: 'https://www.apple.com/jp/apple-tv-app/',
		lastVerifiedAt: catalogExpansionVerifiedAt,
		plans: [
			{
				id: 'monthly',
				name: {
					ja: '月額プラン',
					en: 'Monthly'
				},
				prices: [catalogJpyPrice(1200, 'https://www.apple.com/jp/apple-tv-app/')],
				cycle: 'monthly'
			},
			{
				id: 'custom',
				name: {
					ja: '自分で入力',
					en: 'Enter manually'
				},
				prices: [],
				cycle: 'monthly'
			}
		],
		cancellation: {
			method: 'app_store',
			memo: {
				ja: 'Apple Accountのサブスクリプション管理でApple TVを確認します。Apple Oneなどのセット契約は、契約中のプランを確認してください。',
				en: 'Review Apple TV in Apple Account subscriptions. For bundles such as Apple One, review the subscribed bundle.'
			},
			url: 'https://apps.apple.com/account/subscriptions'
		}
	},
	{
		id: 'claude',
		name: 'Claude',
		category: 'ai',
		color: 'orange',
		tags: {
			ja: ['AI', '開発'],
			en: ['AI', 'Development']
		},
		sourceUrl: 'https://claude.com/pricing',
		lastVerifiedAt: catalogExpansionVerifiedAt,
		plans: [
			{
				id: 'pro-monthly',
				name: {
					ja: 'Pro（月払い）',
					en: 'Pro (monthly)'
				},
				prices: [catalogPrice(20, 'USD', 'US', 'https://claude.com/pricing')],
				cycle: 'monthly',
				note: {
					ja: '米国向けのUSD参考価格です。税や追加利用料、実際の請求通貨は契約画面で確認してください。',
					en: 'US reference price in USD. Check tax, additional usage fees, and billing currency in your account.'
				}
			},
			{
				id: 'pro-yearly',
				name: {
					ja: 'Pro（年払い）',
					en: 'Pro (annual)'
				},
				prices: [catalogPrice(200, 'USD', 'US', 'https://claude.com/pricing')],
				cycle: 'yearly',
				note: {
					ja: '米国向けのUSD参考価格です。税や追加利用料、実際の請求通貨は契約画面で確認してください。',
					en: 'US reference price in USD. Check tax, additional usage fees, and billing currency in your account.'
				}
			},
			{
				id: 'max-5x',
				name: {
					ja: 'Max 5x',
					en: 'Max 5x'
				},
				prices: [
					catalogPrice(
						100,
						'USD',
						'US',
						'https://support.claude.com/en/articles/11049741-what-is-the-max-plan?subjects=product'
					)
				],
				cycle: 'monthly',
				note: {
					ja: '米国向けのUSD参考価格です。税や追加利用料、実際の請求通貨は契約画面で確認してください。',
					en: 'US reference price in USD. Check tax, additional usage fees, and billing currency in your account.'
				}
			},
			{
				id: 'max-20x',
				name: {
					ja: 'Max 20x',
					en: 'Max 20x'
				},
				prices: [
					catalogPrice(
						200,
						'USD',
						'US',
						'https://support.claude.com/en/articles/11049741-what-is-the-max-plan?subjects=product'
					)
				],
				cycle: 'monthly',
				note: {
					ja: '米国向けのUSD参考価格です。税や追加利用料、実際の請求通貨は契約画面で確認してください。',
					en: 'US reference price in USD. Check tax, additional usage fees, and billing currency in your account.'
				}
			},
			{
				id: 'custom',
				name: {
					ja: '自分で入力',
					en: 'Enter manually'
				},
				prices: [],
				cycle: 'monthly'
			}
		],
		cancellation: {
			method: 'web',
			memo: {
				ja: 'Claudeの設定から「Billing」を開き、契約を確認します。App StoreやGoogle Play経由の場合は、その請求元で解約してください。',
				en: 'Open Billing in Claude settings to review your subscription. For App Store or Google Play billing, cancel with that provider.'
			}
		}
	},
	{
		id: 'github-copilot',
		name: 'GitHub Copilot',
		category: 'development',
		color: 'purple',
		tags: {
			ja: ['AI', '開発'],
			en: ['AI', 'Development']
		},
		sourceUrl: 'https://github.com/features/copilot/plans',
		lastVerifiedAt: catalogExpansionVerifiedAt,
		plans: [
			{
				id: 'pro-monthly',
				name: {
					ja: 'Pro（月払い）',
					en: 'Pro (monthly)'
				},
				prices: [catalogPrice(10, 'USD', 'US', 'https://github.com/features/copilot/plans')],
				cycle: 'monthly',
				note: {
					ja: '米国向けのUSD参考価格です。税や追加利用料、実際の請求通貨は契約画面で確認してください。',
					en: 'US reference price in USD. Check tax, additional usage fees, and billing currency in your account.'
				}
			},
			{
				id: 'pro-plus-monthly',
				name: {
					ja: 'Pro+（月払い）',
					en: 'Pro+ (monthly)'
				},
				prices: [catalogPrice(39, 'USD', 'US', 'https://github.com/features/copilot/plans')],
				cycle: 'monthly',
				note: {
					ja: '米国向けのUSD参考価格です。税や追加利用料、実際の請求通貨は契約画面で確認してください。',
					en: 'US reference price in USD. Check tax, additional usage fees, and billing currency in your account.'
				}
			},
			{
				id: 'max-monthly',
				name: {
					ja: 'Max（月払い）',
					en: 'Max (monthly)'
				},
				prices: [catalogPrice(100, 'USD', 'US', 'https://github.com/features/copilot/plans')],
				cycle: 'monthly',
				note: {
					ja: '米国向けのUSD参考価格です。税や追加利用料、実際の請求通貨は契約画面で確認してください。',
					en: 'US reference price in USD. Check tax, additional usage fees, and billing currency in your account.'
				}
			},
			{
				id: 'custom',
				name: {
					ja: '自分で入力',
					en: 'Enter manually'
				},
				prices: [],
				cycle: 'monthly'
			}
		],
		cancellation: {
			method: 'web',
			memo: {
				ja: 'GitHubの設定で「Billing and licensing」から契約を確認し、Copilotのサブスクリプションを管理します。追加利用料がある場合は、実際の請求額へ修正してください。',
				en: 'Review Copilot under Billing and licensing in GitHub settings. Adjust the amount for any additional usage charges.'
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
