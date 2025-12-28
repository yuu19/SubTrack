export const SUBSCRIPTION_STATUS = ['trialing', 'active', 'canceled'] as const;
export const ROLE = ['admin', 'user'] as const;
export const SHIPPING_FEE = 5 as const;


export const THEMES = [
	"default",
	"blue",
	"green",
	"orange",
	"red",
	"rose",
	"violet",
	"yellow",
] as const;

export type Themes = (typeof THEMES)[number];
