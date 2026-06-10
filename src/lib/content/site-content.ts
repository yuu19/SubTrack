import type { AppLocale } from '$lib/constant';
import privacyPolicySource from '../../../docs/プライバシーポリシー.md?raw';
import privacyPolicySourceEn from '../../../docs/privacy-policy.en.md?raw';
import termsOfServiceSource from '../../../docs/利用規約.md?raw';
import termsOfServiceSourceEn from '../../../docs/terms-of-service.en.md?raw';

export type ContentBlock =
	| {
			type: 'paragraph';
			text: string;
	  }
	| {
			type: 'list';
			ordered: boolean;
			items: string[];
	  };

export type ContentSection = {
	heading: string;
	blocks: ContentBlock[];
};

export type MarkdownDocument = {
	title: string;
	updatedAt: string;
	sections: ContentSection[];
};

export type LegalPageCopy = {
	headTitle: string;
	headDescription: string;
	eyebrow: string;
	updatedLabel: string;
};

export type FAQItem = {
	question: string;
	answer: string;
};

export type FAQCategory = {
	title: string;
	items: FAQItem[];
};

export type FAQPageCopy = {
	headTitle: string;
	headDescription: string;
	eyebrow: string;
	title: string;
	description: string;
	categories: FAQCategory[];
};

export type CommerceRow = {
	label: string;
	value: string;
};

export type CommercePageCopy = {
	headTitle: string;
	headDescription: string;
	eyebrow: string;
	title: string;
	description: string;
	rows: CommerceRow[];
	note: string;
};

export type LandingImage = {
	src: string;
	alt: string;
	caption?: string;
};

export type LandingBasicItem = {
	title: string;
	description: string;
};

export type LandingStep = LandingBasicItem & {
	label: string;
	image: LandingImage;
};

export type LandingFeature = LandingBasicItem & {
	detail: string;
};

export type LandingPricingPlan = {
	name: string;
	price: string;
	cycle: string;
	description: string;
	bullets: string[];
	badge?: string;
	featured?: boolean;
};

export type LandingFAQItem = {
	question: string;
	answer: string;
	href?: string;
	linkLabel?: string;
};

export type LandingPageCopy = {
	headTitle: string;
	headDescription: string;
	hero: {
		eyebrow: string;
		title: string;
		description: string;
		note: string;
		cta: string;
		secondaryCta: string;
		trustItems: string[];
		metrics: Array<{
			value: string;
			label: string;
		}>;
		image: LandingImage;
	};
	problems: {
		eyebrow: string;
		title: string;
		description: string;
		items: LandingBasicItem[];
	};
	steps: {
		eyebrow: string;
		title: string;
		description: string;
		items: LandingStep[];
	};
	features: {
		eyebrow: string;
		title: string;
		description: string;
		items: LandingFeature[];
	};
	pricing: {
		eyebrow: string;
		title: string;
		description: string;
		plans: LandingPricingPlan[];
	};
	faq: {
		eyebrow: string;
		title: string;
		description: string;
		items: LandingFAQItem[];
		moreLink: {
			href: string;
			label: string;
		};
	};
	finalCta: {
		title: string;
		description: string;
		cta: string;
	};
};

const headingPattern = /^##\s+(.+)$/;
const listPattern = /^\s*(\d+\.)\s+(.+)$/;
const bulletPattern = /^\s*[*-]\s+(.+)$/;

const normalizeInline = (value: string) =>
	value
		.replace(/\*\*(.*?)\*\*/g, '$1')
		.replace(/\[(.*?)\]\((.*?)\)/g, '$1')
		.trim();

const extractUpdatedAt = (lines: string[]): string => {
	const updatedAtLine = lines.find(
		(line) => line.startsWith('最終更新日：') || line.startsWith('Last updated:')
	);

	if (!updatedAtLine) return '';

	return normalizeInline(updatedAtLine.replace(/^(最終更新日：|Last updated:\s*)/, ''));
};

