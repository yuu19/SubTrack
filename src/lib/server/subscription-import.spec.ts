import { describe, expect, it } from 'vitest';
import { buildSubscriptionImportTemplateCsv } from './subscription-export';
import { getValidSubscriptionImportRows, parseSubscriptionImportCsv } from './subscription-import';

describe('subscription CSV import', () => {
	it('builds a header-only import template', () => {
		expect(buildSubscriptionImportTemplateCsv()).toBe(
			[
				'service_name',
				'category',
				'payment_method',
				'billing_cycle',
				'amount',
				'currency',
				'first_payment_date',
				'next_billing_at',
				'days_until_next_billing',
				'notify_days_before',
				'status',
				'canceled_at',
				'cancellation_method'
			].join(',') + '\r\n'
		);
	});

	it('parses valid active and canceled rows', () => {
		const csv = [
			buildSubscriptionImportTemplateCsv().trimEnd(),
			'Netflix,動画,クレジットカード,monthly,1490,JPY,2026-07-01,,,3,active,,',
			'Old service,動画,クレジットカード,yearly,12000,JPY,2025-01-01,,,7,canceled,2026-01-02,web'
		].join('\r\n');

		const preview = parseSubscriptionImportCsv(csv);
		const rows = getValidSubscriptionImportRows(preview);

		expect(preview.errors).toEqual([]);
		expect(preview.summary).toMatchObject({
			totalRows: 2,
			validRows: 2,
			errorRows: 0,
			activeRows: 1,
			canceledRows: 1
		});
		expect(rows?.[0]).toMatchObject({
			serviceName: 'Netflix',
			cycle: 'monthly',
			amount: 1490,
			currency: 'JPY',
			notifyDaysBefore: 3,
			status: 'active'
		});
		expect(rows?.[1]).toMatchObject({
			serviceName: 'Old service',
			status: 'canceled',
			cancellationMethod: 'web'
		});
	});

	it('rejects the whole import when a row has validation errors', () => {
		const csv = [
			buildSubscriptionImportTemplateCsv().trimEnd(),
			'Netflix,動画,クレジットカード,monthly,1490,JPY,2026-07-01,,,3,active,,',
			'Broken,動画,クレジットカード,weekly,abc,JPY,not-a-date,,,999,active,,'
		].join('\r\n');

		const preview = parseSubscriptionImportCsv(csv);

		expect(preview.summary.validRows).toBe(1);
		expect(preview.summary.errorRows).toBe(1);
		expect(getValidSubscriptionImportRows(preview)).toBeNull();
		expect(preview.rows[1].errors.length).toBeGreaterThan(0);
	});

	it('requires the SubTrack CSV header order', () => {
		const preview = parseSubscriptionImportCsv('service_name,amount\nNetflix,1490');

		expect(preview.errors.length).toBeGreaterThan(0);
		expect(preview.rows).toEqual([]);
		expect(getValidSubscriptionImportRows(preview)).toBeNull();
	});
});
