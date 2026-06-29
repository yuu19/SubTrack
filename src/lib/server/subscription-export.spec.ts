import { describe, expect, it } from 'vitest';
import {
	SUBSCRIPTION_EXPORT_HEADERS,
	buildSubscriptionExportCsv,
	buildSubscriptionExportFilename
} from './subscription-export';

describe('subscription export', () => {
	it('builds CSV with the expected headers and rows', () => {
		const csv = buildSubscriptionExportCsv([
			{
				serviceName: 'Netflix',
				categoryName: '動画',
				paymentMethodName: 'クレジットカード',
				cycle: 'monthly',
				amount: 1490,
				currency: 'JPY',
				firstPaymentDate: '2026-03-01',
				nextBillingAt: '2026-04-01T00:00:00.000Z',
				daysUntilNextBilling: 8,
				notifyDaysBefore: 3,
				status: 'active',
				canceledAt: null,
				cancellationMethod: 'web',
				tags: ['動画', 'エンタメ']
			}
		]);

		expect(csv).toBe(
			`${SUBSCRIPTION_EXPORT_HEADERS.join(',')}\r\nNetflix,動画,クレジットカード,monthly,1490,JPY,2026-03-01,2026-04-01T00:00:00.000Z,8,3,active,,web,"動画, エンタメ"`
		);
	});

	it('escapes commas, quotes, and newlines in CSV values', () => {
		const csv = buildSubscriptionExportCsv([
			{
				serviceName: 'Plan "A", Plus',
				categoryName: 'Work, Tools',
				paymentMethodName: 'Card "A"',
				cycle: 'yearly',
				amount: 12000,
				currency: 'USD',
				firstPaymentDate: '2026-01-15',
				nextBillingAt: '2027-01-15T00:00:00.000Z',
				daysUntilNextBilling: 297,
				notifyDaysBefore: 14,
				status: 'canceled',
				canceledAt: new Date('2026-06-01T00:00:00.000Z'),
				cancellationMethod: 'email',
				tags: ['line1\nline2', 'office']
			}
		]);

		expect(csv).toContain('"Plan ""A"", Plus"');
		expect(csv).toContain('2026-06-01T00:00:00.000Z');
		expect(csv).toContain('"line1\nline2, office"');
	});

	it('builds a deterministic export filename', () => {
		expect(buildSubscriptionExportFilename(new Date('2026-03-24T12:00:00.000Z'))).toBe(
			'subtrack-subscriptions-2026-03-24.csv'
		);
	});
});
