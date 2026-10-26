import {
	addCalendarMonths,
	diffCalendarDays,
	getLocalDateString,
	isValidDateString,
	normalizeDateString,
	resolveTimeZone
} from '$lib/time-zone';

export const BILLING_CYCLES = ['monthly', 'quarterly', 'yearly'] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

const monthsPerCycle: Record<BillingCycle, number> = {
	monthly: 1,
	quarterly: 3,
	yearly: 12
};

export const isBillingCycle = (value: string): value is BillingCycle =>
	BILLING_CYCLES.includes(value as BillingCycle);

const monthIndex = (value: string) => {
	const [year, month] = value.split('-').map(Number);
	return year * 12 + month - 1;
};

/** Always advance from the initial day, never from a previously clamped occurrence. */
export const nextBillingDateOnOrAfter = (
	firstPaymentDate: string,
	cycle: string,
	date: string
): string | null => {
	const first = normalizeDateString(firstPaymentDate);
	if (!isValidDateString(first) || !isValidDateString(date) || !isBillingCycle(cycle)) {
		return null;
	}
	const interval = monthsPerCycle[cycle];
	let period = Math.max(0, Math.floor((monthIndex(date) - monthIndex(first)) / interval));
	let next = addCalendarMonths(first, period * interval);
	if (next < date) {
		period += 1;
		next = addCalendarMonths(first, period * interval);
	}
	// Out-of-range dates cannot produce an occurrence within the supported calendar.
	return next >= date ? next : null;
};

/** Inclusive date-only range. Used by the calendar, independent of the displayed month. */
export const billingDatesBetween = (
	firstPaymentDate: string,
	cycle: string,
	start: string,
	end: string
): string[] => {
	if (!isValidDateString(end) || start > end || !isBillingCycle(cycle)) return [];
	const first = normalizeDateString(firstPaymentDate);
	let next = nextBillingDateOnOrAfter(first, cycle, start);
	const dates: string[] = [];
	while (next !== null && next <= end) {
		dates.push(next);
		const elapsedMonths = monthIndex(next) - monthIndex(first);
		const following = addCalendarMonths(first, elapsedMonths + monthsPerCycle[cycle]);
		next = following > next ? following : null;
	}
	return dates;
};

export const computeNextBilling = (
	firstPaymentDate: string,
	cycle: string,
	options: { timeZone?: string; now?: Date } = {}
) => {
	const today = getLocalDateString(options.now ?? new Date(), resolveTimeZone(options.timeZone));
	const next = nextBillingDateOnOrAfter(firstPaymentDate, cycle, today);
	// Preserve malformed historic data rather than silently inventing a monthly schedule.
	// Callers deciding whether to notify must use the nullable occurrence helper.
	if (next === null) return { nextBillingAt: firstPaymentDate, daysUntilNextBilling: 0 };
	return { nextBillingAt: next, daysUntilNextBilling: diffCalendarDays(next, today) };
};
