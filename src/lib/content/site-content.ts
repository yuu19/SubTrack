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
	const title = normalizeInline(lines.find((line) => line.startsWith('# '))?.replace(/^#\s+/, '') ?? '');
	const updatedAt = extractUpdatedAt(lines);

	const sections: ContentSection[] = [];
	let currentSection: ContentSection | null = null;
	let blockLines: string[] = [];

	const flushBlock = () => {
		if (!currentSection || blockLines.length === 0) return;

		const filtered = blockLines.map((line) => line.trimEnd()).filter((line) => line.trim().length > 0);
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
			{ label: '販売事業者', value: 'SubTrack' },
			{ label: '運営責任者', value: '請求があった場合は遅滞なく開示いたします。' },
			{ label: '所在地', value: '請求があった場合は遅滞なく開示いたします。' },
			{ label: '電話番号', value: '請求があった場合は遅滞なく開示いたします。' },
			{
				label: 'お問い合わせ先',
				value: '本サービス上のお問い合わせ窓口またはご案内する連絡先よりお問い合わせください。'
			},
			{ label: '販売価格', value: '各プランの購入画面または設定画面に表示する金額です。' },
			{
				label: '商品代金以外の必要料金',
				value: 'インターネット接続に必要な通信料はお客様のご負担となります。'
			},
			{ label: '代金の支払方法', value: 'クレジットカード決済など、購入画面で案内する方法によりお支払いいただきます。' },
			{ label: '代金の支払時期', value: '有料プランのお申し込み時、または契約更新時に課金されます。' },
			{ label: 'サービスの提供時期', value: '決済完了後、直ちにご利用いただけます。' },
			{
				label: '返品・キャンセルについて',
				value: 'デジタルサービスの性質上、決済完了後の返品はお受けしていません。解約は次回更新日までにお支払い管理ページからお手続きください。'
			},
			{
				label: '動作環境',
				value: '最新の主要ブラウザでの利用を想定しています。ご利用環境により一部機能が異なる場合があります。'
			}
		],
		note: '表記内容は必要に応じて更新されることがあります。'
	},
	en: {
		headTitle: 'Legal Notice for Commercial Transactions | SubTrack',
		headDescription: 'Legal notice for commercial transactions for SubTrack.',
		eyebrow: 'Legal Notice',
		title: 'Legal Notice for Commercial Transactions',
		description: 'This page describes sales terms related to paid plans in SubTrack.',
		rows: [
			{ label: 'Seller', value: 'SubTrack' },
			{ label: 'Responsible person', value: 'Will be disclosed without delay upon request.' },
			{ label: 'Address', value: 'Will be disclosed without delay upon request.' },
			{ label: 'Phone number', value: 'Will be disclosed without delay upon request.' },
			{
				label: 'Contact',
				value: 'Please contact us through the in-service inquiry channel or the contact method provided by the service.'
			},
			{ label: 'Sales price', value: 'The amount shown on the purchase screen or settings page for each plan.' },
			{
				label: 'Additional fees',
				value: 'Internet connection and communication charges are the responsibility of the customer.'
			},
			{
				label: 'Payment method',
				value: 'Payment is made using the methods shown on the purchase screen, such as credit card payment.'
			},
			{ label: 'Payment timing', value: 'Charges apply when a paid plan is started or renewed.' },
			{ label: 'Service delivery timing', value: 'The service becomes available immediately after payment is completed.' },
			{
				label: 'Returns and cancellation',
				value: 'Because this is a digital service, returns are not accepted after payment is completed. Cancellation should be completed from the billing management page before the next renewal date.'
			},
			{
				label: 'Recommended environment',
				value: 'Use on the latest major browsers is expected. Some functions may vary depending on the environment.'
			}
		],
		note: 'These details may be updated when needed.'
	}
};
