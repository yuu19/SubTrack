export const ROLE = ['admin', 'user'] as const;

export const APP_LOCALES = ['ja', 'en'] as const;
export type AppLocale = (typeof APP_LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = 'ja';
export const DEFAULT_TIME_ZONE = 'Asia/Tokyo';
export const DEFAULT_NOTIFY_TIME = '09:00';

export const SUPPORTED_CURRENCIES = ['JPY', 'USD', 'EUR', 'GBP'] as const;
export type SubscriptionCurrency = (typeof SUPPORTED_CURRENCIES)[number];
export const DEFAULT_SUBSCRIPTION_CURRENCY: SubscriptionCurrency = 'JPY';

export const THEMES = [
	'default',
	'blue',
	'green',
	'orange',
	'red',
	'rose',
	'violet',
	'yellow'
] as const;

export type Themes = (typeof THEMES)[number];

export const NOTIFICATION_METHODS = ['push', 'email', 'both'] as const;
export type NotificationMethod = (typeof NOTIFICATION_METHODS)[number];

export const TRACKED_SUBSCRIPTION_STATUSES = ['active', 'canceled'] as const;
export type TrackedSubscriptionStatus = (typeof TRACKED_SUBSCRIPTION_STATUSES)[number];

export const CANCELLATION_METHODS = [
	'web',
	'app',
	'app_store',
	'google_play',
	'phone',
	'email',
	'other'
] as const;
export type CancellationMethod = (typeof CANCELLATION_METHODS)[number];
