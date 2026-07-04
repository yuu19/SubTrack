import { json, type RequestHandler } from '@sveltejs/kit';
import { createAuth } from '$lib/auth';
import { isAdminUser, parseAdminUserIds } from '$lib/server/admin';
import { setAdminMfaCookie } from '$lib/server/admin-security';

const getSetCookieHeaders = (headers: Headers) => {
	const nativeGetSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
	if (nativeGetSetCookie) return nativeGetSetCookie.call(headers);

	const combined = headers.get('set-cookie');
	return combined ? [combined] : [];
};

export const POST: RequestHandler = async ({ locals: { db }, request, cookies, url }) => {
	const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
	const code = typeof body?.code === 'string' ? body.code.trim() : '';
	if (!/^\d{6}$/.test(code)) {
		return json({ error: 'Enter the 6-digit authentication code.' }, { status: 400 });
	}

	const auth = createAuth(db, { requestOrigin: url.origin });

	try {
		const result = await auth.api.verifyTOTP({
			headers: request.headers,
			body: {
				code
			},
			returnHeaders: true
		});
		const userId = result.response.user.id;
		const user = await db.query.user.findFirst({
			columns: {
				id: true,
				role: true
			},
			where: (table, { eq }) => eq(table.id, userId)
		});

		if (!isAdminUser(user ?? null, parseAdminUserIds(process.env.ADMIN_USER_IDS))) {
			return json({ error: 'Admin privileges are required.' }, { status: 403 });
		}

		const cookieSet = await setAdminMfaCookie(cookies, userId);
		if (!cookieSet) {
			return json({ error: 'Admin verification is not configured.' }, { status: 500 });
		}

		const response = json({ ok: true });
		for (const cookie of getSetCookieHeaders(result.headers)) {
			response.headers.append('set-cookie', cookie);
		}
		return response;
	} catch {
		return json({ error: 'The authentication code is invalid or expired.' }, { status: 401 });
	}
};
