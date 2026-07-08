import { paraglideMiddleware } from '$lib/paraglide/server';
import * as Sentry from '@sentry/sveltekit';
import { sentryHandle, initCloudflareSentryHandle } from '@sentry/sveltekit';
import { building } from '$app/environment';
import { error, redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { createDb } from '$lib/server/db';
import { createAuth } from '$lib/auth';
import { THEMES } from '$lib/constant';
import { isPublicDemoPathname } from '$lib/server/public-routes';
import {
	clearExpiredAdminLock,
	findAdminSignInUser,
	hasValidAdminMfaCookie,
	isAdminLoginLocked,
	localizedAdminSecurityPath,
	recordAdminSignInResult,
	requireAdminExtraAccess
} from '$lib/server/admin-security';
import {
	getLocalePrefix,
	hasLocalePrefix,
	hasUnsupportedTwoLetterLocalePrefix,
	isAppLocale,
	isHtmlLocaleRedirectExcludedPath,
	localizePathname,
	selectPreferredLocale,
	stripLocalePrefix,
	SUBTRACK_LOCALE_COOKIE
} from '$lib/locale-routing';
import Database from 'better-sqlite3';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import * as schema from '$lib/server/db/schema';

const protectedUserRoutes = ['/me', '/subscriptions'];

const localizedHomePath = (pathname: string) =>
	localizePathname('/', getLocalePrefix(pathname) ?? 'ja');

const handleAuth: Handle = async ({ event, resolve }) => {
	const { locals, url, request } = event;
	const canonicalPathname = stripLocalePrefix(url.pathname);

	if (isPublicDemoPathname(canonicalPathname)) {
		return resolve(event);
	}

	const { db } = locals;
	const auth = createAuth(db, {
		requestOrigin: event.url.origin,
		initialLocale: event.cookies.get(SUBTRACK_LOCALE_COOKIE)
	});
	const session = await auth.api.getSession({ headers: request.headers });
	const adminExtraAccessResponse = requireAdminExtraAccess(event, canonicalPathname);

	if (adminExtraAccessResponse) {
		return adminExtraAccessResponse;
	}

	const isEmailPasswordSignIn =
		canonicalPathname === '/api/auth/sign-in/email' && request.method === 'POST';
	const adminSignInUser = isEmailPasswordSignIn
		? await findAdminSignInUser(db, request.clone())
		: null;

	if (adminSignInUser) {
		await clearExpiredAdminLock(db, adminSignInUser);
		if (isAdminLoginLocked(adminSignInUser)) {
			return new Response('Admin account is temporarily locked', { status: 403 });
		}
	}

	if (canonicalPathname.startsWith('/api/auth/admin')) {
		if (session?.user.role !== 'admin') {
			return new Response('Forbidden', { status: 403 });
		}

		const adminRecord = await db.query.user.findFirst({
			columns: {
				twoFactorEnabled: true
			},
			where: (user, { eq }) => eq(user.id, session.user.id)
		});

		if (!adminRecord?.twoFactorEnabled) {
			return new Response('Admin two-factor setup is required', { status: 403 });
		}

		const hasAdminMfa = await hasValidAdminMfaCookie(event.cookies, session.user.id);
		if (!hasAdminMfa) {
			return new Response('Admin two-factor verification is required', { status: 403 });
		}
	}

	if (canonicalPathname.startsWith('/admin') && canonicalPathname !== '/admin/security') {
		if (session?.user.role !== 'admin') {
			redirect(303, localizedHomePath(url.pathname));
		}

		const adminRecord = await db.query.user.findFirst({
			columns: {
				twoFactorEnabled: true
			},
			where: (user, { eq }) => eq(user.id, session.user.id)
		});

		if (!adminRecord?.twoFactorEnabled) {
			redirect(303, localizedAdminSecurityPath(url.pathname));
		}

		const hasAdminMfa = await hasValidAdminMfaCookie(event.cookies, session.user.id);
		if (!hasAdminMfa) {
			redirect(303, localizedAdminSecurityPath(url.pathname, true));
		}
	} else if (canonicalPathname.startsWith('/admin') && session && session.user.role !== 'admin') {
		redirect(303, localizedHomePath(url.pathname));
	}

	const isProtectedUserRoute = protectedUserRoutes.some((route) =>
		canonicalPathname.startsWith(route)
	);

	if (isProtectedUserRoute && !session) {
		redirect(303, localizedHomePath(url.pathname));
	}

	const response = await svelteKitHandler({ event, resolve, auth, building });

	if (adminSignInUser) {
		await recordAdminSignInResult(db, adminSignInUser, response.ok);
	}

	return response;
};

export const handleDb: Handle = async ({ event, resolve }) => {
	const platform = event.platform;
	const e2eDbPath = process.env.E2E_DB_PATH;

	if (e2eDbPath) {
		const sqlite = new Database(e2eDbPath);
		const db = drizzleSqlite(sqlite, { schema });

		event.locals.db = db as any;
	} else if (platform) {
		const db = createDb(platform.env.DB);

		event.locals.db = db;
		event.locals.bucket = platform.env.BUCKET;
	} else {
		// local dev fallback to file-based sqlite
		const sqlite = new Database('local.db');
		const db = drizzleSqlite(sqlite, { schema });

		event.locals.db = db as any;
	}

	return resolve(event);
};

const handleLocaleRouting: Handle = async ({ event, resolve }) => {
	const { url, request } = event;
	const isPageRequest = request.method === 'GET' && !isHtmlLocaleRedirectExcludedPath(url.pathname);

	if (!isPageRequest) {
		return resolve(event);
	}

	if (hasUnsupportedTwoLetterLocalePrefix(url.pathname)) {
		error(404, 'Not found');
	}

	if (hasLocalePrefix(url.pathname)) {
		return resolve(event);
	}

	let userLocale: string | null | undefined;
	try {
		if (event.locals.db) {
			const auth = createAuth(event.locals.db, { requestOrigin: event.url.origin });
			const session = await auth.api.getSession({
				headers: event.request.headers
			});
			const userId = session?.user.id;

			if (userId) {
				const record = await event.locals.db.query.user.findFirst({
					columns: {
						locale: true
					},
					where: (t, { eq }) => eq(t.id, userId)
				});
				userLocale = record?.locale;
			}
		}
	} catch {
		// Continue with cookie and Accept-Language fallback if auth or DB lookup fails.
	}

	const locale = selectPreferredLocale({
		userLocale: isAppLocale(userLocale) ? userLocale : null,
		cookieLocale: event.cookies.get(SUBTRACK_LOCALE_COOKIE),
		acceptLanguage: request.headers.get('accept-language')
	});
	const redirectUrl = new URL(url);
	redirectUrl.pathname = localizePathname(url.pathname, locale);

	redirect(302, `${redirectUrl.pathname}${redirectUrl.search}`);
};

const preloadFonts: Handle = async ({ event, resolve }) => {
	const response = await resolve(event, { preload: ({ type }) => type === 'font' });

	return response;
};

const serverDsn = process.env.SENTRY_DSN;
const sentryHandleConfigured: Handle | undefined = serverDsn
	? initCloudflareSentryHandle({
			dsn: serverDsn,
			sendDefaultPii: false,
			tracesSampleRate: 0.1,
			enableLogs: false
		})
	: undefined;
const noopHandle: Handle = async ({ event, resolve }) => resolve(event);

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
		});
	});

