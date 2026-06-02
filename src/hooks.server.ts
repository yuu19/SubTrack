import { APP_LOCALES, type AppLocale } from '$lib/constant';
import { cookieMaxAge, cookieName } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';
import * as Sentry from '@sentry/sveltekit';
import { sentryHandle, initCloudflareSentryHandle } from '@sentry/sveltekit';
import { building } from '$app/environment';
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { createDb } from '$lib/server/db';
import { createAuth } from '$lib/auth';
import { THEMES } from '$lib/constant';
import Database from 'better-sqlite3';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import * as schema from '$lib/server/db/schema';

const protectedUserRoutes = ['/me', '/subscriptions'];

const isAppLocale = (value: string | null | undefined): value is AppLocale =>
	value !== undefined && value !== null && APP_LOCALES.includes(value as AppLocale);

const upsertCookieHeader = (header: string, name: string, value: string) => {
	const parts = header
		.split(';')
		.map((part) => part.trim())
		.filter(Boolean)
		.filter((part) => !part.startsWith(`${name}=`));

	parts.push(`${name}=${value}`);
	return parts.join('; ');
};

const handleAuth: Handle = async ({ event, resolve }) => {
	const { locals, url, request } = event;
	const { db } = locals;
	const auth = createAuth(db, { requestOrigin: event.url.origin });
	const session = await auth.api.getSession({ headers: request.headers });

	if (url.pathname.startsWith('/admin') && session?.user.role !== 'admin') {
		redirect(303, '/');
	}

	const isProtectedUserRoute = protectedUserRoutes.some((route) => url.pathname.startsWith(route));

	if (isProtectedUserRoute && !session) {
		redirect(303, '/');
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handleDb: Handle = async ({ event, resolve }) => {
	const platform = event.platform;

	if (platform) {
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

const handleLocalePreference: Handle = async ({ event, resolve }) => {
	const accept = event.request.headers.get('accept') ?? '';
	const isDocumentRequest = event.request.method === 'GET' && accept.includes('text/html');

	if (!isDocumentRequest || !event.locals.db) {
		return resolve(event);
	}

	try {
		const auth = createAuth(event.locals.db, { requestOrigin: event.url.origin });
		const session = await auth.api.getSession({
			headers: event.request.headers
		});
		const userId = session?.user.id;

		if (!userId) {
			return resolve(event);
		}

		const record = await event.locals.db.query.user.findFirst({
			columns: {
				locale: true
			},
			where: (t, { eq }) => eq(t.id, userId)
		});
		const locale = record?.locale;

		if (!isAppLocale(locale)) {
			return resolve(event);
		}

		const requestHeaders = new Headers(event.request.headers);
		const cookieHeader = requestHeaders.get('cookie') ?? '';
		requestHeaders.set('cookie', upsertCookieHeader(cookieHeader, cookieName, locale));
		event.request = new Request(event.request, {
			headers: requestHeaders
		});

		if (event.cookies.get(cookieName) !== locale) {
			event.cookies.set(cookieName, locale, {
				path: '/',
				maxAge: cookieMaxAge,
				sameSite: 'lax'
			});
		}
	} catch {
		// Fall through to default locale resolution if auth or db lookup fails.
	}

	return resolve(event);
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

	const themeClass = `theme-${activeTheme}`;
	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace('%theme%', activeTheme).replace('%themeClass%', themeClass)
	});
};

export const handle = sequence(
	handleDb,
	handleLocalePreference,
	handleParaglide,
	sentryHandleConfigured ?? noopHandle,
	sentryHandle(),
	preloadFonts,
	handleAuth,
	handleTheme
);
