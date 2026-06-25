export const subscriptionIconTypes = ['emoji'] as const;

export type SubscriptionIconType = (typeof subscriptionIconTypes)[number];

export const defaultSubscriptionIconType: SubscriptionIconType = 'emoji';
export const defaultSubscriptionIconValue = '📦';

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

export const isSubscriptionIconType = (value: unknown): value is SubscriptionIconType =>
	typeof value === 'string' && subscriptionIconTypes.includes(value as SubscriptionIconType);

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
