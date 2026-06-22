import type { AppLocale, CancellationMethod } from '$lib/constant';
import type { SubscriptionColor } from '$lib/subscription-colors';

export type ServiceTemplateCategory = 'video' | 'music' | 'shopping' | 'cloud' | 'ai';
export type TemplateBillingCycle = 'monthly' | 'quarterly' | 'yearly';

type LocalizedText = Record<AppLocale, string>;

export type ServiceTemplatePlan = {
	id: string;
	name: LocalizedText;
	price: number | null;
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
				price: 890,
				cycle: 'monthly',
				note: {
					ja: '公式ページで確認できる最低価格です。',
					en: 'Lowest price shown on the official page.'
				}
			},
			{
				id: 'custom',
				name: { ja: '自分で入力', en: 'Enter manually' },
				price: null,
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
				price: null,
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
				price: null,
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
				price: 1080,
				cycle: 'monthly'
			},
			{
				id: 'student',
				name: { ja: 'Premium Student', en: 'Premium Student' },
				price: 580,
				cycle: 'monthly'
			},
			{
				id: 'duo',
				name: { ja: 'Premium Duo', en: 'Premium Duo' },
				price: 1480,
				cycle: 'monthly'
			},
			{
				id: 'family',
				name: { ja: 'Premium Family', en: 'Premium Family' },
				price: 1880,
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
				price: 1080,
				cycle: 'monthly'
			},
			{
				id: 'family',
				name: { ja: 'ファミリー', en: 'Family' },
				price: 1680,
				cycle: 'monthly'
			},
			{
				id: 'student',
				name: { ja: '学生', en: 'Student' },
				price: 580,
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
				id: 'custom',
				name: { ja: '自分で入力', en: 'Enter manually' },
				price: null,
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
				price: null,
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
				price: 150,
				cycle: 'monthly'
			},
			{
				id: '200gb',
				name: { ja: '200GB', en: '200GB' },
				price: 450,
				cycle: 'monthly'
			},
			{
				id: '2tb',
				name: { ja: '2TB', en: '2TB' },
				price: 1500,
				cycle: 'monthly'
			},
			{
				id: '6tb',
				name: { ja: '6TB', en: '6TB' },
				price: 4500,
				cycle: 'monthly'
			},
			{
				id: '12tb',
				name: { ja: '12TB', en: '12TB' },
				price: 9000,
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
				price: null,
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
				price: null,
				cycle: 'monthly',
				note: {
					ja: '日本円の請求額はアカウントの表示に合わせて入力してください。',
					en: 'Enter the JPY charge shown in your account.'
				}
			},
			{
				id: 'pro',
				name: { ja: 'Pro', en: 'Pro' },
				price: null,
				cycle: 'monthly',
				note: {
					ja: '日本円の請求額はアカウントの表示に合わせて入力してください。',
					en: 'Enter the JPY charge shown in your account.'
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
