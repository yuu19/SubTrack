import { DEFAULT_LOCALE, type AppLocale } from '$lib/constant';

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
