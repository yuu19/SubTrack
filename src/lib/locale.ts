import { DEFAULT_LOCALE, type AppLocale } from '$lib/constant';
import type { CancellationMethod, TrackedSubscriptionStatus } from '$lib/constant';

export const resolveLocale = (value?: string | null): AppLocale =>
	value === 'en' ? 'en' : DEFAULT_LOCALE;

export const getIntlLocale = (locale: AppLocale): string => (locale === 'en' ? 'en-US' : 'ja-JP');

export const formatCurrencyYen = (amount: number, locale: AppLocale): string =>
	new Intl.NumberFormat(getIntlLocale(locale), {
		style: 'currency',
		currency: 'JPY',
		maximumFractionDigits: 0
	}).format(amount);

export const formatLongDate = (
	value: string | number | Date | null | undefined,
	locale: AppLocale
): string => {
	if (!value) return '-';

	const rawValue = typeof value === 'string' && !value.includes('T') ? `${value}T00:00:00` : value;
	const date = new Date(rawValue);
	if (Number.isNaN(date.getTime())) {
		return typeof value === 'string' ? value.slice(0, 10) : '-';
	}

	return new Intl.DateTimeFormat(getIntlLocale(locale), {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	}).format(date);
};

export const formatMonthYear = (value: string | number | Date, locale: AppLocale): string =>
	new Intl.DateTimeFormat(getIntlLocale(locale), {
		year: 'numeric',
		month: 'long'
	}).format(new Date(value));

export const formatCalendarDate = (
	value: string | number | Date | null | undefined,
	locale: AppLocale
): string => {
	if (!value) return '';

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';

	return new Intl.DateTimeFormat(getIntlLocale(locale), {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		weekday: 'short'
	}).format(date);
};

export const formatMonthDay = (value: string | number | Date, locale: AppLocale): string =>
	new Intl.DateTimeFormat(getIntlLocale(locale), {
		month: 'numeric',
		day: 'numeric'
	}).format(new Date(value));

export const getWeekdayLabels = (locale: AppLocale): string[] => {
	const base = new Date(Date.UTC(2026, 0, 4));

	return Array.from({ length: 7 }, (_, index) =>
		new Intl.DateTimeFormat(getIntlLocale(locale), {
			weekday: 'narrow',
			timeZone: 'UTC'
		}).format(new Date(base.getTime() + index * 24 * 60 * 60 * 1000))
	);
};

export const getCycleLabel = (cycle: string, locale: AppLocale): string => {
	const labels = {
		ja: {
			monthly: '毎月',
			quarterly: '3ヶ月ごと',
			yearly: '毎年'
		},
		en: {
			monthly: 'Monthly',
			quarterly: 'Every 3 months',
			yearly: 'Yearly'
		}
	} as const;

	return labels[locale][cycle as keyof (typeof labels)['ja']] ?? cycle;
};

export const getCycleUnitLabel = (cycle: string, locale: AppLocale): string => {
	const labels = {
		ja: {
			monthly: '月',
			quarterly: '3ヶ月',
			yearly: '年'
		},
		en: {
			monthly: 'month',
			quarterly: 'quarter',
			yearly: 'year'
		}
	} as const;

	return labels[locale][cycle as keyof (typeof labels)['ja']] ?? cycle;
};

export const formatNotifyDays = (days: number, locale: AppLocale): string => {
	if (days === 0) {
		return locale === 'en' ? 'Same day' : '当日';
	}

	return locale === 'en' ? `${days} day${days === 1 ? '' : 's'} before` : `${days}日前`;
};

export const getSubscriptionStatusLabel = (
	status: string | null | undefined,
	locale: AppLocale
): string => {
	const labels = {
		ja: {
			active: '有効',
			trialing: 'トライアル中',
			past_due: '支払い遅延',
			canceled: '解約済み',
			incomplete: '手続き中',
			incomplete_expired: '期限切れ',
			unpaid: '未払い',
			pending_cancel: '解約予定'
		},
		en: {
			active: 'Active',
			trialing: 'Trialing',
			past_due: 'Past due',
			canceled: 'Canceled',
			incomplete: 'Incomplete',
			incomplete_expired: 'Expired',
			unpaid: 'Unpaid',
			pending_cancel: 'Pending cancellation'
		}
	} as const;

	if (!status) {
		return locale === 'en' ? 'Not set' : '未設定';
	}

	return labels[locale][status as keyof (typeof labels)['ja']] ?? status;
};

export const getTrackedSubscriptionStatusLabel = (
	status: string | null | undefined,
	locale: AppLocale
): string => {
	const labels = {
		ja: {
			active: '登録中',
			canceled: '解約済み'
		},
		en: {
			active: 'Active',
			canceled: 'Canceled'
		}
	} as const satisfies Record<AppLocale, Record<TrackedSubscriptionStatus, string>>;

	if (status === 'active' || status === 'canceled') {
		return labels[locale][status];
	}

	return locale === 'en' ? 'Active' : '登録中';
};

export const getCancellationMethodLabel = (
	method: string | null | undefined,
	locale: AppLocale
): string => {
	const labels = {
		ja: {
			web: 'Webサイト',
			app: 'アプリ',
			app_store: 'App Store',
			google_play: 'Google Play',
			phone: '電話',
			email: 'メール',
			other: 'その他'
		},
		en: {
			web: 'Website',
			app: 'App',
			app_store: 'App Store',
			google_play: 'Google Play',
			phone: 'Phone',
			email: 'Email',
			other: 'Other'
		}
	} as const satisfies Record<AppLocale, Record<CancellationMethod, string>>;

	if (!method) {
		return locale === 'en' ? 'Not set' : '未設定';
	}

	return labels[locale][method as CancellationMethod] ?? method;
};

export const getCancellationMethodDescription = (
	method: string | null | undefined,
	locale: AppLocale
): string => {
	const descriptions = {
		ja: {
			web: 'サービスのアカウント管理ページや請求設定ページから解約します。',
			app: 'サービスのアプリ内にあるアカウント設定やプラン管理から解約します。',
			app_store: 'Apple IDのサブスクリプション管理から対象サービスを確認します。',
			google_play: 'Google Playのサブスクリプション管理から対象サービスを確認します。',
			phone: '受付時間や本人確認に注意して、電話で解約手続きを行います。',
			email: '登録メールアドレスや契約情報を確認し、メールで解約手続きを行います。',
			other: 'メモに残した手順を確認して、利用者本人が解約手続きを行います。'
		},
		en: {
			web: 'Cancel from the service account or billing settings page.',
			app: 'Cancel from the account or plan management area in the service app.',
			app_store: 'Check the subscription from the Apple ID subscription settings.',
			google_play: 'Check the subscription from Google Play subscription management.',
			phone: 'Cancel by phone, checking business hours and identity verification requirements.',
			email: 'Cancel by email, checking the registered address and contract details.',
			other: 'Follow the saved notes and complete the cancellation yourself.'
		}
	} as const satisfies Record<AppLocale, Record<CancellationMethod, string>>;

	if (!method) {
		return locale === 'en'
			? 'Save how to cancel this subscription so you can find it before renewal.'
			: '更新前に確認できるよう、解約方法を保存しておけます。';
	}

	return descriptions[locale][method as CancellationMethod] ?? descriptions[locale].other;
};
