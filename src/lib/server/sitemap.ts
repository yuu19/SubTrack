import { APP_LOCALES } from '$lib/constant';
import { getLocalizedSeoLinks } from '$lib/locale-routing';

const publicPaths = [
	'/',
	'/demo',
	'/faq',
	'/push',
	'/terms',
	'/privacy',
	'/commercial-transactions'
];

const escapeXml = (value: string) =>
	value.replace(/[&<>"']/g, (character) => {
		const entities: Record<string, string> = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&apos;'
		};
		return entities[character];
	});

export const buildSitemap = () => {
	const entries = publicPaths.flatMap((pathname) =>
		APP_LOCALES.map((locale) => {
			const { canonical, alternates } = getLocalizedSeoLinks(pathname, locale);
			const links = alternates.map(
				({ hreflang, href }) =>
					`    <xhtml:link rel="alternate" hreflang="${escapeXml(hreflang)}" href="${escapeXml(href)}" />`
			);
			return ['  <url>', `    <loc>${escapeXml(canonical)}</loc>`, ...links, '  </url>'].join('\n');
		})
	);

	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
		...entries,
		'</urlset>',
		''
	].join('\n');
};
