import { stripLocalePrefix } from '$lib/locale-routing';
import type { Reroute } from '@sveltejs/kit';

export const reroute: Reroute = ({ url }) => stripLocalePrefix(url.pathname);
