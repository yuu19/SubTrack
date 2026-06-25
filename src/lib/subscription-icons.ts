import type { AppLocale } from './constant';

export const subscriptionIconTypes = ['emoji', 'preset'] as const;

export type SubscriptionIconType = (typeof subscriptionIconTypes)[number];

export const defaultSubscriptionIconType: SubscriptionIconType = 'emoji';
export const defaultSubscriptionIconValue = '📦';
export const defaultSubscriptionPresetIconValue = 'box';

export const subscriptionEmojiOptions = [
	'📦',
	'🎬',
	'🎧',
	'☁️',
	'🤖',
	'📚',
	'🏋️',
	'💼',
	'🎮',
	'🛒',
	'📰',
	'💳'
] as const;

export const subscriptionPresetIconValues = [
	'box',
	'video',
	'music',
	'cloud',
	'ai',
	'learning',
	'fitness',
	'work',
	'game',
	'shopping',
	'news',
	'payment'
] as const;

export type SubscriptionPresetIconValue = (typeof subscriptionPresetIconValues)[number];

export type SubscriptionPresetIconOption = {
	value: SubscriptionPresetIconValue;
	label: Record<AppLocale, string>;
};

export const subscriptionPresetIconOptions: SubscriptionPresetIconOption[] = [
	{ value: 'box', label: { ja: '汎用', en: 'General' } },
	{ value: 'video', label: { ja: '動画', en: 'Video' } },
	{ value: 'music', label: { ja: '音楽', en: 'Music' } },
	{ value: 'cloud', label: { ja: 'クラウド', en: 'Cloud' } },
	{ value: 'ai', label: { ja: 'AI', en: 'AI' } },
	{ value: 'learning', label: { ja: '学習', en: 'Learning' } },
	{ value: 'fitness', label: { ja: '運動', en: 'Fitness' } },
	{ value: 'work', label: { ja: '仕事', en: 'Work' } },
	{ value: 'game', label: { ja: 'ゲーム', en: 'Game' } },
	{ value: 'shopping', label: { ja: '買い物', en: 'Shopping' } },
	{ value: 'news', label: { ja: 'ニュース', en: 'News' } },
	{ value: 'payment', label: { ja: '支払い', en: 'Payment' } }
];

export const isSubscriptionIconType = (value: unknown): value is SubscriptionIconType =>
	typeof value === 'string' && subscriptionIconTypes.includes(value as SubscriptionIconType);

export const isSubscriptionPresetIconValue = (
	value: unknown
): value is SubscriptionPresetIconValue =>
	typeof value === 'string' &&
	subscriptionPresetIconValues.includes(value as SubscriptionPresetIconValue);

export const resolveSubscriptionIconType = (
	value: unknown,
	fallback: SubscriptionIconType = defaultSubscriptionIconType
): SubscriptionIconType => (isSubscriptionIconType(value) ? value : fallback);

export const resolveSubscriptionIconValue = (
	value: unknown,
	fallback = defaultSubscriptionIconValue
) => {
	const normalized = typeof value === 'string' ? value.trim() : '';
	return normalized.length > 0 ? normalized.slice(0, 64) : fallback;
};

export const resolveSubscriptionPresetIconValue = (
	value: unknown,
	fallback: SubscriptionPresetIconValue = defaultSubscriptionPresetIconValue
): SubscriptionPresetIconValue => (isSubscriptionPresetIconValue(value) ? value : fallback);
