import { APP_LOCALES, DEFAULT_LOCALE, type AppLocale } from '$lib/constant';

export const SUBTRACK_LOCALE_COOKIE = 'subtrack_locale';
export const SUBTRACK_LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;
export const PUBLIC_SITE_ORIGIN = 'https://subtracknotify.com';

const localePrefixPattern = /^\/([a-z]{2})(?=\/|$)/;
const staticAssetPrefixes = [
	'/.well-known/',
	'/_app/',
	'/@fs/',
	'/@vite/',
	'/assets/',
	'/build/',
	'/hero/',
	'/images/',
	'/node_modules/'
] as const;
const staticAssetPaths = new Set([
	'/apple-touch-icon.png',
	'/favicon.png',
	'/manifest.webmanifest',
	'/robots.txt',
	'/service-worker.js',
	'/sitemap.xml',
	'/subscriptions/export',
	'/subscriptions/import-template'
]);
const fileExtensionPattern = /\/[^/]+\.[a-zA-Z0-9]{1,12}$/;

export const isAppLocale = (value: string | null | undefined): value is AppLocale =>
	value !== undefined && value !== null && APP_LOCALES.includes(value as AppLocale);

export const getLocalePrefix = (pathname: string): AppLocale | null => {
	const segment = localePrefixPattern.exec(pathname)?.[1];
	return isAppLocale(segment) ? segment : null;
};

export const hasLocalePrefix = (pathname: string): boolean => getLocalePrefix(pathname) !== null;

export const stripLocalePrefix = (pathname: string): string => {
	const locale = getLocalePrefix(pathname);
	if (!locale) return pathname || '/';

	const stripped = pathname.slice(locale.length + 1);
	return stripped.startsWith('/') ? stripped : stripped ? `/${stripped}` : '/';
};

export const hasUnsupportedTwoLetterLocalePrefix = (pathname: string): boolean => {
	const segment = localePrefixPattern.exec(pathname)?.[1];
	return Boolean(segment && !isAppLocale(segment));
};

export const isHtmlLocaleRedirectExcludedPath = (pathname: string): boolean => {
	const canonicalPathname = stripLocalePrefix(pathname);

	if (canonicalPathname === '/api' || canonicalPathname.startsWith('/api/')) return true;
	if (staticAssetPaths.has(canonicalPathname)) return true;
	if (staticAssetPrefixes.some((prefix) => canonicalPathname.startsWith(prefix))) return true;

	return fileExtensionPattern.test(canonicalPathname);
};

export const resolveAcceptLanguageLocale = (
	acceptLanguage: string | null | undefined
): AppLocale => {
	if (!acceptLanguage) return DEFAULT_LOCALE;

	const candidates = acceptLanguage
		.split(',')
		.map((entry, index) => {
			const [rawTag = '', ...params] = entry.trim().split(';');
			const qValue = params
				.map((param) => param.trim())
				.find((param) => param.startsWith('q='))
				?.slice(2);
			const q = qValue === undefined ? 1 : Number.parseFloat(qValue);

			return {
				tag: rawTag.toLowerCase(),
				q: Number.isFinite(q) ? q : 0,
				index
			};
		})
		.filter((candidate) => candidate.tag && candidate.q > 0)
		.sort((left, right) => right.q - left.q || left.index - right.index);

	for (const candidate of candidates) {
		const baseTag = candidate.tag.split('-')[0];
		if (isAppLocale(candidate.tag)) return candidate.tag;
		if (isAppLocale(baseTag)) return baseTag;
	}

	return DEFAULT_LOCALE;
};

export const selectPreferredLocale = ({
	userLocale,
	cookieLocale,
	acceptLanguage
}: {
	userLocale?: string | null;
	cookieLocale?: string | null;
	acceptLanguage?: string | null;
}): AppLocale => {
	if (isAppLocale(userLocale)) return userLocale;
	if (isAppLocale(cookieLocale)) return cookieLocale;
	return resolveAcceptLanguageLocale(acceptLanguage);
};

export const localizePathname = (pathname: string, locale: AppLocale): string => {
	const canonicalPathname = stripLocalePrefix(pathname);
	return canonicalPathname === '/' ? `/${locale}` : `/${locale}${canonicalPathname}`;
};

export const localizeInternalHref = (href: string, locale: AppLocale): string => {
	if (
		!href ||
		href.startsWith('#') ||
		href.startsWith('?') ||
		href.startsWith('//') ||
		/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(href)
	) {
		return href;
	}

	if (!href.startsWith('/')) return href;

	const url = new URL(href, 'https://local.subtrack');
	if (isHtmlLocaleRedirectExcludedPath(url.pathname)) {
		return href;
	}

	url.pathname = localizePathname(url.pathname, locale);
	return `${url.pathname}${url.search}${url.hash}`;
};

export const getLocalizedSeoLinks = (pathname: string, locale: AppLocale) => {
	const canonicalPathname = stripLocalePrefix(pathname);

	return {
		canonical: `${PUBLIC_SITE_ORIGIN}${localizePathname(canonicalPathname, locale)}`,
		alternates: [
			{
				hreflang: 'ja',
				href: `${PUBLIC_SITE_ORIGIN}${localizePathname(canonicalPathname, 'ja')}`
			},
			{
				hreflang: 'en',
				href: `${PUBLIC_SITE_ORIGIN}${localizePathname(canonicalPathname, 'en')}`
			},
			{
				hreflang: 'x-default',
				href: `${PUBLIC_SITE_ORIGIN}${localizePathname(canonicalPathname, DEFAULT_LOCALE)}`
			}
		]
	};
};
