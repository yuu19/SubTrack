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
	link?: {
		href: string;
		label: string;
	};
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

export type DemoSubscriptionCycle = 'monthly' | 'quarterly' | 'yearly';

export type DemoSubscriptionSample = {
	id: number;
	userId: string | null;
	serviceName: string;
	color: string;
	cycle: DemoSubscriptionCycle;
	amount: number;
	firstPaymentDate: string;
	nextBillingAt: string;
	daysUntilNextBilling: number;
	notifyDaysBefore: number;
	tags: string[];
	isSample: boolean;
	note: string;
};

export type DemoPageCopy = {
	headTitle: string;
	headDescription: string;
	badge: string;
	noticeTitle: string;
	notice: string;
	hero: {
		eyebrow: string;
		title: string;
		description: string;
		primaryAction: string;
		secondaryAction: string;
	};
	tabs: {
		subscriptions: string;
		calendar: string;
		analytics: string;
	};
	common: {
		monthlyTotal: string;
		yearlyTotal: string;
		activeSubscriptions: string;
		nextBilling: string;
		amount: string;
		cycle: string;
		notification: string;
		firstPayment: string;
		tags: string;
	};
	cycleLabels: Record<DemoSubscriptionCycle, string>;
	subscriptions: {
		title: string;
		description: string;
		addTitle: string;
		addDescription: string;
		addAction: string;
		resetAction: string;
		tableTitle: string;
		pushEnable: string;
		pushDisable: string;
		pushEnabled: string;
		pushDisabled: string;
		pushHint: string;
		formServiceName: string;
		formColor: string;
		formColorDescription: string;
		formAmount: string;
		formCycle: string;
		formFirstPayment: string;
		formNotify: string;
		formTags: string;
		formTagsPlaceholder: string;
	};
	calendar: {
		title: string;
		description: string;
	};
	analytics: {
		title: string;
		description: string;
		monthly: string;
		yearly: string;
		totalLabel: string;
		breakdownTitle: string;
		shareLabel: string;
		topServiceLabel: string;
		subscriptionCountLabel: string;
		breakdownCountLabel: string;
		periodHintMonthly: string;
		periodHintYearly: string;
	};
	operations: {
		addedMessage: string;
		resetMessage: string;
		pushEnabledMessage: string;
		pushDisabledMessage: string;
		editBlockedMessage: string;
		deleteBlockedMessage: string;
		selectedEventMessage: string;
	};
	samples: {
		initialSubscriptions: DemoSubscriptionSample[];
		addCandidate: DemoSubscriptionSample;
	};
};

export type LandingMotionDemoCopy = {
	hero: {
		ariaLabel: string;
		windowTitle: string;
		totalLabel: string;
		totalBefore: string;
		totalAfter: string;
		totalHint: string;
		nextBillLabel: string;
		nextBillService: string;
		nextBillDate: string;
		nextBillAmount: string;
		notificationTitle: string;
		notificationBody: string;
		calendarTitle: string;
		calendarItems: string[];
		statusLabel: string;
	};
	add: {
		ariaLabel: string;
		title: string;
		subtitle: string;
		serviceLabel: string;
		serviceName: string;
		amountLabel: string;
		amount: string;
		cycleLabel: string;
		cycle: string;
		button: string;
		addedLabel: string;
		totalLabel: string;
		totalBefore: string;
		totalAfter: string;
	};
	notification: {
		ariaLabel: string;
		title: string;
		subtitle: string;
		cards: Array<{
			title: string;
			body: string;
			meta: string;
		}>;
		settings: string[];
	};
	analytics: {
		ariaLabel: string;
		title: string;
		subtitle: string;
		totalLabel: string;
		total: string;
		reviewLabel: string;
		items: Array<{
			label: string;
			amount: string;
			share: number;
		}>;
	};
	ticker: {
		ariaLabel: string;
		categories: string[];
		cycles: string[];
	};
};

