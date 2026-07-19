import { DEFAULT_LOCALE } from '$lib/constant';
import { getLocalePrefix, localizePathname } from '$lib/locale-routing';
import { redirect } from '@sveltejs/kit';

export const load = async ({ url }) => {
	redirect(303, localizePathname('/me/settings', getLocalePrefix(url.pathname) ?? DEFAULT_LOCALE));
};
