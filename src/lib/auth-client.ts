import { adminClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/svelte'; // make sure to import from better-auth/svelte
import { stripeClient } from '@better-auth/stripe/client';
import { magicLinkClient } from 'better-auth/client/plugins';
import { toast } from 'svelte-sonner';

export const authClient = createAuthClient({
	plugins: [
		adminClient(),
		stripeClient({
			subscription: true
		}),
		magicLinkClient()
	],
	fetchOptions: {
		onError(e) {
			if (e.error.status === 429) {
				toast.error('Too many requests. Please try again later.');
			}
		}
	}
});
