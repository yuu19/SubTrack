import { describe, expect, it } from 'vitest';
import {
	addCalendarMonths,
	diffCalendarDays,
	getLocalDateString,
	hasLocalTimeReached,
	normalizeDateString
} from './time-zone';

describe('time-zone helpers', () => {
	it('normalizes ISO timestamps to calendar date strings', () => {
		expect(normalizeDateString('2026-04-01T00:00:00.000Z')).toBe('2026-04-01');
		expect(normalizeDateString('2026-04-01')).toBe('2026-04-01');
	});

	it('formats the same instant as different local dates by time zone', () => {
		const instant = new Date('2026-06-24T00:30:00.000Z');
		expect(getLocalDateString(instant, 'Asia/Tokyo')).toBe('2026-06-24');
		expect(getLocalDateString(instant, 'America/Los_Angeles')).toBe('2026-06-23');
	});

	it('checks whether local reminder time has been reached', () => {
		expect(hasLocalTimeReached(new Date('2026-06-24T00:30:00.000Z'), 'Asia/Tokyo', '09:00')).toBe(
			true
		);
		expect(
			hasLocalTimeReached(new Date('2026-06-24T15:30:00.000Z'), 'America/Los_Angeles', '09:00')
		).toBe(false);
	});

	it('computes calendar day differences and clamps month-end additions', () => {
		expect(diffCalendarDays('2026-06-24', '2026-06-21')).toBe(3);
		expect(addCalendarMonths('2026-01-31', 1)).toBe('2026-02-28');
	});
});
