import { describe, expect, it } from 'vitest';
import { createSubscriptionSchema } from './formSchema';

const input = { select: 'monthly', number: 10, datepicker: '2026-01-31', text: 'Test service' };

describe('subscription billing date validation', () => {
	it.each(['monthly', 'quarterly', 'yearly'])(
		'accepts supported cycle %s and real leap days',
		(select) => {
			expect(
				createSubscriptionSchema().safeParse({ ...input, select, datepicker: '2024-02-29' }).success
			).toBe(true);
		}
	);

	it.each([
		'',
		'not-a-date',
		'2026-02-30',
		'2026-02-29',
		'2026-13-01',
		'0000-01-01',
		'2026-01-31T00:00:00Z'
	])('rejects malformed or nonexistent form date %s', (datepicker) => {
		expect(createSubscriptionSchema().safeParse({ ...input, datepicker }).success).toBe(false);
	});

	it.each(['', 'weekly', 'toString'])('rejects unknown cycle %s', (select) => {
		expect(createSubscriptionSchema('en').safeParse({ ...input, select }).success).toBe(false);
	});
});
