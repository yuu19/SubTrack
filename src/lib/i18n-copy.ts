import { DEFAULT_LOCALE, type AppLocale } from '$lib/constant';
import { SUBTRACK_LOCALE_COOKIE, selectPreferredLocale } from '$lib/locale-routing';

export type LocalizedCopy<T> = Record<AppLocale, T>;

export type CookieReader = {
	get(name: string): string | undefined;
};

export const resolveUserFacingLocale = ({
	cookieLocale,
	acceptLanguage,
	userLocale
}: {
	cookieLocale?: string | null;
	acceptLanguage?: string | null;
	userLocale?: string | null;
} = {}): AppLocale =>
	selectPreferredLocale({
		userLocale,
		cookieLocale,
		acceptLanguage
	});

export const resolveRequestLocale = (request: Request, cookies?: CookieReader): AppLocale =>
	resolveUserFacingLocale({
		cookieLocale: cookies?.get(SUBTRACK_LOCALE_COOKIE),
		acceptLanguage: request.headers.get('accept-language')
	});

export const subscriptionEmailCopy = {
	ja: {
		trialPlanFallback: 'ご利用中のプラン',
		trialSubject: (serviceName: string) => `【重要】${serviceName} 自動課金のご案内（3日後）`,
		trialHtml: ({
			recipientName,
			serviceName,
			endDate,
			manageUrl
		}: {
			recipientName: string;
			serviceName: string;
			endDate: string;
			manageUrl: string;
		}) => `
			<p>${recipientName} 様</p>
			<p>${serviceName}をご利用いただきありがとうございます。</p>
			<p>${endDate} より、ご登録プランの自動課金が開始されます。</p>
			<p>課金を希望されない場合は、終了日までにプランの変更・解約をお願いいたします。</p>
			<p>▼ プラン管理</p>
			<p><a href="${manageUrl}">${manageUrl}</a></p>
			<p>※ 本メールと行き違いで手続き済みの場合はご了承ください。</p>
		`,
		trialText: ({
			recipientName,
			serviceName,
			endDate,
			manageUrl
		}: {
			recipientName: string;
			serviceName: string;
			endDate: string;
			manageUrl: string;
		}) =>
			`${recipientName} 様\n\n${serviceName}をご利用いただきありがとうございます。\n\n${endDate} より、\nご登録プランの自動課金が開始されます。\n\n課金を希望されない場合は、\n終了日までにプランの変更・解約をお願いいたします。\n\n▼ プラン管理\n${manageUrl}\n\n※ 本メールと行き違いで手続き済みの場合はご了承ください。`,
		reminderWhen: (notifyDays: number) =>
			notifyDays === 0 ? '本日が支払い日です。' : `支払いまであと${notifyDays}日です。`,
		reminderSubject: (serviceName: string, notifyDays: number) =>
			notifyDays === 0
				? `【支払い当日】${serviceName}のサブスク通知`
				: `【支払い通知】${serviceName}の支払いまであと${notifyDays}日`,
		reminderListLabel: 'サブスク一覧',
		reminderDateLabel: '支払日',
		reminderIntro: (serviceName: string) => `${serviceName}の支払いについてのお知らせです。`
	},
	en: {
		trialPlanFallback: 'your current plan',
		trialSubject: (serviceName: string) =>
			`Important: ${serviceName} automatic billing starts in 3 days`,
		trialHtml: ({
			recipientName,
			serviceName,
			endDate,
			manageUrl
		}: {
			recipientName: string;
			serviceName: string;
			endDate: string;
			manageUrl: string;
		}) => `
			<p>Hi ${recipientName},</p>
			<p>Thanks for using ${serviceName}.</p>
			<p>Automatic billing for your plan will start on ${endDate}.</p>
			<p>If you do not want to be charged, please change or cancel your plan before the trial ends.</p>
			<p>Plan management</p>
			<p><a href="${manageUrl}">${manageUrl}</a></p>
			<p>If you already made changes, you can ignore this email.</p>
		`,
		trialText: ({
			recipientName,
			serviceName,
			endDate,
			manageUrl
		}: {
			recipientName: string;
			serviceName: string;
			endDate: string;
			manageUrl: string;
		}) =>
			`Hi ${recipientName},\n\nThanks for using ${serviceName}.\n\nAutomatic billing for your plan will start on ${endDate}.\n\nIf you do not want to be charged, please change or cancel your plan before the trial ends.\n\nPlan management\n${manageUrl}\n\nIf you already made changes, you can ignore this email.`,
		reminderWhen: (notifyDays: number) =>
			notifyDays === 0
				? 'Your payment is due today.'
				: `Your payment is due in ${notifyDays} day${notifyDays === 1 ? '' : 's'}.`,
		reminderSubject: (serviceName: string, notifyDays: number) =>
			notifyDays === 0
				? `[Payment due today] ${serviceName} subscription reminder`
				: `[Payment reminder] ${serviceName} payment due in ${notifyDays} day${
						notifyDays === 1 ? '' : 's'
					}`,
		reminderListLabel: 'Subscriptions',
		reminderDateLabel: 'Payment date',
		reminderIntro: (serviceName: string) => `This is a reminder for your ${serviceName} payment.`
	}
} satisfies LocalizedCopy<{
	trialPlanFallback: string;
	trialSubject: (serviceName: string) => string;
	trialHtml: (input: {
		recipientName: string;
		serviceName: string;
		endDate: string;
		manageUrl: string;
	}) => string;
	trialText: (input: {
		recipientName: string;
		serviceName: string;
		endDate: string;
		manageUrl: string;
	}) => string;
	reminderWhen: (notifyDays: number) => string;
	reminderSubject: (serviceName: string, notifyDays: number) => string;
	reminderListLabel: string;
	reminderDateLabel: string;
	reminderIntro: (serviceName: string) => string;
}>;

