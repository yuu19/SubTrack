import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { createAuth } from '$lib/auth';
import { listActiveEntitlementsForUser } from '$lib/server/entitlements';
import {
	UTF8_BOM,
	buildSubscriptionImportTemplateCsv,
	buildSubscriptionImportTemplateFilename
} from '$lib/server/subscription-export';
import { getCurrentPlan } from '$lib/server/plan';

export const GET: RequestHandler = async ({ request, locals: { db } }) => {
	const auth = createAuth(db);
	const session = await auth.api.getSession({ headers: request.headers });
	const userId = session?.user.id;
	if (!userId) error(401, 'unauthorized request');

	const billingSubscriptions = await db.query.subscription.findMany({
		where: (subscription, { eq }) => eq(subscription.referenceId, userId)
	});
	const entitlements = await listActiveEntitlementsForUser(db, userId);
	const { currentPlan } = getCurrentPlan(billingSubscriptions, entitlements);
	if (!currentPlan.isPremium) error(403, 'premium plan required');

	return new Response(`${UTF8_BOM}${buildSubscriptionImportTemplateCsv()}`, {
		headers: {
			'cache-control': 'no-store',
			'content-disposition': `attachment; filename="${buildSubscriptionImportTemplateFilename()}"`,
			'content-type': 'text/csv; charset=utf-8'
		}
	});
};
