import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	formatCalendarDate,
	formatCurrency,
	formatCurrencyYen,
	formatLongDate,
	formatNotifyDays,
	getCancellationMethodDescription,
	getCancellationMethodLabel,
	getCycleLabel,
	getCycleUnitLabel,
	getIntlLocale,
	getTrackedSubscriptionStatusLabel,
	resolveLocale
} from './locale';

describe('locale helpers', () => {
	it('resolves unsupported locales to ja', () => {
		expect(resolveLocale('ja')).toBe('ja');
		expect(resolveLocale('en')).toBe('en');
		expect(resolveLocale('fr')).toBe('ja');
		expect(resolveLocale()).toBe('ja');
	});

	it('returns expected Intl locale tags', () => {
		expect(getIntlLocale('ja')).toBe('ja-JP');
		expect(getIntlLocale('en')).toBe('en-US');
	});

	it('formats yen amounts per locale', () => {
		expect(formatCurrencyYen(5000, 'ja')).toBe('￥5,000');
		expect(formatCurrencyYen(5000, 'en')).toBe('¥5,000');
	});

	it('formats supported subscription currencies', () => {
		expect(formatCurrency(20, 'USD', 'en')).toBe('$20.00');
		expect(formatCurrency(39, 'EUR', 'en')).toBe('€39.00');
		expect(formatCurrency(35, 'GBP', 'en')).toBe('£35.00');
		expect(formatCurrency(5000, 'JPY', 'ja')).toBe('￥5,000');
	});

	it('formats notify labels per locale', () => {
		expect(formatNotifyDays(0, 'ja')).toBe('当日');
		expect(formatNotifyDays(3, 'ja')).toBe('3日前');
		expect(formatNotifyDays(0, 'en')).toBe('Same day');
		expect(formatNotifyDays(1, 'en')).toBe('1 day before');
		expect(formatNotifyDays(3, 'en')).toBe('3 days before');
	});

	it('returns localized cycle labels', () => {
		expect(getCycleLabel('monthly', 'ja')).toBe('毎月');
		expect(getCycleLabel('quarterly', 'en')).toBe('Every 3 months');
		expect(getCycleUnitLabel('yearly', 'ja')).toBe('年');
		expect(getCycleUnitLabel('monthly', 'en')).toBe('month');
	});

	it('formats long dates per locale', () => {
		expect(formatLongDate('2026-03-13', 'ja')).toContain('2026');
		expect(formatLongDate('2026-03-13', 'en')).toContain('2026');
	});

	it('returns tracked subscription status labels', () => {
		expect(getTrackedSubscriptionStatusLabel('active', 'ja')).toBe('登録中');
		expect(getTrackedSubscriptionStatusLabel('canceled', 'en')).toBe('Canceled');
	});

	it('returns cancellation method labels and descriptions', () => {
		expect(getCancellationMethodLabel('app_store', 'ja')).toBe('App Store');
		expect(getCancellationMethodLabel('google_play', 'en')).toBe('Google Play');
		expect(getCancellationMethodDescription('phone', 'ja')).toContain('電話');
		expect(getCancellationMethodDescription(undefined, 'en')).toContain('Save');
	});
});

describe('calendar date formatting', () => {
	afterEach(() => vi.unstubAllEnvs());

	it.each(['America/Los_Angeles', 'Asia/Tokyo', 'UTC'])(
		'preserves a selected calendar day on a %s device',
		(timeZone) => {
			vi.stubEnv('TZ', timeZone);
			expect(formatCalendarDate('2026-06-24', 'en')).toBe('Wed, June 24, 2026');
			expect(formatCalendarDate('2026-06-24', 'ja')).toBe('2026年6月24日(水)');
		}
	);

	it('preserves instant semantics for Date inputs and handles missing/invalid values', () => {
		vi.stubEnv('TZ', 'America/Los_Angeles');
		expect(formatCalendarDate(new Date('2026-06-24T00:00:00Z'), 'en')).toBe('Tue, June 23, 2026');
		expect(formatCalendarDate('not-a-date', 'en')).toBe('');
		expect(formatCalendarDate(null, 'en')).toBe('');
	});
});
