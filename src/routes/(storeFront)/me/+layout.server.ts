import { createAuth } from '$lib/auth.js';
import { DEFAULT_LOCALE } from '$lib/constant.js';
import { getLocalePrefix, localizePathname } from '$lib/locale-routing.js';
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals, request, url }) => {
	const { db } = locals;
	const auth = createAuth(db);
	const session = await auth.api.getSession({
		headers: request.headers
	});
	if (!session) {
		redirect(303, localizePathname('/', getLocalePrefix(url.pathname) ?? DEFAULT_LOCALE));
	}
};
