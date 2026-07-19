import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { DEFAULT_LOCALE } from '$lib/constant';
import { getLocalePrefix, localizePathname } from '$lib/locale-routing';

export const load: PageServerLoad = async ({ parent, url }) => {
	const { user } = await parent();
	if (user) {
		redirect(
			303,
			localizePathname('/subscriptions', getLocalePrefix(url.pathname) ?? DEFAULT_LOCALE)
		);
	}

	return {};
};
