import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { createAuth } from '$lib/auth';
import { isE2EBillingTestHelpersEnabled } from '$lib/server/billing-clock';
import { syncStripeSubscriptionForE2E } from '$lib/server/billing-e2e';
import { getStripeClient } from '$lib/server/stripe';

export const POST: RequestHandler = async ({ request, locals, url }) => {
	if (!isE2EBillingTestHelpersEnabled()) {
		error(404, 'not found');
	}

	const stripeClient = getStripeClient();
	if (!stripeClient) {
		error(500, 'stripe is not configured');
	}

	const auth = createAuth(locals.db, { requestOrigin: url.origin });
	const session = await auth.api.getSession({ headers: request.headers });
	const userId = session?.user.id;
	if (!userId) {
		error(401, 'unauthorized');
	}

	const body = (await request.json().catch(() => null)) as {
		subscriptionId?: unknown;
		planName?: unknown;
	} | null;
	const subscriptionId = typeof body?.subscriptionId === 'string' ? body.subscriptionId : '';
	if (!subscriptionId) {
		error(400, 'subscriptionId is required');
	}

	const result = await syncStripeSubscriptionForE2E({
		db: locals.db,
		stripeClient,
		userId,
		subscriptionId,
		planName: typeof body?.planName === 'string' ? body.planName : undefined
	});

	return json(result);
};
