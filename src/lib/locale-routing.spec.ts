import { describe, expect, it } from 'vitest';
import {
	getLocalePrefix,
	hasUnsupportedTwoLetterLocalePrefix,
	isHtmlLocaleRedirectExcludedPath,
	localizeInternalHref,
	resolveAcceptLanguageLocale,
	selectPreferredLocale,
	stripLocalePrefix
} from './locale-routing';

describe('locale routing helpers', () => {
	it('detects supported locale prefixes', () => {
		expect(getLocalePrefix('/ja/faq')).toBe('ja');
		expect(getLocalePrefix('/en')).toBe('en');
		expect(getLocalePrefix('/faq')).toBeNull();
		expect(getLocalePrefix('/fr/faq')).toBeNull();
	});

	it('strips supported locale prefixes', () => {
		expect(stripLocalePrefix('/ja/faq')).toBe('/faq');
		expect(stripLocalePrefix('/en')).toBe('/');
		expect(stripLocalePrefix('/en/')).toBe('/');
		expect(stripLocalePrefix('/foo')).toBe('/foo');
	});

	it('detects unsupported two-letter locale prefixes', () => {
		expect(hasUnsupportedTwoLetterLocalePrefix('/fr/faq')).toBe(true);
		expect(hasUnsupportedTwoLetterLocalePrefix('/es')).toBe(true);
		expect(hasUnsupportedTwoLetterLocalePrefix('/foo')).toBe(false);
		expect(hasUnsupportedTwoLetterLocalePrefix('/ja/faq')).toBe(false);
	});

	it('excludes API, static assets, and server endpoints from locale redirects', () => {
		expect(isHtmlLocaleRedirectExcludedPath('/api/locale')).toBe(true);
		expect(isHtmlLocaleRedirectExcludedPath('/manifest.webmanifest')).toBe(true);
		expect(isHtmlLocaleRedirectExcludedPath('/service-worker.js')).toBe(true);
		expect(isHtmlLocaleRedirectExcludedPath('/images/logo.png')).toBe(true);
		expect(isHtmlLocaleRedirectExcludedPath('/subscriptions/export')).toBe(true);
		expect(isHtmlLocaleRedirectExcludedPath('/faq')).toBe(false);
	});

	it('resolves Accept-Language to supported locales', () => {
		expect(resolveAcceptLanguageLocale('ja-JP,ja;q=0.9,en;q=0.8')).toBe('ja');
		expect(resolveAcceptLanguageLocale('fr-FR, en-US;q=0.8')).toBe('en');
		expect(resolveAcceptLanguageLocale('fr-FR,de;q=0.8')).toBe('ja');
		expect(resolveAcceptLanguageLocale(null)).toBe('ja');
	});

	it('prefers user locale, then cookie, then Accept-Language', () => {
		expect(
			selectPreferredLocale({
				userLocale: 'en',
				cookieLocale: 'ja',
				acceptLanguage: 'ja-JP'
			})
		).toBe('en');
		expect(
			selectPreferredLocale({
				userLocale: null,
				cookieLocale: 'en',
				acceptLanguage: 'ja-JP'
			})
		).toBe('en');
		expect(
			selectPreferredLocale({
				userLocale: 'fr',
				cookieLocale: 'de',
				acceptLanguage: 'en-US'
			})
		).toBe('en');
	});

	it('localizes internal HTML links and leaves excluded links untouched', () => {
		expect(localizeInternalHref('/faq', 'ja')).toBe('/ja/faq');
		expect(localizeInternalHref('/ja/faq?open=1#billing', 'en')).toBe('/en/faq?open=1#billing');
		expect(localizeInternalHref('/me/settings#plan-info', 'en')).toBe('/en/me/settings#plan-info');
		expect(localizeInternalHref('/api/locale', 'en')).toBe('/api/locale');
		expect(localizeInternalHref('/subscriptions/export', 'en')).toBe('/subscriptions/export');
		expect(localizeInternalHref('#pricing', 'en')).toBe('#pricing');
		expect(localizeInternalHref('https://example.com/faq', 'en')).toBe('https://example.com/faq');
	});
});
