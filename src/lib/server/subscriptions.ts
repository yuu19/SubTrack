import {
	addCalendarMonths,
	diffCalendarDays,
	getLocalDateString,
	normalizeDateString,
	resolveTimeZone
} from '$lib/time-zone';

const cycleToMonths = (cycle: string) => {
	if (cycle === 'yearly') return 12;
	if (cycle === 'quarterly') return 3;
	return 1;
};

export const computeNextBilling = (
	firstPaymentDate: string,
	cycle: string,
	options: { timeZone?: string; now?: Date } = {}
) => {
	const timeZone = resolveTimeZone(options.timeZone);
	const today = getLocalDateString(options.now ?? new Date(), timeZone);
	const first = normalizeDateString(firstPaymentDate);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(first)) {
		return {
			nextBillingAt: firstPaymentDate,
			daysUntilNextBilling: 0
		};
	}

	const monthsToAdd = cycleToMonths(cycle);
	let next = first;
	while (diffCalendarDays(next, today) < 0) {
		next = addCalendarMonths(next, monthsToAdd);
	}

	return {
		nextBillingAt: next,
		daysUntilNextBilling: diffCalendarDays(next, today)
	};
};
