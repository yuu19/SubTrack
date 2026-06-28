import { trackedSubscriptionTable } from './db/schema';

export type ExportableTrackedSubscription = Pick<
	typeof trackedSubscriptionTable.$inferSelect,
	| 'serviceName'
	| 'cycle'
	| 'amount'
	| 'currency'
	| 'firstPaymentDate'
	| 'nextBillingAt'
	| 'daysUntilNextBilling'
	| 'notifyDaysBefore'
	| 'status'
	| 'canceledAt'
	| 'cancellationMethod'
	| 'tags'
>;

export const SUBSCRIPTION_EXPORT_HEADERS = [
	'service_name',
	'billing_cycle',
	'amount',
	'currency',
	'first_payment_date',
	'next_billing_at',
	'days_until_next_billing',
	'notify_days_before',
	'status',
	'canceled_at',
	'cancellation_method',
	'tags'
] as const;

export const UTF8_BOM = '\uFEFF';

const escapeCsvCell = (value: unknown) => {
	const normalized = value === null || value === undefined ? '' : String(value);

	if (/["\r\n,]/.test(normalized)) {
		return `"${normalized.replace(/"/g, '""')}"`;
	}

	return normalized;
};

const serializeTags = (tags: string[]) => tags.filter(Boolean).join(', ');

export const buildSubscriptionExportCsv = (subscriptions: ExportableTrackedSubscription[]) => {
	const rows = subscriptions.map((subscription) =>
		[
			subscription.serviceName,
			subscription.cycle,
			subscription.amount,
			subscription.currency,
			subscription.firstPaymentDate,
			subscription.nextBillingAt,
			subscription.daysUntilNextBilling,
			subscription.notifyDaysBefore,
			subscription.status,
			subscription.canceledAt instanceof Date
				? subscription.canceledAt.toISOString()
				: subscription.canceledAt,
			subscription.cancellationMethod,
			serializeTags(subscription.tags)
		]
			.map(escapeCsvCell)
			.join(',')
	);

	return [SUBSCRIPTION_EXPORT_HEADERS.join(','), ...rows].join('\r\n');
};

export const buildSubscriptionExportFilename = (now = new Date()) =>
	`subtrack-subscriptions-${now.toISOString().slice(0, 10)}.csv`;