export type LandingFAQItem = {
	question: string;
	answer: string;
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
	motionDemo: LandingMotionDemoCopy;
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
		secondaryCta: string;
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
			secondaryCta: 'デモを見る',
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
		motionDemo: {
			hero: {
				ariaLabel: 'SubTrack のダッシュボードで月額合計、次回請求、通知予定を見るデモ',
				windowTitle: 'SubTrack ダッシュボード',
				totalLabel: '今月の固定費',
				totalBefore: '8,480円',
				totalAfter: '7,280円',
				totalHint: '見直し候補を1件停止した想定',
				nextBillLabel: '次回請求',
				nextBillService: 'クラウドストレージ',
				nextBillDate: '6月18日',
				nextBillAmount: '1,200円',
				notificationTitle: '更新3日前に通知',
				notificationBody: '動画サービスの年額更新を確認',
				calendarTitle: '今週の予定',
				calendarItems: ['動画 6/15', 'ストレージ 6/18', '音楽 6/21'],
				statusLabel: '銀行連携なしで手入力'
			},
			add: {
				ariaLabel: 'サービス名と金額を入力してサブスクを追加するデモ',
				title: 'サブスク追加',
				subtitle: '必要な項目だけを登録',
				serviceLabel: 'サービス名',
				serviceName: '動画サービス',
				amountLabel: '金額',
				amount: '1,200円',
				cycleLabel: '支払い周期',
				cycle: '月額',
				button: '追加する',
				addedLabel: '一覧に追加されました',
				totalLabel: '月額合計',
				totalBefore: '6,080円',
				totalAfter: '7,280円'
			},
			notification: {
				ariaLabel: '更新前通知が届く様子のデモ',
				title: '更新前通知',
				subtitle: '支払日前に確認',
				cards: [
					{
						title: '動画サービス',
						body: '3日後に年額プランが更新されます。',
						meta: '6月15日 9:00'
					},
					{
						title: 'クラウドストレージ',
						body: '明日の請求予定を確認してください。',
						meta: '6月17日 9:00'
					},
					{
						title: 'デザインツール',
						body: '今週の請求予定に追加されました。',
						meta: '6月20日 9:00'
					}
				],
				settings: ['アプリ通知', 'メール', '当日通知']
			},
			analytics: {
				ariaLabel: 'カテゴリ別の支出内訳を確認する分析デモ',
				title: '支出内訳',
				subtitle: '月額換算で確認',
				totalLabel: '合計',
				total: '7,280円',
				reviewLabel: '見直し候補',
				items: [
					{ label: '仕事', amount: '3,200円', share: 44 },
					{ label: '動画・音楽', amount: '2,180円', share: 30 },
					{ label: 'クラウド', amount: '1,900円', share: 26 }
				]
			},
			ticker: {
				ariaLabel: 'カテゴリと支払い周期の管理チップが流れるデモ',
				categories: ['動画', '音楽', '仕事ツール', 'クラウド', '学習', 'ニュース'],
				cycles: ['月額', '年額', '買い切り', '無料期間', '更新前通知', 'CSV']
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
					answer: 'サブスクリプションを最大5件まで登録できます。6件目以降は Premium が必要です。'
				},
				{
					question: '通知はどの方法で受け取れますか？',
					answer: 'アプリ通知、メール、またはその両方を選べます。'
				},
				{
					question: 'カード情報は SubTrack に保存されますか？',
					answer: '保存されません。決済に必要なカード情報はお支払いサービス側で管理されます。'
				},
				{
					question: 'スマホのホーム画面に追加できますか？',
					answer: 'できます。対応ブラウザでは、ホーム画面に追加してアプリのように開けます。'
				},
				{
					question: '有料プランの解約や請求情報の変更はどこで行いますか？',
					answer: 'ログイン後、設定画面からお支払い管理ページを開いて手続きできます。'
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
			cta: 'Googleアカウントでログイン/登録する',
			secondaryCta: 'デモを見る'
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
			secondaryCta: 'View demo',
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
		motionDemo: {
			hero: {
				ariaLabel:
					'Demo of the SubTrack dashboard showing monthly total, next billing, and reminder status',
				windowTitle: 'SubTrack dashboard',
				totalLabel: 'Monthly recurring cost',
				totalBefore: 'JPY 8,480',
				totalAfter: 'JPY 7,280',
				totalHint: 'After reviewing one inactive service',
				nextBillLabel: 'Next billing',
				nextBillService: 'Cloud storage',
				nextBillDate: 'Jun 18',
				nextBillAmount: 'JPY 1,200',
				notificationTitle: 'Reminder 3 days before',
				notificationBody: 'Review the annual video plan renewal',
				calendarTitle: 'This week',
				calendarItems: ['Video Jun 15', 'Storage Jun 18', 'Music Jun 21'],
				statusLabel: 'Manual tracking, no bank link'
			},
			add: {
				ariaLabel: 'Demo of adding a subscription by entering service name and amount',
				title: 'Add subscription',
				subtitle: 'Track only what you need',
				serviceLabel: 'Service',
				serviceName: 'Video service',
				amountLabel: 'Amount',
				amount: 'JPY 1,200',
				cycleLabel: 'Billing cycle',
				cycle: 'Monthly',
				button: 'Add',
				addedLabel: 'Added to your list',
				totalLabel: 'Monthly total',
				totalBefore: 'JPY 6,080',
				totalAfter: 'JPY 7,280'
			},
			notification: {
				ariaLabel: 'Demo of renewal reminders arriving before payment dates',
				title: 'Renewal reminders',
				subtitle: 'Check before payment',
				cards: [
					{
						title: 'Video service',
						body: 'The annual plan renews in 3 days.',
						meta: 'Jun 15, 9:00'
					},
					{
						title: 'Cloud storage',
						body: 'Review tomorrow’s scheduled charge.',
						meta: 'Jun 17, 9:00'
					},
					{
						title: 'Design tool',
						body: 'Added to this week’s billing schedule.',
						meta: 'Jun 20, 9:00'
					}
				],
				settings: ['App notification', 'Email', 'Same-day reminder']
			},
			analytics: {
				ariaLabel: 'Demo of reviewing spending breakdown by category',
				title: 'Spending breakdown',
				subtitle: 'Converted to monthly cost',
				totalLabel: 'Total',
				total: 'JPY 7,280',
				reviewLabel: 'Review candidate',
				items: [
					{ label: 'Work', amount: 'JPY 3,200', share: 44 },
					{ label: 'Video and music', amount: 'JPY 2,180', share: 30 },
					{ label: 'Cloud', amount: 'JPY 1,900', share: 26 }
				]
			},
			ticker: {
				ariaLabel: 'Demo of category and billing-cycle chips scrolling',
				categories: ['Video', 'Music', 'Work tools', 'Cloud', 'Learning', 'News'],
				cycles: ['Monthly', 'Annual', 'Lifetime', 'Trial', 'Reminder', 'CSV']
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
					answer: 'You can add up to 5 subscriptions. Premium is required for the sixth and later.'
				},
				{
					question: 'Which reminder methods are supported?',
					answer: 'You can choose app notifications, email, or both.'
				},
				{
					question: 'Does SubTrack store card details?',
					answer: 'No. Card details are handled by the payment provider, not by SubTrack.'
				},
				{
					question: 'Can I add it to my phone home screen?',
					answer:
						'Yes. Supported browsers let you add SubTrack to your home screen and open it like an app.'
				},
				{
					question: 'Where do I manage cancellation or billing details?',
					answer: 'After logging in, open the billing management page from settings.'
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
			cta: 'Continue with Google',
			secondaryCta: 'View demo'
		}
	}
};

export const demoPageCopy: Record<AppLocale, DemoPageCopy> = {
	ja: {
		headTitle: '公開デモ | SubTrack',
		headDescription:
			'SubTrack の公開デモです。サンプルデータだけでサブスク一覧、カレンダー、分析、通知確認を疑似操作できます。',
		badge: 'Demo Mode',
		noticeTitle: '公開デモ',
		notice:
			'サンプルデータのみを使用します。保存、通知送信、Push登録、決済、実アカウントの更新は発生しません。',
		hero: {
			eyebrow: 'SubTrack の使用例',
			title: 'ログイン前に、サブスク管理の流れを試せます。',
			description:
				'Netflix、Spotify、Notion、Adobe Creative Cloud などのサンプル契約を使って、追加、請求予定、通知設定、分析切替をブラウザ内だけで体験できます。',
			primaryAction: '実際に始める',
			secondaryAction: 'LPに戻る'
		},
		tabs: {
			subscriptions: 'Subscriptions',
			calendar: 'Calendar',
			analytics: 'Analysis'
		},
		common: {
			monthlyTotal: '月額換算',
			yearlyTotal: '年額換算',
			activeSubscriptions: '登録中',
			nextBilling: '次回請求',
			amount: '金額',
			cycle: '周期',
			notification: '通知',
			firstPayment: '初回支払日',
			tags: 'タグ'
		},
		cycleLabels: {
			monthly: '月額',
			quarterly: '3ヶ月ごと',
			yearly: '年額'
		},
		subscriptions: {
			title: 'サブスク一覧',
			description:
				'実アプリと同じ流れでサンプル契約を確認できます。追加とPush切替はブラウザ内のローカル状態だけを更新します。',
			addTitle: 'Google One を追加',
			addDescription:
				'実フォームに近い項目を入力できます。送信してもDBやAPIには接続せず、デモ内の一覧だけを更新します。',
			addAction: '追加する',
			resetAction: 'リセット',
			tableTitle: '登録済みサンプル',
			pushEnable: '通知を有効化',
			pushDisable: '通知を無効化',
			pushEnabled: 'Push有効',
			pushDisabled: 'Push無効',
			pushHint: 'デモではブラウザ許可やPush登録は行わず、表示状態だけを切り替えます。',
			formServiceName: 'サービス名',
			formColor: '色',
			formColorDescription: 'カレンダーと分析画面で使う表示色です。',
			formAmount: '金額',
			formCycle: '支払い周期',
			formFirstPayment: '初回支払日',
			formNotify: '通知タイミング',
			formTags: 'タグ',
			formTagsPlaceholder: 'クラウド, 仕事'
		},
		calendar: {
			title: 'カレンダー',
			description: '2026年6月のサンプル請求予定を、実カレンダー表示に近い形で確認できます。'
		},
		analytics: {
			title: '分析',
			description: '月額換算と年額換算を切り替え、サービス別の割合を確認できます。',
			monthly: '月額',
			yearly: '年額',
			totalLabel: '合計',
			breakdownTitle: 'サービス別内訳',
			shareLabel: '割合',
			topServiceLabel: '最大の支出',
			subscriptionCountLabel: '登録数',
			breakdownCountLabel: '内訳数',
			periodHintMonthly: '年額契約は月額換算で表示します。',
			periodHintYearly: '月額契約は年額換算で表示します。'
		},
		operations: {
			addedMessage: 'Google One をデモ一覧に追加しました。',
			resetMessage: 'デモを初期状態に戻しました。',
			pushEnabledMessage: 'Push通知の表示状態を有効にしました。実際の登録は行っていません。',
			pushDisabledMessage: 'Push通知の表示状態を無効にしました。実際の登録解除は行っていません。',
			editBlockedMessage: 'デモでは編集内容を保存しません。',
			deleteBlockedMessage: 'デモでは契約を削除しません。',
			selectedEventMessage: 'カレンダー予定を選択しました。'
		},
		samples: {
			initialSubscriptions: [
				{
					id: 1,
					userId: null,
					serviceName: 'Netflix',
					color: 'red',
					cycle: 'monthly',
					amount: 1490,
					firstPaymentDate: '2026-06-15',
					nextBillingAt: '2026-06-15',
					daysUntilNextBilling: 2,
					notifyDaysBefore: 3,
					tags: ['動画', 'エンタメ'],
					isSample: true,
					note: '週末前に視聴状況を確認'
				},
				{
					id: 2,
					userId: null,
					serviceName: 'Spotify',
					color: 'green',
					cycle: 'monthly',
					amount: 980,
					firstPaymentDate: '2026-06-21',
					nextBillingAt: '2026-06-21',
					daysUntilNextBilling: 8,
					notifyDaysBefore: 1,
					tags: ['音楽'],
					isSample: true,
					note: '家族プラン移行を検討'
				},
				{
					id: 3,
					userId: null,
					serviceName: 'Notion',
					color: 'purple',
					cycle: 'yearly',
					amount: 12000,
					firstPaymentDate: '2026-06-28',
					nextBillingAt: '2026-06-28',
					daysUntilNextBilling: 15,
					notifyDaysBefore: 7,
					tags: ['仕事', 'ツール'],
					isSample: true,
					note: '年額更新前にワークスペースを確認'
				},
				{
					id: 4,
					userId: null,
					serviceName: 'Adobe Creative Cloud',
					color: 'orange',
					cycle: 'monthly',
					amount: 3280,
					firstPaymentDate: '2026-06-20',
					nextBillingAt: '2026-06-20',
					daysUntilNextBilling: 7,
					notifyDaysBefore: 3,
					tags: ['制作'],
					isSample: true,
					note: '使っているアプリを棚卸し'
				},
				{
					id: 5,
					userId: null,
					serviceName: 'Figma',
					color: 'yellow',
					cycle: 'quarterly',
					amount: 4500,
					firstPaymentDate: '2026-06-18',
					nextBillingAt: '2026-06-18',
					daysUntilNextBilling: 5,
					notifyDaysBefore: 7,
					tags: ['デザイン', '仕事'],
					isSample: true,
					note: '共同編集メンバーを確認'
				}
			],
			addCandidate: {
				id: 100,
				userId: null,
				serviceName: 'Google One',
				color: 'blue',
				cycle: 'monthly',
				amount: 250,
				firstPaymentDate: '2026-06-24',
				nextBillingAt: '2026-06-24',
				daysUntilNextBilling: 11,
				notifyDaysBefore: 3,
				tags: ['クラウド'],
				isSample: true,
				note: 'ストレージ容量を確認'
			}
		}
	},
	en: {
		headTitle: 'Public Demo | SubTrack',
		headDescription:
			'Try the SubTrack public demo with sample-only subscriptions, calendar events, analytics, and reminder states.',
		badge: 'Demo Mode',
		noticeTitle: 'Public demo',
		notice:
			'This uses sample data only. It does not save data, send reminders, register push notifications, start payments, or update a real account.',
		hero: {
			eyebrow: 'SubTrack example workflow',
			title: 'Try the subscription workflow before signing in.',
			description:
				'Use sample subscriptions such as Netflix, Spotify, Notion, and Adobe Creative Cloud to try adding an item, reviewing billing dates, toggling reminders, and switching analysis views in your browser only.',
			primaryAction: 'Start for real',
			secondaryAction: 'Back to landing'
		},
		tabs: {
			subscriptions: 'Subscriptions',
			calendar: 'Calendar',
			analytics: 'Analysis'
		},
		common: {
			monthlyTotal: 'Monthly equivalent',
			yearlyTotal: 'Yearly equivalent',
			activeSubscriptions: 'Active',
			nextBilling: 'Next billing',
			amount: 'Amount',
			cycle: 'Cycle',
			notification: 'Reminder',
			firstPayment: 'First payment',
			tags: 'Tags'
		},
		cycleLabels: {
			monthly: 'Monthly',
			quarterly: 'Every 3 months',
			yearly: 'Yearly'
		},
		subscriptions: {
			title: 'Subscriptions',
			description:
				'Review sample subscriptions with a flow close to the signed-in app. Adding items and toggling push only updates local browser state.',
			addTitle: 'Add Google One',
			addDescription:
				'This form mirrors the real inputs, but it does not connect to the database or an API. It only updates the demo list.',
			addAction: 'Add',
			resetAction: 'Reset',
			tableTitle: 'Sample subscriptions',
			pushEnable: 'Enable reminders',
			pushDisable: 'Disable reminders',
			pushEnabled: 'Push enabled',
			pushDisabled: 'Push disabled',
			pushHint:
				'The demo does not request browser permission or register Push. It only changes the visible state.',
			formServiceName: 'Service name',
			formColor: 'Color',
			formColorDescription: 'Used for calendar and analysis views.',
			formAmount: 'Amount',
			formCycle: 'Billing cycle',
			formFirstPayment: 'First payment date',
			formNotify: 'Reminder timing',
			formTags: 'Tags',
			formTagsPlaceholder: 'Cloud, Work'
		},
		calendar: {
			title: 'Calendar',
			description:
				'Review sample billing events for June 2026 in a view close to the real calendar.'
		},
		analytics: {
			title: 'Analysis',
			description: 'Switch between monthly and yearly equivalents and review service shares.',
			monthly: 'Monthly',
			yearly: 'Yearly',
			totalLabel: 'Total',
			breakdownTitle: 'Service breakdown',
			shareLabel: 'Share',
			topServiceLabel: 'Top service',
			subscriptionCountLabel: 'Subscriptions',
			breakdownCountLabel: 'Breakdowns',
			periodHintMonthly: 'Annual plans are shown as monthly equivalents.',
			periodHintYearly: 'Monthly plans are shown as yearly equivalents.'
		},
		operations: {
			addedMessage: 'Google One was added to the demo list.',
			resetMessage: 'The demo was reset to its initial state.',
			pushEnabledMessage: 'Push is shown as enabled. No real registration was created.',
			pushDisabledMessage: 'Push is shown as disabled. No real registration was removed.',
			editBlockedMessage: 'The demo does not save edits.',
			deleteBlockedMessage: 'The demo does not delete subscriptions.',
			selectedEventMessage: 'Calendar event selected.'
		},
		samples: {
			initialSubscriptions: [
				{
					id: 1,
					userId: null,
					serviceName: 'Netflix',
					color: 'red',
					cycle: 'monthly',
					amount: 1490,
					firstPaymentDate: '2026-06-15',
					nextBillingAt: '2026-06-15',
					daysUntilNextBilling: 2,
					notifyDaysBefore: 3,
					tags: ['Video', 'Entertainment'],
					isSample: true,
					note: 'Review watch usage before the weekend'
				},
				{
					id: 2,
					userId: null,
					serviceName: 'Spotify',
					color: 'green',
					cycle: 'monthly',
					amount: 980,
					firstPaymentDate: '2026-06-21',
					nextBillingAt: '2026-06-21',
					daysUntilNextBilling: 8,
					notifyDaysBefore: 1,
					tags: ['Music'],
					isSample: true,
					note: 'Consider whether a family plan fits'
				},
				{
					id: 3,
					userId: null,
					serviceName: 'Notion',
					color: 'purple',
					cycle: 'yearly',
					amount: 12000,
					firstPaymentDate: '2026-06-28',
					nextBillingAt: '2026-06-28',
					daysUntilNextBilling: 15,
					notifyDaysBefore: 7,
					tags: ['Work', 'Tools'],
					isSample: true,
					note: 'Review workspace usage before annual renewal'
				},
				{
					id: 4,
					userId: null,
					serviceName: 'Adobe Creative Cloud',
					color: 'orange',
					cycle: 'monthly',
					amount: 3280,
					firstPaymentDate: '2026-06-20',
					nextBillingAt: '2026-06-20',
					daysUntilNextBilling: 7,
					notifyDaysBefore: 3,
					tags: ['Creative'],
					isSample: true,
					note: 'Check which apps are still in use'
				},
				{
					id: 5,
					userId: null,
					serviceName: 'Figma',
					color: 'yellow',
					cycle: 'quarterly',
					amount: 4500,
					firstPaymentDate: '2026-06-18',
					nextBillingAt: '2026-06-18',
					daysUntilNextBilling: 5,
					notifyDaysBefore: 7,
					tags: ['Design', 'Work'],
					isSample: true,
					note: 'Review collaborating seats'
				}
			],
			addCandidate: {
				id: 100,
				userId: null,
				serviceName: 'Google One',
				color: 'blue',
				cycle: 'monthly',
				amount: 250,
				firstPaymentDate: '2026-06-24',
				nextBillingAt: '2026-06-24',
				daysUntilNextBilling: 11,
				notifyDaysBefore: 3,
				tags: ['Cloud'],
				isSample: true,
				note: 'Review storage usage'
			}
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
							'ブラウザで通知を許可する必要があります。通知が届かない場合は、ブラウザと端末の通知設定をご確認ください。',
						link: {
							href: 'https://subtracknotify.com/push',
							label: 'Push通知の詳しい設定手順を見る'
						}
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
							'You need to allow notifications in your browser. If reminders do not arrive, check browser and device notification settings first.',
						link: {
							href: 'https://subtracknotify.com/push',
							label: 'View the push notification setup guide'
						}
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
