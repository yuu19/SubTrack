import { createAuth } from '$lib/auth.js';
import { APP_LOCALES, type AppLocale } from '$lib/constant.js';
import { SUBTRACK_LOCALE_COOKIE, SUBTRACK_LOCALE_COOKIE_MAX_AGE } from '$lib/locale-routing.js';
import { user } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod/v4';

const localeSchema = z.object({
	locale: z.enum(APP_LOCALES)
});

export const POST = async ({ request, cookies, locals: { db } }) => {
	const body = await request.json().catch(() => null);
	const parsed = localeSchema.safeParse(body);
	if (!parsed.success) error(400, 'invalid locale');

	const locale = parsed.data.locale as AppLocale;
	cookies.set(SUBTRACK_LOCALE_COOKIE, locale, {
		path: '/',
		maxAge: SUBTRACK_LOCALE_COOKIE_MAX_AGE,
		sameSite: 'lax'
	});

	let userId: string | undefined;
	try {
		const auth = createAuth(db);
		const session = await auth.api.getSession({
			headers: request.headers
		});
		userId = session?.user.id;
	} catch {
		return json(
			{
				ok: false,
				persistedUser: false,
				persistedCookie: true,
				error: 'user_locale_persist_failed'
			},
			{ status: 500 }
		);
	}
	if (!userId) {
		return json({ ok: true, persistedUser: false, persistedCookie: true });
	}

	try {
		await db.update(user).set({ locale }).where(eq(user.id, userId));
	} catch {
		return json(
			{
				ok: false,
				persistedUser: false,
				persistedCookie: true,
				error: 'user_locale_persist_failed'
			},
			{ status: 500 }
		);
	}

	return json({ ok: true, persistedUser: true, persistedCookie: true });
};