const parseListItem = (line: string) => {
	const orderedMatch = line.match(listPattern);
	if (orderedMatch) {
		return {
			ordered: true,
			text: normalizeInline(orderedMatch[2])
		};
	}

	const bulletMatch = line.match(bulletPattern);
	if (bulletMatch) {
		return {
			ordered: false,
			text: normalizeInline(bulletMatch[1])
		};
	}

	return null;
};

const parseDocument = (source: string): MarkdownDocument => {
	const lines = source.split(/\r?\n/);
	const title = normalizeInline(
		lines.find((line) => line.startsWith('# '))?.replace(/^#\s+/, '') ?? ''
	);
	const updatedAt = extractUpdatedAt(lines);

	const sections: ContentSection[] = [];
	let currentSection: ContentSection | null = null;
	let blockLines: string[] = [];

	const flushBlock = () => {
		if (!currentSection || blockLines.length === 0) return;

		const filtered = blockLines
			.map((line) => line.trimEnd())
			.filter((line) => line.trim().length > 0);
		blockLines = [];
		if (filtered.length === 0) return;

		const parsedItems = filtered.map(parseListItem);
		const allListItems = parsedItems.every(Boolean);

		if (allListItems) {
			currentSection.blocks.push({
				type: 'list',
				ordered: parsedItems[0]?.ordered ?? false,
				items: parsedItems.map((item) => item?.text ?? '')
			});
			return;
		}

		const text = normalizeInline(filtered.join(' '));
		if (text && text !== '以上') {
			currentSection.blocks.push({
				type: 'paragraph',
				text
			});
		}
	};

	const flushSection = () => {
		flushBlock();
		if (currentSection) {
			sections.push(currentSection);
		}
		currentSection = null;
	};

	for (const line of lines) {
		const headingMatch = line.match(headingPattern);
		if (headingMatch) {
			flushSection();
			currentSection = {
				heading: normalizeInline(headingMatch[1]),
				blocks: []
			};
			continue;
		}

		if (!currentSection) continue;

		if (line.trim().length === 0) {
			flushBlock();
			continue;
		}

		blockLines.push(line);
	}

	flushSection();

	return {
		title,
		updatedAt,
		sections
	};
};

export const termsDocuments: Record<AppLocale, MarkdownDocument> = {
	ja: parseDocument(termsOfServiceSource),
	en: parseDocument(termsOfServiceSourceEn)
};

export const privacyDocuments: Record<AppLocale, MarkdownDocument> = {
	ja: parseDocument(privacyPolicySource),
	en: parseDocument(privacyPolicySourceEn)
};

export const termsPageCopy: Record<AppLocale, LegalPageCopy> = {
	ja: {
		headTitle: '利用規約 | SubTrack',
		headDescription: 'SubTrack の利用規約です。',
		eyebrow: '利用規約',
		updatedLabel: '最終更新日'
	},
	en: {
		headTitle: 'Terms of Service | SubTrack',
		headDescription: 'Read the SubTrack terms of service.',
		eyebrow: 'Terms of Service',
		updatedLabel: 'Last updated'
	}
};

export const privacyPageCopy: Record<AppLocale, LegalPageCopy> = {
	ja: {
		headTitle: 'プライバシーポリシー | SubTrack',
		headDescription: 'SubTrack のプライバシーポリシーです。',
		eyebrow: 'プライバシーポリシー',
		updatedLabel: '最終更新日'
	},
	en: {
		headTitle: 'Privacy Policy | SubTrack',
		headDescription: 'Read the SubTrack privacy policy.',
		eyebrow: 'Privacy Policy',
		updatedLabel: 'Last updated'
	}
};

export const landingPageCopy: Record<AppLocale, LandingPageCopy> = {
	ja: {
		headTitle: 'SubTrack | サブスク管理アプリ',
		headDescription:
			'SubTrack は、契約中のサブスク、月額料金、次回請求日、通知、分析をひとつにまとめて管理できるサブスクリプション管理アプリです。',
		hero: {
			eyebrow: 'SubTrack',
			title: '毎月いくら払っているか分からない、を終わらせる。',
			description:
				'契約中のサービス、支払い額、次回更新日をまとめて記録。通知とカレンダーで見落としを減らし、分析で固定費を見直せます。',
			note: '銀行連携は不要です。カード番号は SubTrack に保存されません。',
			cta: 'Googleアカウントでログイン/登録する',
			secondaryCta: '機能を見る',
			trustItems: ['銀行連携不要', 'カード情報非保存', 'ホーム画面に追加可能'],
			metrics: [
				{ value: '5件', label: '無料で登録' },
				{ value: '300円', label: 'Premium 月額' },
				{ value: '6,000円', label: '買い切り' }
			],
			image: {
				src: '/images/onboarding/subscriptions-real.png',
				alt: 'SubTrack のサブスク一覧画面',
				caption: '支払い額と次回更新日を一覧で確認'
			}
		},
		problems: {
			eyebrow: 'よくある課題',
			title: '小さな固定費ほど、気づかないうちに増えていきます。',
			description:
				'動画、音楽、仕事ツール、クラウド容量。便利な契約が増えるほど、支払いの全体像は見えにくくなります。',
			items: [
				{
					title: '支払い額が見えない',
					description:
						'月額と年額が混ざると、毎月の実質負担や年間コストをすぐに把握しづらくなります。'
				},
				{
					title: '更新日を忘れる',
					description:
						'無料期間や年払いの更新を見落とすと、使っていないサービスにも請求が発生します。'
				},
				{
					title: '小さな契約が積み上がる',
					description: 'ひとつひとつは少額でも、合計すると見直す価値のある固定費になります。'
				}
			]
		},
		steps: {
			eyebrow: '使い方',
			title: '登録して、通知を受け取り、見直すだけ。',
			description: '銀行やカードを連携せず、自分で把握したいサブスクだけを記録できます。',
			items: [
				{
					label: 'Step 1',
					title: 'サブスクを登録する',
					description: 'サービス名、金額、支払い周期、初回支払日を入力します。',
					image: {
						src: '/images/onboarding/subscriptions-real.png',
						alt: 'SubTrack の登録済みサブスク一覧'
					}
				},
				{
					label: 'Step 2',
					title: '通知を受け取る',
					description: '支払日の何日前に知らせるかを設定し、アプリ通知やメールで確認します。',
					image: {
						src: '/images/onboarding/notification-real.png',
						alt: 'SubTrack の通知設定画面'
					}
				},
				{
					label: 'Step 3',
					title: 'カレンダーと分析で見直す',
					description: '請求予定をカレンダーで確認し、月額・年額の合計を分析できます。',
					image: {
						src: '/images/onboarding/calendar-real.png',
						alt: 'SubTrack のカレンダー画面'
					}
				}
			]
		},
		features: {
			eyebrow: '機能',
			title: 'サブスク管理に必要な確認作業をひとつにまとめます。',
			description:
				'一覧、更新日、通知、分析、エクスポート、PWA まで、継続的な見直しに必要な機能を揃えています。',
			items: [
				{
					title: '一覧管理',
					description: '契約中のサービスをまとめて表示',
					detail: '金額、支払い周期、タグ、次回請求日を一覧で確認できます。'
				},
				{
					title: '更新日確認',
					description: '次の支払いをカレンダーで把握',
					detail: '月内の請求予定を見ながら、いつ何が発生するかを確認できます。'
				},
				{
					title: '通知',
					description: '支払い前の見落としを減らす',
					detail: 'アプリ通知、メール、またはその両方でリマインドを受け取れます。'
				},
				{
					title: '分析',
					description: '月額・年額の固定費を可視化',
					detail: '支払いの合計や内訳を見て、見直し候補を探せます。'
				},
				{
					title: 'CSV / Premium',
					description: '必要なときにデータを書き出し',
					detail: 'CSV エクスポートや登録件数制限の解除は Premium で利用できます。'
				},
				{
					title: 'PWA',
					description: 'ホーム画面からすぐ開ける',
					detail: 'スマホのホーム画面に追加して、アプリのように起動できます。'
				}
			]
		},
		pricing: {
			eyebrow: '料金',
			title: 'まずは無料で、必要になったら Premium へ。',
			description:
				'無料枠で始めて、登録件数やエクスポートが必要になったタイミングでアップグレードできます。',
			plans: [
				{
					name: 'Free',
					price: '0円',
					cycle: 'まず試したい方向け',
					description: 'サブスクを最大5件まで登録できます。',
					bullets: ['サブスク一覧管理', '更新日確認', 'カレンダーと分析の基本表示']
				},
				{
					name: 'Premium',
					price: '月額300円 / 年額3,000円',
					cycle: '継続的に管理したい方向け',
					description: '登録件数の上限解除や CSV エクスポートを利用できます。',
					bullets: [
						'登録件数の上限解除',
						'CSV エクスポート',
						'個別通知設定',
						'7日間無料トライアルが適用される場合があります'
					],
					badge: '人気',
					featured: true
				},
				{
					name: 'Premium 買い切り',
					price: '6,000円',
					cycle: '月額を増やしたくない方向け',
					description: '一度の支払いで Premium 相当の機能を使い続けられます。',
					bullets: ['買い切りで利用', 'CSV エクスポート', '登録件数制限の解除']
				}
			]
		},
		faq: {
			eyebrow: 'FAQ',
			title: '始める前のよくある質問',
			description: '無料枠、通知、カード情報、ホーム画面追加、有料プラン管理を確認できます。',
			items: [
				{
					question: '無料プランでは何件まで登録できますか？',
					answer: 'サブスクリプションを最大5件まで登録できます。6件目以降は Premium が必要です。',
					href: '/faq',
					linkLabel: 'FAQを見る'
				},
				{
					question: '通知はどの方法で受け取れますか？',
					answer: 'アプリ通知、メール、またはその両方を選べます。',
					href: '/push',
					linkLabel: '通知設定を見る'
				},
				{
					question: 'カード情報は SubTrack に保存されますか？',
					answer: '保存されません。決済に必要なカード情報はお支払いサービス側で管理されます。'
				},
				{
					question: 'スマホのホーム画面に追加できますか？',
					answer: 'できます。対応ブラウザでは、ホーム画面に追加してアプリのように開けます。',
					href: '/push',
					linkLabel: '追加方法を見る'
				},
				{
					question: '有料プランの解約や請求情報の変更はどこで行いますか？',
					answer: 'ログイン後、設定画面からお支払い管理ページを開いて手続きできます。',
					href: '/faq',
					linkLabel: '詳細を見る'
				}
			],
			moreLink: {
				href: '/faq',
				label: 'すべてのFAQを見る'
			}
		},
		finalCta: {
			title: '次の請求日を、今日から見える状態に。',
			description:
				'Google アカウントで始めて、まずはよく使うサブスクを5件だけ登録してみてください。',
			cta: 'Googleアカウントでログイン/登録する'
		}
	},
	en: {
		headTitle: 'SubTrack | Subscription Management App',
		headDescription:
			'SubTrack helps you manage active subscriptions, monthly costs, next billing dates, reminders, analytics, and exports in one place.',
		hero: {
			eyebrow: 'SubTrack',
			title: 'Stop guessing how much you pay every month.',
			description:
				'Track services, costs, and upcoming renewals in one place. Use reminders, calendar views, and analytics to review recurring expenses before they pile up.',
			note: 'No bank connection is required. SubTrack does not store card numbers.',
			cta: 'Continue with Google',
			secondaryCta: 'View features',
			trustItems: ['No bank linking', 'Card details not stored', 'Add to home screen'],
			metrics: [
				{ value: '5', label: 'Free entries' },
				{ value: 'JPY 300', label: 'Premium monthly' },
				{ value: 'JPY 6,000', label: 'Lifetime' }
			],
			image: {
				src: '/images/onboarding/subscriptions-real.png',
				alt: 'SubTrack subscription list screen',
				caption: 'Review costs and next billing dates at a glance'
			}
		},
		problems: {
			eyebrow: 'Common issues',
			title: 'Small recurring costs are easy to miss.',
			description:
				'Video, music, work tools, cloud storage. As useful services increase, the total monthly picture gets harder to see.',
			items: [
				{
					title: 'Costs are scattered',
					description:
						'Monthly and annual plans make it hard to understand your real monthly and yearly spend.'
				},
				{
					title: 'Renewals slip by',
					description:
						'Free trials and annual renewals can turn into charges for services you no longer use.'
				},
				{
					title: 'Small plans add up',
					description:
						'Each service may feel inexpensive, but the total can become a recurring cost worth reviewing.'
				}
			]
		},
		steps: {
			eyebrow: 'How it works',
			title: 'Add subscriptions, get reminders, then review.',
			description:
				'Track only the subscriptions you care about, without connecting a bank or card account.',
			items: [
				{
					label: 'Step 1',
					title: 'Add a subscription',
					description: 'Enter the service name, amount, billing cycle, and first payment date.',
					image: {
						src: '/images/onboarding/subscriptions-real.png',
						alt: 'SubTrack list of registered subscriptions'
					}
				},
				{
					label: 'Step 2',
					title: 'Receive reminders',
					description:
						'Choose how many days before billing to be notified by app notification, email, or both.',
					image: {
						src: '/images/onboarding/notification-real.png',
						alt: 'SubTrack notification settings screen'
					}
				},
				{
					label: 'Step 3',
					title: 'Review calendar and analytics',
					description:
						'Check upcoming charges on the calendar and review monthly or yearly totals.',
					image: {
						src: '/images/onboarding/calendar-real.png',
						alt: 'SubTrack calendar screen'
					}
				}
			]
		},
		features: {
			eyebrow: 'Features',
			title: 'Everything needed for routine subscription review.',
			description:
				'Lists, renewal dates, reminders, analytics, export, and PWA access are grouped into one workflow.',
			items: [
				{
					title: 'List management',
					description: 'Keep active subscriptions together',
					detail: 'View amount, billing cycle, tags, and next billing date in one list.'
				},
				{
					title: 'Renewal dates',
					description: 'See upcoming charges on a calendar',
					detail: 'Review what will be charged this month and when it happens.'
				},
				{
					title: 'Reminders',
					description: 'Reduce missed billing dates',
					detail: 'Receive app notifications, email, or both based on your settings.'
				},
				{
					title: 'Analytics',
					description: 'Visualize monthly and yearly costs',
					detail: 'Check totals and breakdowns to find services worth reviewing.'
				},
				{
					title: 'CSV / Premium',
					description: 'Export data when needed',
					detail: 'CSV export and free-plan limit removal are available on Premium.'
				},
				{
					title: 'PWA',
					description: 'Open from your home screen',
					detail: 'Add SubTrack to your phone home screen and launch it like an app.'
				}
			]
		},
		pricing: {
			eyebrow: 'Pricing',
			title: 'Start free, upgrade when you need more.',
			description:
				'Begin with the free limit, then upgrade when you need more entries or CSV export.',
			plans: [
				{
					name: 'Free',
					price: 'JPY 0',
					cycle: 'For getting started',
					description: 'Track up to 5 subscriptions.',
					bullets: ['Subscription list', 'Renewal date review', 'Basic calendar and analytics']
				},
				{
					name: 'Premium',
					price: 'JPY 300 / month or JPY 3,000 / year',
					cycle: 'For ongoing management',
					description: 'Remove entry limits and use CSV export.',
					bullets: [
						'Remove entry limits',
						'CSV export',
						'Per-subscription reminder settings',
						'A 7-day free trial may apply'
					],
					badge: 'Popular',
					featured: true
				},
				{
					name: 'Premium Lifetime',
					price: 'JPY 6,000',
					cycle: 'For avoiding another monthly bill',
					description: 'Use Premium-level features with a one-time purchase.',
					bullets: ['One-time purchase', 'CSV export', 'Remove entry limits']
				}
			]
		},
		faq: {
			eyebrow: 'FAQ',
			title: 'Questions before you start',
			description:
				'Review the free limit, reminders, card handling, home-screen install, and paid-plan management.',
			items: [
				{
					question: 'How many subscriptions can I add for free?',
					answer: 'You can add up to 5 subscriptions. Premium is required for the sixth and later.',
					href: '/faq',
					linkLabel: 'Read FAQ'
				},
				{
					question: 'Which reminder methods are supported?',
					answer: 'You can choose app notifications, email, or both.',
					href: '/push',
					linkLabel: 'View notification guide'
				},
				{
					question: 'Does SubTrack store card details?',
					answer: 'No. Card details are handled by the payment provider, not by SubTrack.'
				},
				{
					question: 'Can I add it to my phone home screen?',
					answer:
						'Yes. Supported browsers let you add SubTrack to your home screen and open it like an app.',
					href: '/push',
					linkLabel: 'See setup'
				},
				{
					question: 'Where do I manage cancellation or billing details?',
					answer: 'After logging in, open the billing management page from settings.',
					href: '/faq',
					linkLabel: 'Learn more'
				}
			],
			moreLink: {
				href: '/faq',
				label: 'View all FAQ'
			}
		},
		finalCta: {
			title: 'Make your next billing date visible today.',
			description:
				'Continue with Google and start by adding the five subscriptions you use most often.',
			cta: 'Continue with Google'
		}
	}
};

export const faqPageCopy: Record<'ja' | 'en', FAQPageCopy> = {
	ja: {
		headTitle: 'よくある質問 | SubTrack',
		headDescription:
			'SubTrack のよくある質問です。無料プラン、Premium、通知、通信が不安定なときの使い方、課金管理などをまとめています。',
		eyebrow: 'SubTrack FAQ',
		title: 'よくある質問',
		description: 'SubTrack を使うときによくある質問をまとめています。',
		categories: [
			{
				title: 'アカウントとプラン',
				items: [
					{
						question: '無料プランでは何件まで登録できますか？',
						answer:
							'無料プランではサブスクリプションを最大5件まで登録できます。6件目以降を登録するには Premium へのアップグレードが必要です。'
					},
					{
						question: 'Premium では何が増えますか？',
						answer:
							'現在の画面表示では、登録件数の上限解除、CSV エクスポート、個別通知設定などが Premium 向け機能として案内されています。'
					},
					{
						question: 'Premium にトライアルはありますか？',
						answer:
							'Premium プランには 7 日間の無料トライアルがあります。課金状況は設定画面やお支払い管理ページで確認できます。'
					},
					{
						question: '有料プランの解約や請求情報の変更はどこで行いますか？',
						answer:
							'設定画面からお支払い管理ページへ移動して手続きします。プランの状態、次回の請求日、解約手続きなどを確認できます。'
					}
				]
			},
			{
				title: '通知とリマインド',
				items: [
					{
						question: '通知はどの方法で受け取れますか？',
						answer:
							'通知はアプリの通知、メール、またはその両方から選べます。設定した受け取り方法に合わせてお知らせします。'
					},
					{
						question: '何日前に通知するか変更できますか？',
						answer:
							'できます。ユーザーごとの既定値に加えて、サブスクリプション登録・編集時に通知日数を設定できます。当日通知も選択可能です。'
					},
					{
						question: 'アプリの通知を使うには何が必要ですか？',
						answer:
							'ブラウザで通知を許可する必要があります。通知が届かない場合は、ブラウザと端末の通知設定をご確認ください。'
					},
					{
						question: '通知はいつ送信されますか？',
						answer:
							'登録した支払日と通知タイミングの設定に合わせて送信されます。アプリの通知とメールは、選んだ受け取り方法に応じて届きます。'
					}
				]
			},
			{
				title: 'データと利用環境',
				items: [
					{
						question: '通信が不安定なときでも使えますか？',
						answer:
							'一度表示した内容の確認や一部の追加操作はできます。通信が戻ると、あとから内容が反映されます。'
					},
					{
						question: '通信がないときにできない操作はありますか？',
						answer:
							'お支払いに関する手続きや、すぐに反映が必要な操作は通信が必要です。状況によっては編集や削除ができないこともあります。'
					},
					{
						question: 'アプリにはどのような情報が保存されますか？',
						answer:
							'アカウント情報、登録したサービス名、料金、支払日、タグ、通知設定、お支払い管理に必要な情報などが、サービス提供のために利用されます。'
					},
					{
						question: 'クレジットカード情報は SubTrack に保存されますか？',
						answer:
							'クレジットカード情報は SubTrack ではなく、お支払いサービス側で管理されます。SubTrack では、お支払い状況を連携するために必要な情報のみを扱います。'
					}
				]
			}
		]
	},
	en: {
		headTitle: 'FAQ | SubTrack',
		headDescription:
			'Frequently asked questions for SubTrack, including plan limits, Premium, notifications, limited-connectivity use, and billing management.',
		eyebrow: 'SubTrack FAQ',
		title: 'Frequently asked questions',
		description: 'Answers to common questions about using SubTrack.',
		categories: [
			{
				title: 'Account and plans',
				items: [
					{
						question: 'How many subscriptions can I add on the free plan?',
						answer:
							'The free plan currently allows up to 5 tracked subscriptions. Adding a sixth subscription requires an upgrade to Premium.'
					},
					{
						question: 'What changes on Premium?',
						answer:
							'The current UI presents Premium as including higher or unlimited limits plus features such as CSV export and more flexible notification controls.'
					},
					{
						question: 'Is there a trial for Premium?',
						answer:
							'Premium currently includes a 7-day free trial. You can review billing status from the settings page and the billing management page.'
					},
					{
						question: 'Where do I manage cancellation or billing details?',
						answer:
							'You can open the billing management page from settings to review plan status, renewal timing, and cancellation options.'
					}
				]
			},
			{
				title: 'Notifications and reminders',
				items: [
					{
						question: 'Which notification methods are supported?',
						answer:
							'You can choose app notifications, email, or both. SubTrack sends reminders based on the method you select.'
					},
					{
						question: 'Can I change how many days in advance reminders are sent?',
						answer:
							'Yes. SubTrack stores a default reminder lead time per user and also lets you set reminder timing when creating or editing a subscription. Same-day reminders are supported.'
					},
					{
						question: 'What is required for app notifications?',
						answer:
							'You need to allow notifications in your browser. If reminders do not arrive, check browser and device notification settings first.'
					},
					{
						question: 'When are reminders sent?',
						answer:
							'Reminders are sent based on each billing date and the reminder timing you choose. App notifications and email are sent according to your settings.'
					}
				]
			},
			{
				title: 'Data and usage environment',
				items: [
					{
						question: 'Can I still use the app when my connection is unstable?',
						answer:
							'You can still view information you already opened and in some cases add new items. When your connection returns, those changes are applied afterward.'
					},
					{
						question: 'Which actions need an internet connection?',
						answer:
							'Billing steps and actions that need an immediate update require an internet connection. Some edit or delete actions may also be limited depending on the situation.'
					},
					{
						question: 'What information does SubTrack store?',
						answer:
							'SubTrack uses account details, subscription names, amounts, billing dates, tags, notification settings, and billing-related information needed to provide the service.'
					},
					{
						question: 'Does SubTrack store my credit card details?',
						answer:
							'No. Card details are handled by the payment provider. SubTrack only uses the information needed to keep billing status connected.'
					}
				]
			}
		]
	}
};

export const commercePageCopy: Record<'ja' | 'en', CommercePageCopy> = {
	ja: {
		headTitle: '特定商取引法に基づく表記 | SubTrack',
		headDescription: 'SubTrack の特定商取引法に基づく表記です。',
		eyebrow: 'Legal Notice',
		title: '特定商取引法に基づく表記',
		description: 'SubTrack の有料プランに関する販売条件を記載しています。',
		rows: [
			{ label: '販売事業者', value: 'SubTrack 運営者' },
			{
				label: '運営責任者',
				value: '請求があった場合、法令に基づき遅滞なく電子メールで開示いたします。'
			},
			{
				label: '所在地',
				value: '請求があった場合、法令に基づき遅滞なく電子メールで開示いたします。'
			},
			{
				label: '電話番号',
				value: '請求があった場合、法令に基づき遅滞なく電子メールで開示いたします。'
			},
			{
				label: 'お問い合わせ先',
				value: 'legal@subtracknotify.com'
			},
			{
				label: '販売価格',
				value:
					'Premium 月額300円（税込）、年額3,000円（税込）、Premium 買い切り6,000円（税込）。購入画面に異なる表示がある場合は、購入画面の表示を優先します。'
			},
			{
				label: '商品代金以外の必要料金',
				value: 'インターネット接続に必要な通信料はお客様のご負担となります。'
			},
			{
				label: '代金の支払方法',
				value: 'クレジットカード決済など、購入画面で案内する方法によりお支払いいただきます。'
			},
			{
				label: '代金の支払時期',
				value:
					'サブスクリプションは、無料お試しが適用される場合は無料お試し終了後、その後は各更新時に課金されます。買い切りはお申し込み時に課金されます。'
			},
			{ label: 'サービスの提供時期', value: '決済完了後、直ちにご利用いただけます。' },
			{
				label: '契約期間・自動更新',
				value:
					'サブスクリプションは月単位または年単位で自動更新されます。無料お試しは初回アップグレード時に7日間適用される場合があります。'
			},
			{
				label: '返品・キャンセルについて',
				value:
					'サブスクリプションの解約は、次回更新日の24時間前までにお支払い管理ページからお手続きください。デジタルサービスの性質上、決済完了後の返金は原則として行いません。ただし、法令上必要な場合を除きます。'
			},
			{
				label: '動作環境',
				value:
					'最新の主要ブラウザでの利用を想定しています。ご利用環境により一部機能が異なる場合があります。'
			}
		],
		note: '運営責任者、所在地、電話番号の開示を希望される場合は、legal@subtracknotify.com までご請求ください。購入の判断に必要な時間を確保できるよう、法令に基づき遅滞なく電子メールで開示します。'
	},
	en: {
		headTitle: 'Legal Notice for Commercial Transactions | SubTrack',
		headDescription: 'Legal notice for commercial transactions for SubTrack.',
		eyebrow: 'Legal Notice',
		title: 'Legal Notice for Commercial Transactions',
		description: 'This page describes sales terms related to paid plans in SubTrack.',
		rows: [
			{ label: 'Seller', value: 'SubTrack Operator' },
			{
				label: 'Responsible person',
				value:
					'Will be disclosed by email without delay upon request in accordance with applicable law.'
			},
			{
				label: 'Address',
				value:
					'Will be disclosed by email without delay upon request in accordance with applicable law.'
			},
			{
				label: 'Phone number',
				value:
					'Will be disclosed by email without delay upon request in accordance with applicable law.'
			},
			{
				label: 'Contact',
				value: 'legal@subtracknotify.com'
			},
			{
				label: 'Sales price',
				value:
					'Premium is JPY 300 per month including tax or JPY 3,000 per year including tax. Premium Lifetime is JPY 6,000 including tax. If the purchase screen shows different details, the purchase screen prevails.'
			},
			{
				label: 'Additional fees',
				value:
					'Internet connection and communication charges are the responsibility of the customer.'
			},
			{
				label: 'Payment method',
				value:
					'Payment is made using the methods shown on the purchase screen, such as credit card payment.'
			},
			{
				label: 'Payment timing',
				value:
					'Subscriptions are charged after the free trial ends when a free trial applies, and then at each renewal. Lifetime Purchase is charged at the time of application.'
			},
			{
				label: 'Service delivery timing',
				value: 'The service becomes available immediately after payment is completed.'
			},
			{
				label: 'Term and renewal',
				value:
					'Subscriptions renew automatically monthly or yearly. A 7-day free trial may apply to the first upgrade.'
			},
			{
				label: 'Returns and cancellation',
				value:
					'Subscription cancellation should be completed from the billing management page at least 24 hours before the next renewal date. Due to the nature of digital services, payments are generally non-refundable after completion, except when required by law.'
			},
			{
				label: 'Recommended environment',
				value:
					'Use on the latest major browsers is expected. Some functions may vary depending on the environment.'
			}
		],
		note: 'To request disclosure of the responsible person, address, or phone number, contact legal@subtracknotify.com. The information will be disclosed by email without delay in accordance with applicable law so that there is sufficient time for purchase decisions.'
	}
};