export const subscriptionNotificationCopy = {
	ja: {
		title: 'サブスクの支払い通知',
		when: (notifyDays: number) =>
			notifyDays === 0 ? '今日が支払い日です。' : `支払いまであと${notifyDays}日です。`,
		notSet: '未設定',
		fallbackTitle: 'SubTrack'
	},
	en: {
		title: 'Subscription payment reminder',
		when: (notifyDays: number) =>
			notifyDays === 0
				? 'Your payment is due today.'
				: `Your payment is due in ${notifyDays} day${notifyDays === 1 ? '' : 's'}.`,
		notSet: 'Not set',
		fallbackTitle: 'SubTrack'
	}
} satisfies LocalizedCopy<{
	title: string;
	when: (notifyDays: number) => string;
	notSet: string;
	fallbackTitle: string;
}>;

export const subscriptionFormCopy = {
	ja: {
		errors: {
			selectRequired: '請求サイクルを選択してください。',
			numberRequired: '有効な金額を入力してください。',
			numberMin: '金額は0以上で入力してください。',
			numberMax: '金額は1000000以下で入力してください。',
			numberDecimals: '金額は小数2桁までで入力してください。',
			dateRequired: '支払開始日を選択してください。',
			serviceNameRequired: 'サービス名を入力してください。',
			httpsUrl: 'https:// から始まるURLを入力してください。',
			iconRequired: 'アイコンを選択してください。',
			iconMax: 'アイコンの値は2048文字以内にしてください。',
			notifyDaysRequired: '通知日数を選択してください。',
			validServiceIcon: '有効なサービスアイコンを選択してください。'
		},
		fields: {
			icon: 'アイコン',
			iconDescription: '一覧と詳細画面でサービスを見分けるために使います。',
			officialWebsiteUrl: '公式サイトURL',
			officialWebsiteDescription: 'この公式サイトURLからアイコンを自動取得します。',
			uploadedImage: 'アップロード画像',
			uploadedImageDescription: 'Premiumでは1MBまでのPNG、JPEG、WebP画像をアップロードできます。',
			currency: '通貨',
			category: 'カテゴリー',
			paymentMethod: '支払い方法',
			notSet: '未設定',
			managementSummary: 'カテゴリー・支払い方法を管理',
			managementAddSummary: 'カテゴリー・支払い方法を追加',
			managementSection: 'カテゴリー・支払い方法'
		},
		actions: {
			enterManually: '手動で入力する',
			backToTemplates: 'テンプレート一覧に戻る',
			change: '変更する',
			recommended: 'おすすめ',
			emoji: '絵文字',
			getFromOfficialWebsite: '公式サイトから取得',
			useThisUrl: 'このURLから取得',
			uploading: 'アップロード中...',
			replaceImage: '画像を差し替え',
			uploadImage: '画像をアップロード'
		},
		notices: {
			imageUploadPremium: '画像アップロードはPremiumで利用できます。',
			imageUploadFailed: '画像のアップロードに失敗しました。',
			imageTypeInvalid: 'PNG、JPEG、WebP画像を選択してください。',
			imageTooLarge: '画像ファイルは1MB以下にしてください。'
		}
	},
	en: {
		errors: {
			selectRequired: 'Please select a billing cycle.',
			numberRequired: 'Please enter a valid amount.',
			numberMin: 'Amount must be at least 0.',
			numberMax: 'Amount must not exceed 1000000.',
			numberDecimals: 'Please enter up to two decimal places.',
			dateRequired: 'Please select a first payment date.',
			serviceNameRequired: 'Please enter the service name.',
			httpsUrl: 'Please enter a URL that starts with https://.',
			iconRequired: 'Please select an icon.',
			iconMax: 'Icon value must be 2048 characters or fewer.',
			notifyDaysRequired: 'Please select notify days.',
			validServiceIcon: 'Please select a valid service icon.'
		},
		fields: {
			icon: 'Icon',
			iconDescription: 'Shown in subscription lists and detail views.',
			officialWebsiteUrl: 'Official website URL',
			officialWebsiteDescription:
				'The icon is retrieved automatically from this official website URL.',
			uploadedImage: 'Uploaded image',
			uploadedImageDescription: 'Premium users can upload PNG, JPEG, or WebP images up to 1MB.',
			currency: 'Currency',
			category: 'Category',
			paymentMethod: 'Payment method',
			notSet: 'Not set',
			managementSummary: 'Manage categories and payment methods',
			managementAddSummary: 'Add category or payment method',
			managementSection: 'Category and payment'
		},
		actions: {
			enterManually: 'Enter manually',
			backToTemplates: 'Back to templates',
			change: 'Change',
			recommended: 'Recommended',
			emoji: 'Emoji',
			getFromOfficialWebsite: 'Get from official website',
			useThisUrl: 'Use this URL',
			uploading: 'Uploading...',
			replaceImage: 'Replace image',
			uploadImage: 'Upload image'
		},
		notices: {
			imageUploadPremium: 'Image uploads are available on Premium.',
			imageUploadFailed: 'Failed to upload image.',
			imageTypeInvalid: 'Please select a PNG, JPEG, or WebP image.',
			imageTooLarge: 'Image file must be 1MB or smaller.'
		}
	}
} satisfies LocalizedCopy<{
	errors: Record<
		| 'selectRequired'
		| 'numberRequired'
		| 'numberMin'
		| 'numberMax'
		| 'numberDecimals'
		| 'dateRequired'
		| 'serviceNameRequired'
		| 'httpsUrl'
		| 'iconRequired'
		| 'iconMax'
		| 'notifyDaysRequired'
		| 'validServiceIcon',
		string
	>;
	fields: Record<
		| 'icon'
		| 'iconDescription'
		| 'officialWebsiteUrl'
		| 'officialWebsiteDescription'
		| 'uploadedImage'
		| 'uploadedImageDescription'
		| 'currency'
		| 'category'
		| 'paymentMethod'
		| 'notSet'
		| 'managementSummary'
		| 'managementAddSummary'
		| 'managementSection',
		string
	>;
	actions: Record<
		| 'enterManually'
		| 'backToTemplates'
		| 'change'
		| 'recommended'
		| 'emoji'
		| 'getFromOfficialWebsite'
		| 'useThisUrl'
		| 'uploading'
		| 'replaceImage'
		| 'uploadImage',
		string
	>;
	notices: Record<
		'imageUploadPremium' | 'imageUploadFailed' | 'imageTypeInvalid' | 'imageTooLarge',
		string
	>;
}>;

