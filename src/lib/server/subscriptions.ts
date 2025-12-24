import dayjs from 'dayjs';

const cycleToMonths = (cycle: string) => {
	if (cycle === 'yearly') return 12;
	if (cycle === 'quarterly') return 3;
	return 1;
};

export const computeNextBilling = (firstPaymentDate: string, cycle: string) => {
	const today = dayjs().startOf('day');
	const first = dayjs(firstPaymentDate);
	if (!first.isValid()) {
		return {
			nextBillingAt: firstPaymentDate,
			daysUntilNextBilling: 0
		};
	}

	const monthsToAdd = cycleToMonths(cycle);
	let next = first;
	while (next.isBefore(today, 'day')) {
		next = next.add(monthsToAdd, 'month');
	}

	return {
		nextBillingAt: next.toISOString(),
		daysUntilNextBilling: next.diff(today, 'day')
	};
};
