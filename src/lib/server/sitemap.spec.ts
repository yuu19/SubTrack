import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildSitemap } from './sitemap';

describe('public sitemap', () => {
	it('lists both canonical languages for every public page', () => {
		const xml = buildSitemap();
		const locations = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
		expect(locations).toHaveLength(14);
		expect(new Set(locations).size).toBe(14);
		for (const locale of ['ja', 'en']) {
			for (const suffix of [
				'',
				'/demo',
				'/faq',
				'/push',
				'/terms',
				'/privacy',
				'/commercial-transactions'
			]) {
				expect(locations).toContain(`https://subtracknotify.com/${locale}${suffix}`);
			}
		}
		expect(
			locations.some((url) => /\/(subscriptions|calendar|analysis|me|admin|api)(\/|$)/.test(url))
		).toBe(false);
	});

	it('includes reciprocal language alternatives for each page', () => {
		const xml = buildSitemap();
		expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
		const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)];
		expect(entries).toHaveLength(14);
		for (const [, entry] of entries) {
			const location = /<loc>(.*?)<\/loc>/.exec(entry)![1];
			const suffix = new URL(location).pathname.replace(/^\/(ja|en)/, '');
			for (const language of ['ja', 'en', 'x-default']) {
				const locale = language === 'x-default' ? 'ja' : language;
				expect(entry).toContain(
					`hreflang="${language}" href="https://subtracknotify.com/${locale}${suffix}"`
				);
			}
		}
	});

	it('allows public crawling and advertises the sitemap in robots.txt', () => {
		const robots = readFileSync(new URL('../../../static/robots.txt', import.meta.url), 'utf8');
		expect(robots).toContain('User-agent: *');
		expect(robots).toContain('Allow: /');
		expect(robots).not.toMatch(/^Disallow:\s*\/\s*$/m);
		expect(robots).toContain('Sitemap: https://subtracknotify.com/sitemap.xml');
	});
});
