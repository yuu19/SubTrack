export const subscriptionColors = ['blue', 'green', 'red', 'yellow', 'purple', 'orange'] as const;

export type SubscriptionColor = (typeof subscriptionColors)[number];

export const defaultSubscriptionColor: SubscriptionColor = 'blue';

const subscriptionColorPalette: Record<
	SubscriptionColor,
	{
		solid: string;
		surface: string;
	}
> = {
	blue: {
		solid: '#3b82f6',
		surface: 'color-mix(in srgb, #3b82f6 14%, var(--background))'
	},
	green: {
		solid: '#22c55e',
		surface: 'color-mix(in srgb, #22c55e 14%, var(--background))'
	},
	red: {
		solid: '#ef4444',
		surface: 'color-mix(in srgb, #ef4444 14%, var(--background))'
	},
	yellow: {
		solid: '#eab308',
		surface: 'color-mix(in srgb, #eab308 18%, var(--background))'
	},
	purple: {
		solid: '#8b5cf6',
		surface: 'color-mix(in srgb, #8b5cf6 14%, var(--background))'
	},
	orange: {
		solid: '#f97316',
		surface: 'color-mix(in srgb, #f97316 14%, var(--background))'
	}
};

export const subscriptionColorStyles: Record<SubscriptionColor, string> = {
	blue: subscriptionColorPalette.blue.solid,
	green: subscriptionColorPalette.green.solid,
	red: subscriptionColorPalette.red.solid,
	yellow: subscriptionColorPalette.yellow.solid,
	purple: subscriptionColorPalette.purple.solid,
	orange: subscriptionColorPalette.orange.solid
};

export const isSubscriptionColor = (value: unknown): value is SubscriptionColor =>
	typeof value === 'string' && subscriptionColors.includes(value as SubscriptionColor);

export const getFallbackSubscriptionColor = (index: number): SubscriptionColor =>
	subscriptionColors[
		((index % subscriptionColors.length) + subscriptionColors.length) % subscriptionColors.length
	];

export const resolveSubscriptionColor = (
	value: unknown,
	fallback: SubscriptionColor = defaultSubscriptionColor
): SubscriptionColor => (isSubscriptionColor(value) ? value : fallback);

export const getSubscriptionColorStyle = (color: SubscriptionColor) =>
	subscriptionColorStyles[color];

export const getSubscriptionColorSurfaceStyle = (color: SubscriptionColor) =>
	subscriptionColorPalette[color].surface;

export const getSubscriptionColorLabel = (color: SubscriptionColor, locale: 'en' | 'ja' = 'ja') => {
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
