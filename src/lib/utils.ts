import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatCurrency(
	value: number | string | null | undefined,
	options: {
		currency?: string;
		locale?: string;
		minimumFractionDigits?: number;
		maximumFractionDigits?: number;
	} = {}
) {
	const {
		currency = 'USD',
		locale = 'en-US',
		minimumFractionDigits = 0,
		maximumFractionDigits = 0
	} = options;

	const amount = Number(value ?? 0);
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		minimumFractionDigits,
		maximumFractionDigits
	}).format(amount);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
