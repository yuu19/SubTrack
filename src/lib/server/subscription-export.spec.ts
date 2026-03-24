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
				cycle: 'monthly',
				amount: 1490,
				firstPaymentDate: '2026-03-01',
				nextBillingAt: '2026-04-01T00:00:00.000Z',
				daysUntilNextBilling: 8,
				notifyDaysBefore: 3,
				tags: ['動画', 'エンタメ']
			}
		]);

		expect(csv).toBe(
			`${SUBSCRIPTION_EXPORT_HEADERS.join(',')}\r\nNetflix,monthly,1490,2026-03-01,2026-04-01T00:00:00.000Z,8,3,"動画, エンタメ"`
		);
	});

	it('escapes commas, quotes, and newlines in CSV values', () => {
		const csv = buildSubscriptionExportCsv([
			{
				serviceName: 'Plan "A", Plus',
				cycle: 'yearly',
				amount: 12000,
				firstPaymentDate: '2026-01-15',
				nextBillingAt: '2027-01-15T00:00:00.000Z',
				daysUntilNextBilling: 297,
				notifyDaysBefore: 14,
				tags: ['line1\nline2', 'office']
			}
		]);

		expect(csv).toContain('"Plan ""A"", Plus"');
		expect(csv).toContain('"line1\nline2, office"');
	});

	it('builds a deterministic export filename', () => {
		expect(buildSubscriptionExportFilename(new Date('2026-03-24T12:00:00.000Z'))).toBe(
			'subtrack-subscriptions-2026-03-24.csv'
		);
	});
});
