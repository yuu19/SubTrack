export const ROLE = ['admin', 'user'] as const;

export const APP_LOCALES = ['ja', 'en'] as const;
export type AppLocale = (typeof APP_LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = 'ja';

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
