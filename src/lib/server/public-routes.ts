import { stripLocalePrefix } from '$lib/locale-routing';

const stripTrailingSlash = (pathname: string) =>
	pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

export const normalizeLocalizedPathname = (pathname: string) => {
	return stripTrailingSlash(stripLocalePrefix(pathname));
};

export const isPublicDemoPathname = (pathname: string) =>
	normalizeLocalizedPathname(pathname) === '/demo';