export const subscriptionActionCopy = {
	ja: {
		databaseUnavailable: 'データベースを利用できません。',
		loginRequired: 'ログインしてください。',
		imageAfterCreate: '画像は作成後に編集画面から設定してください。',
		imageFromUploadOnly: '画像はアップロード操作から設定してください。',
		freeLimitReached: '無料プランはサブスクリプションを最大5件まで登録できます。',
		subscriptionSaved: 'サブスクを保存しました。',
		subscriptionNotFound: 'サブスクが見つかりません。',
		invalidSubscriptionId: 'サブスクIDが不正です。',
		saveFailed: 'サブスクの保存に失敗しました。',
		updateFailed: 'サブスクの更新に失敗しました。',
		cancelFailed: 'サブスクの解約に失敗しました。',
		reactivateFailed: 'サブスクの再開に失敗しました。',
		deleteFailed: 'サブスクの削除に失敗しました。'
	},
	en: {
		databaseUnavailable: 'Database is not available.',
		loginRequired: 'Please log in.',
		imageAfterCreate: 'Set an image from the edit screen after creating the subscription.',
		imageFromUploadOnly: 'Set images from the upload action.',
		freeLimitReached: 'Free users can register up to 5 subscriptions.',
		subscriptionSaved: 'Subscription saved.',
		subscriptionNotFound: 'Subscription not found.',
		invalidSubscriptionId: 'Invalid subscription id.',
		saveFailed: 'Failed to save subscription.',
		updateFailed: 'Failed to update subscription.',
		cancelFailed: 'Failed to cancel subscription.',
		reactivateFailed: 'Failed to reactivate subscription.',
		deleteFailed: 'Failed to delete subscription.'
	}
} satisfies LocalizedCopy<Record<string, string>>;

