import { invalidateAll } from '$app/navigation';
import type { AppLocale } from '$lib/constant';
import { toast } from 'svelte-sonner';

type StartLifetimeCheckoutOptions = {
	returnPath: string;
	locale: AppLocale;
	errorMessage: string;
	purchasedMessage: string;
};

type LifetimeCheckoutResponse = {
	url?: string | null;
	alreadyPurchased?: boolean;
} | null;

export async function startLifetimeCheckout({
	returnPath,
	locale,
	errorMessage,
	purchasedMessage
}: StartLifetimeCheckoutOptions) {
	const response = await fetch('/api/stripe/lifetime-checkout', {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify({ returnPath, locale })
	});

	const payload = (await response.json().catch(() => null)) as LifetimeCheckoutResponse;

	if (!response.ok) {
		toast.error(errorMessage);
		return { redirected: false, purchased: false };
	}

	if (payload?.alreadyPurchased) {
		toast.success(purchasedMessage);
		await invalidateAll();
		return { redirected: false, purchased: true };
	}

	if (payload?.url) {
		window.location.href = payload.url;
		return { redirected: true, purchased: false };
	}

	toast.error(errorMessage);
	return { redirected: false, purchased: false };
}
