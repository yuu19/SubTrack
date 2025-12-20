import { paraglideMiddleware } from '$lib/paraglide/server';
import * as Sentry from '@sentry/sveltekit';
import { sentryHandle, initCloudflareSentryHandle } from '@sentry/sveltekit';
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { createDb } from '$lib/server/db';
import { createAuth } from '$lib/auth';
import Database from 'better-sqlite3';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import * as schema from '$lib/server/db/schema';

const protectedUserRoutes = ['/me', '/checkout', '/subscriptions'];

const handleAuth: Handle = async ({ event, resolve }) => {
	const { locals, url, request } = event;
	const { db } = locals;
	const auth = createAuth(db);
	const session = await auth.api.getSession({ headers: request.headers });

	if (url.pathname.startsWith('/admin') && session?.user.role !== 'admin') {
		redirect(303, '/');
	}
	

	const isProtectedUserRoute = protectedUserRoutes.some((route) => url.pathname.startsWith(route));

	if (isProtectedUserRoute && !session) {
		redirect(303, '/');
	}

	return svelteKitHandler({ event, resolve, auth });
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

const preloadFonts: Handle = async ({ event, resolve }) => {
	const response = await resolve(event, { preload: ({ type }) => type === 'font' });

	return response;
};

const serverDsn = process.env.SENTRY_DSN;
const sentryHandleConfigured: Handle | undefined = serverDsn
	? initCloudflareSentryHandle({
			dsn: serverDsn,
			// Adds request headers and IP for users, for more info visit:
			// https://docs.sentry.io/platforms/javascript/guides/sveltekit/configuration/options/#sendDefaultPii
			sendDefaultPii: true,
			// Capture 100% of transactions for tracing (tune in prod)
			tracesSampleRate: 1.0,
			// Enable logs to be sent to Sentry
			enableLogs: true
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

export const handle = sequence(
	handleParaglide,
	sentryHandleConfigured ?? noopHandle,
	sentryHandle(),
	preloadFonts,
	handleDb,
	handleAuth
);