export const subscriptionIconUploadCopy = {
	ja: {
		invalidSubscriptionId: 'サブスクIDが不正です。',
		storageUnavailable: 'ストレージを利用できません。',
		loginRequired: 'ログインしてください。',
		premiumRequired: '画像アップロードはPremiumで利用できます。',
		subscriptionNotFound: 'サブスクが見つかりません。',
		uploadFailed: '画像のアップロードに失敗しました。',
		imageRequired: '画像ファイルを選択してください。',
		imageEmpty: '画像ファイルが空です。',
		imageTooLarge: '画像ファイルは1MB以下にしてください。',
		imageInvalidType: 'PNG、JPEG、WebP画像を選択してください。',
		imageContentMismatch: '画像ファイルの内容と形式が一致しません。'
	},
	en: {
		invalidSubscriptionId: 'Invalid subscription id.',
		storageUnavailable: 'Storage is not available.',
		loginRequired: 'Please log in.',
		premiumRequired: 'Image uploads are available with Premium.',
		subscriptionNotFound: 'Subscription not found.',
		uploadFailed: 'Failed to upload image.',
		imageRequired: 'Select an image file.',
		imageEmpty: 'Image file is empty.',
		imageTooLarge: 'Image file must be 1MB or smaller.',
		imageInvalidType: 'Image file must be PNG, JPEG, or WebP.',
		imageContentMismatch: 'Image file content does not match its type.'
	}
} satisfies LocalizedCopy<Record<string, string>>;

