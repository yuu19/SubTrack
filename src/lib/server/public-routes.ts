const stripTrailingSlash = (pathname: string) =>
	pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

export const normalizeLocalizedPathname = (pathname: string) => {
	const withoutJapanesePrefix = pathname.replace(/^\/ja(?=\/|$)/, '') || '/';
	return stripTrailingSlash(withoutJapanesePrefix);
};

export const isPublicDemoPathname = (pathname: string) =>
	normalizeLocalizedPathname(pathname) === '/demo';