const handleTheme: Handle = async ({ event, resolve }) => {
	const accept = event.request.headers.get('accept') ?? '';
	if (event.request.method !== 'GET' || !accept.includes('text/html')) {
		return resolve(event);
	}

	let activeTheme = 'rose';
	if (!isPublicDemoPathname(event.url.pathname)) {
		try {
			const auth = createAuth(event.locals.db, { requestOrigin: event.url.origin });
			const session = await auth.api.getSession({
				headers: event.request.headers
			});
			const userId = session?.user.id;
			if (userId) {
				const record = await event.locals.db.query.user.findFirst({
					columns: {
						activeTheme: true
					},
					where: (t, { eq }) => eq(t.id, userId)
				});
				if (record?.activeTheme && THEMES.includes(record.activeTheme)) {
					activeTheme = record.activeTheme;
				}
			}
		} catch {
			// Keep default theme if anything fails
		}
	}

	const themeClass = `theme-${activeTheme}`;
	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace('%theme%', activeTheme).replace('%themeClass%', themeClass)
	});
};

export const handle = sequence(
	handleDb,
	handleLocaleRouting,
	handleParaglide,
	sentryHandleConfigured ?? noopHandle,
	sentryHandle(),
	preloadFonts,
	handleAuth,
	handleTheme
);
