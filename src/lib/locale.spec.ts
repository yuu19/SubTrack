import { describe, expect, it } from 'vitest';
import {
	formatCurrencyYen,
	formatLongDate,
	formatNotifyDays,
	getCycleLabel,
	getCycleUnitLabel,
	getIntlLocale,
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
});