export const settingsBillingCopy = {
	ja: {
		commerceLink: '特定商取引法に基づく表記',
		managementTitle: '管理項目',
		managementDescription: 'サブスクに紐付けるカテゴリーと支払い方法を管理します。'
	},
	en: {
		commerceLink: 'Commercial Transactions',
		managementTitle: 'Management items',
		managementDescription: 'Manage categories and payment methods used by subscriptions.'
	}
} satisfies LocalizedCopy<
	Record<'commerceLink' | 'managementTitle' | 'managementDescription', string>
>;

export const settingsPlanBillingCopy = {
	ja: {
		recommended: 'おすすめ',
		lifetimeTitle: 'Premium 買い切り',
		lifetimePrice: '3,000円',
		lifetimeCycle: '一度だけのお支払い',
		lifetimeDescription: '月額を増やさず、Premium機能をそのまま使い続けられます。',
		lifetimeCta: '3,000円で買い切る',
		monthlyTitle: 'Premium 月額',
		monthlyPrice: '300円',
		monthlyCycle: '月額',
		monthlyDescription: '月ごとの支払いでPremiumを利用できます。まず試したい方向けです。',
		monthlyCta: '月額Premiumを始める',
		trialNote: '初回アップグレード時は7日間無料の場合があります。',
		checkoutNote: '購入画面で最終金額や外貨表示が案内される場合があります。',
		monthlyToLifetimeTitle: '買い切りに切り替える',
		monthlyToLifetimeDescription:
			'月額プランが有効な間でも買い切りを購入できます。購入後、次回更新前にプラン管理画面から月額プランをキャンセルしてください。',
		monthlyToLifetimePendingDescription:
			'月額プランは解約予定です。期限後も Premium を使う場合は、継続課金なしの買い切りを購入できます。',
		lifetimeWithMonthlyTitle: '買い切り購入済みです。月額プランはまだ有効です。',
		lifetimeWithMonthlyDescription:
			'月額課金を続けない場合は、次回更新前に管理画面から月額プランをキャンセルしてください。',
		manageMonthlyCta: '月額プランの管理を開く',
		featuresTitle: 'Premiumで使えること',
		features: [
			'サブスク登録数の上限解除',
			'CSVの書き出し・取り込み',
			'カスタムカテゴリー・支払い方法',
			'サブスク画像のアップロード'
		],
		successToast: '購入が完了しました。Premium状態を更新しています。',
		cancelToast: '購入手続きがキャンセルされました。'
	},
	en: {
		recommended: 'Recommended',
		lifetimeTitle: 'Premium Lifetime',
		lifetimePrice: '$19',
		lifetimeCycle: 'One-time purchase',
		lifetimeDescription: 'Pay once and keep Premium features without another monthly bill.',
		lifetimeCta: 'Buy lifetime for $19',
		monthlyTitle: 'Premium Monthly',
		monthlyPrice: '$1.99',
		monthlyCycle: 'per month',
		monthlyDescription: 'Use Premium with monthly billing. Good for trying a lighter start.',
		monthlyCta: 'Start monthly Premium',
		trialNote: 'A 7-day free trial may apply on the first upgrade.',
		checkoutNote: 'Local currency and final pricing may be shown at checkout.',
		monthlyToLifetimeTitle: 'Switch to Premium Lifetime',
		monthlyToLifetimeDescription:
			'You can purchase Lifetime while your monthly plan is active. After purchase, open plan management and cancel the monthly plan before the next renewal.',
		monthlyToLifetimePendingDescription:
			'Your monthly plan is scheduled to end. Purchase Lifetime if you want to keep Premium after that date without recurring billing.',
		lifetimeWithMonthlyTitle: 'Lifetime purchased. Monthly plan is still active.',
		lifetimeWithMonthlyDescription:
			'Open plan management and cancel the monthly plan before the next renewal if you do not want recurring billing to continue.',
		manageMonthlyCta: 'Open monthly plan management',
		featuresTitle: 'Included with Premium',
		features: [
			'Unlimited subscription entries',
			'CSV export and import',
			'Custom categories and payment methods',
			'Subscription image uploads'
		],
		successToast: 'Purchase completed. Premium status is being updated.',
		cancelToast: 'Checkout was canceled.'
	}
} satisfies LocalizedCopy<{
	recommended: string;
	lifetimeTitle: string;
	lifetimePrice: string;
	lifetimeCycle: string;
	lifetimeDescription: string;
	lifetimeCta: string;
	monthlyTitle: string;
	monthlyPrice: string;
	monthlyCycle: string;
	monthlyDescription: string;
	monthlyCta: string;
	trialNote: string;
	checkoutNote: string;
	monthlyToLifetimeTitle: string;
	monthlyToLifetimeDescription: string;
	monthlyToLifetimePendingDescription: string;
	lifetimeWithMonthlyTitle: string;
	lifetimeWithMonthlyDescription: string;
	manageMonthlyCta: string;
	featuresTitle: string;
	features: string[];
	successToast: string;
	cancelToast: string;
}>;

