import { billingDatesBetween } from '$lib/billing-dates';
import type { trackedSubscriptionTable } from '$lib/server/db/schema';
import {
	getFallbackSubscriptionColor,
	resolveSubscriptionColor,
	type SubscriptionColor
} from '$lib/subscription-colors';

type CalendarSubscription = Pick<
	typeof trackedSubscriptionTable.$inferSelect,
	| 'id'
	| 'serviceName'
	| 'firstPaymentDate'
	| 'cycle'
	| 'status'
	| 'amount'
	| 'currency'
	| 'color'
	| 'iconType'
	| 'iconValue'
>;

export type CalendarEvent = {
	id: string;
	subscriptionId: number;
	title: string;
	date: string;
	amount: number;
	currency: string;
	color: SubscriptionColor;
	iconType: string | null;
	iconValue: string | null;
	description?: string | null;
};

export const buildCalendarEvents = (
	subscriptions: CalendarSubscription[],
	rangeStart: string,
	rangeEnd: string
): CalendarEvent[] => {
	const events: CalendarEvent[] = [];
	subscriptions.forEach((sub, index) => {
		if (sub.status === 'canceled') return;
		const color = resolveSubscriptionColor(sub.color, getFallbackSubscriptionColor(index));
		for (const date of billingDatesBetween(sub.firstPaymentDate, sub.cycle, rangeStart, rangeEnd)) {
			events.push({
				id: `sub-${sub.id}-${date}`,
				subscriptionId: sub.id,
				title: sub.serviceName,
				date,
				amount: Number(sub.amount ?? 0),
				currency: sub.currency ?? 'JPY',
				color,
				iconType: sub.iconType,
				iconValue: sub.iconValue,
				description: ''
			});
		}
	});
	return events;
};
