export const ROLE = ['admin', 'user'] as const;

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

export const NOTIFICATION_METHODS = ['push', 'email', 'both'] as const;
export type NotificationMethod = (typeof NOTIFICATION_METHODS)[number];