export const sentryFeedbackCopy = {
	ja: {
		buttonLabel: '不具合を報告',
		formTitle: '不具合を報告',
		submitButtonLabel: '送信する',
		cancelButtonLabel: 'キャンセル',
		nameLabel: 'お名前',
		namePlaceholder: '例：山田 太郎',
		emailLabel: 'メールアドレス',
		messageLabel: '詳細',
		messagePlaceholder: '発生した問題や再現手順、期待する動作を教えてください。',
		successMessageText: 'ご報告ありがとうございます。'
	},
	en: {
		buttonLabel: 'Report a bug',
		formTitle: 'Report a bug',
		submitButtonLabel: 'Send',
		cancelButtonLabel: 'Cancel',
		nameLabel: 'Name',
		namePlaceholder: 'Example: Jane Smith',
		emailLabel: 'Email address',
		messageLabel: 'Details',
		messagePlaceholder: 'Tell us what happened, how to reproduce it, and what you expected.',
		successMessageText: 'Thanks for the report.'
	}
} satisfies LocalizedCopy<Record<string, string>>;

export const authClientCopy = {
	ja: {
		tooManyRequests: 'リクエストが多すぎます。しばらくしてからもう一度お試しください。'
	},
	en: {
		tooManyRequests: 'Too many requests. Please try again later.'
	}
} satisfies LocalizedCopy<Record<'tooManyRequests', string>>;

