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
