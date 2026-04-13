export const subscriptionColors = ['blue', 'green', 'red', 'yellow', 'purple', 'orange'] as const;

export type SubscriptionColor = (typeof subscriptionColors)[number];

export const defaultSubscriptionColor: SubscriptionColor = 'blue';

export const subscriptionColorStyles: Record<SubscriptionColor, string> = {
	blue: 'color-mix(in oklch, var(--primary) 90%, var(--background) 10%)',
	green: 'color-mix(in oklch, var(--primary) 85%, var(--background) 15%)',
	red: 'color-mix(in oklch, var(--primary) 80%, var(--background) 20%)',
	yellow: 'color-mix(in oklch, var(--primary) 75%, var(--background) 25%)',
	purple: 'color-mix(in oklch, var(--primary) 70%, var(--background) 30%)',
	orange: 'color-mix(in oklch, var(--primary) 65%, var(--background) 35%)'
};

export const isSubscriptionColor = (value: unknown): value is SubscriptionColor =>
	typeof value === 'string' && subscriptionColors.includes(value as SubscriptionColor);

export const getFallbackSubscriptionColor = (index: number): SubscriptionColor =>
	subscriptionColors[((index % subscriptionColors.length) + subscriptionColors.length) % subscriptionColors.length];

export const resolveSubscriptionColor = (
	value: unknown,
	fallback: SubscriptionColor = defaultSubscriptionColor
): SubscriptionColor => (isSubscriptionColor(value) ? value : fallback);

export const getSubscriptionColorStyle = (color: SubscriptionColor) => subscriptionColorStyles[color];

export const getSubscriptionColorLabel = (
	color: SubscriptionColor,
	locale: 'en' | 'ja' = 'ja'
) => {
	const labels: Record<SubscriptionColor, { en: string; ja: string }> = {
		blue: { en: 'Blue', ja: '青' },
		green: { en: 'Green', ja: '緑' },
		red: { en: 'Red', ja: '赤' },
		yellow: { en: 'Yellow', ja: '黄' },
		purple: { en: 'Purple', ja: '紫' },
		orange: { en: 'Orange', ja: 'オレンジ' }
	};

	return labels[color][locale];
};