export const csvImportDialogCopy = {
	ja: {
		title: 'CSVを取り込む',
		description:
			'SubTrack形式のCSVをアップロードし、内容を確認してから新しいサブスクとして追加します。',
		fileLabel: 'CSVファイル',
		fileDescription: 'SubTrackの書き出しCSVまたはテンプレートCSVのみ対応しています。',
		exampleTitle: '入力例',
		exampleDescription:
			'ダウンロードするテンプレートはヘッダーのみです。行を追加するときは次のように入力します。',
		preview: 'プレビュー',
		previewing: '確認中...',
		import: '取り込む',
		importing: '取り込み中...',
		reset: 'リセット',
		close: '閉じる',
		summary: 'プレビュー結果',
		validRows: '正常',
		errorRows: 'エラー',
		activeRows: '登録中',
		canceledRows: '解約済み',
		newItems: '新しく作成する管理項目',
		noNewItems: '新しいカテゴリー・支払い方法は作成されません。',
		globalErrors: 'CSVエラー',
		rowErrors: '行ごとのエラー',
		previewRows: '取り込み予定の行',
		noFile: 'CSVファイルを選択してください。',
		previewFailed: 'CSVのプレビューに失敗しました。',
		importFailed: 'CSVの取り込みに失敗しました。',
		importSuccess: (count: number) => `${count}件のサブスクを取り込みました。`,
		premiumRequired: 'CSVインポートはPremiumで利用できます。',
		allRowsMustBeValid: 'すべてのエラーを修正してから取り込んでください。',
		unsupportedFile: 'CSVファイルを選択してください。',
		rowsUnit: '行',
		categoryLabel: 'カテゴリー',
		paymentMethodLabel: '支払い方法',
		lineLabel: (line: number) => `${line}行目`,
		exampleCategory: '動画',
		examplePaymentMethod: 'クレジットカード'
	},
	en: {
		title: 'Import CSV',
		description: 'Upload a SubTrack CSV, review the rows, then import them as new subscriptions.',
		fileLabel: 'CSV file',
		fileDescription: 'Only SubTrack export/template CSV files are supported.',
		exampleTitle: 'Input example',
		exampleDescription:
			'The downloaded template only includes headers. Use values like this when filling rows.',
		preview: 'Preview',
		previewing: 'Previewing...',
		import: 'Import',
		importing: 'Importing...',
		reset: 'Reset',
		close: 'Close',
		summary: 'Preview summary',
		validRows: 'valid',
		errorRows: 'errors',
		activeRows: 'active',
		canceledRows: 'canceled',
		newItems: 'New management items',
		noNewItems: 'No new category or payment method will be created.',
		globalErrors: 'CSV errors',
		rowErrors: 'Row errors',
		previewRows: 'Rows to import',
		noFile: 'Select a CSV file first.',
		previewFailed: 'Failed to preview CSV.',
		importFailed: 'Failed to import CSV.',
		importSuccess: (count: number) => `Imported ${count} subscriptions.`,
		premiumRequired: 'CSV import is available with Premium.',
		allRowsMustBeValid: 'Fix all errors before importing.',
		unsupportedFile: 'Please select a CSV file.',
		rowsUnit: 'rows',
		categoryLabel: 'Category',
		paymentMethodLabel: 'Payment method',
		lineLabel: (line: number) => `Line ${line}`,
		exampleCategory: 'Video',
		examplePaymentMethod: 'Credit card'
	}
} satisfies LocalizedCopy<Record<string, string | ((value: number) => string)>>;

export const csvImportApiCopy = {
	ja: {
		fileRequired: 'CSVファイルを選択してください。',
		fileTooLarge: 'CSVファイルは512KB以下にしてください。',
		loginRequired: 'ログインしてください。',
		premiumRequired: 'CSVインポートはPremiumで利用できます。'
	},
	en: {
		fileRequired: 'Select a CSV file first.',
		fileTooLarge: 'CSV file must be 512KB or smaller.',
		loginRequired: 'Please log in.',
		premiumRequired: 'CSV import is available with Premium.'
	}
} satisfies LocalizedCopy<
	Record<'fileRequired' | 'fileTooLarge' | 'loginRequired' | 'premiumRequired', string>
>;

export type CsvImportErrorCode =
	| 'csv_unclosed_quote'
	| 'csv_missing_header'
	| 'csv_header_count'
	| 'csv_header_mismatch'
	| 'csv_unknown_headers'
	| 'canceled_at_invalid'
	| 'amount_required'
	| 'amount_invalid_number'
	| 'amount_out_of_range'
	| 'amount_too_many_decimals'
	| 'notify_days_invalid'
	| 'row_column_count'
	| 'service_name_required'
	| 'service_name_too_long'
	| 'category_too_long'
	| 'payment_method_too_long'
	| 'billing_cycle_invalid'
	| 'currency_invalid'
	| 'first_payment_date_required'
	| 'first_payment_date_invalid'
	| 'status_invalid'
	| 'cancellation_method_invalid'
	| 'no_rows';

export type CsvImportError = {
	code: CsvImportErrorCode;
	params?: Record<string, string | number | string[]>;
};

