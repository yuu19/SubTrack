import { adminClient, twoFactorClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/svelte'; // make sure to import from better-auth/svelte
import { stripeClient } from '@better-auth/stripe/client';
import { toast } from 'svelte-sonner';
import { authClientCopy, resolveUserFacingLocale } from '$lib/i18n-copy';

const getBrowserLocale = () => {
	const cookieLocale = document.cookie
		.split(';')
		.map((part) => part.trim())
		.find((part) => part.startsWith('subtrack_locale='))
		?.split('=')[1];

	return resolveUserFacingLocale({
		cookieLocale,
		acceptLanguage: navigator.language
	});
};

export const authClient = createAuthClient({
	plugins: [
		adminClient(),
		twoFactorClient({
			onTwoFactorRedirect() {
				window.location.href = '/admin/security?verify=1';
			}
		}),
		stripeClient({
			subscription: true
		})
	],
	fetchOptions: {
		onError(e) {
			if (e.error.status === 429) {
				toast.error(authClientCopy[getBrowserLocale()].tooManyRequests);
			}
		}
	}
});