const joinList = (value: unknown): string =>
	Array.isArray(value) ? value.join(', ') : typeof value === 'string' ? value : '';

export const translateCsvImportError = (
	error: CsvImportError,
	locale: AppLocale = DEFAULT_LOCALE
): string => {
	const params = error.params ?? {};
	const copy = {
		ja: {
			csv_unclosed_quote: 'CSVの引用符が閉じられていません。',
			csv_missing_header: 'CSVヘッダーがありません。',
			csv_header_count: `CSVヘッダーの列数が違います。${params.expected ?? ''}列にしてください。`,
			csv_header_mismatch: `列${params.index ?? ''}は ${params.expected ?? ''} にしてください。`,
			csv_unknown_headers: `未対応の列があります: ${joinList(params.headers)}`,
			canceled_at_invalid: 'canceled_at は有効な日付にしてください。',
			amount_required: 'amount は必須です。',
			amount_invalid_number: 'amount は数値で入力してください。',
			amount_out_of_range: 'amount は0以上1000000以下にしてください。',
			amount_too_many_decimals: 'amount は小数2桁までにしてください。',
			notify_days_invalid: 'notify_days_before は0から365の整数にしてください。',
			row_column_count: `列数が違います。${params.expected ?? ''}列にしてください。`,
			service_name_required: 'service_name は必須です。',
			service_name_too_long: 'service_name は120文字以内にしてください。',
			category_too_long: 'category は40文字以内にしてください。',
			payment_method_too_long: 'payment_method は40文字以内にしてください。',
			billing_cycle_invalid:
				'billing_cycle は monthly / quarterly / yearly のいずれかにしてください。',
			currency_invalid: 'currency は JPY / USD / EUR / GBP のいずれかにしてください。',
			first_payment_date_required: 'first_payment_date は必須です。',
			first_payment_date_invalid: 'first_payment_date は YYYY-MM-DD 形式にしてください。',
			status_invalid: 'status は active / canceled のいずれかにしてください。',
			cancellation_method_invalid: 'cancellation_method が未対応です。',
			no_rows: '取り込む行がありません。'
		},
		en: {
			csv_unclosed_quote: 'A quoted CSV field is not closed.',
			csv_missing_header: 'CSV headers are missing.',
			csv_header_count: `CSV has the wrong number of header columns. Use ${params.expected ?? ''} columns.`,
			csv_header_mismatch: `Column ${params.index ?? ''} must be ${params.expected ?? ''}.`,
			csv_unknown_headers: `Unsupported columns: ${joinList(params.headers)}`,
			canceled_at_invalid: 'canceled_at must be a valid date.',
			amount_required: 'amount is required.',
			amount_invalid_number: 'amount must be a number.',
			amount_out_of_range: 'amount must be between 0 and 1000000.',
			amount_too_many_decimals: 'amount must have no more than 2 decimal places.',
			notify_days_invalid: 'notify_days_before must be an integer from 0 to 365.',
			row_column_count: `This row has the wrong number of columns. Use ${params.expected ?? ''} columns.`,
			service_name_required: 'service_name is required.',
			service_name_too_long: 'service_name must be 120 characters or fewer.',
			category_too_long: 'category must be 40 characters or fewer.',
			payment_method_too_long: 'payment_method must be 40 characters or fewer.',
			billing_cycle_invalid: 'billing_cycle must be monthly, quarterly, or yearly.',
			currency_invalid: 'currency must be JPY, USD, EUR, or GBP.',
			first_payment_date_required: 'first_payment_date is required.',
			first_payment_date_invalid: 'first_payment_date must use YYYY-MM-DD format.',
			status_invalid: 'status must be active or canceled.',
			cancellation_method_invalid: 'cancellation_method is not supported.',
			no_rows: 'There are no rows to import.'
		}
	} satisfies LocalizedCopy<Record<CsvImportErrorCode, string>>;

	return copy[locale][error.code] ?? copy[DEFAULT_LOCALE][error.code];
};
