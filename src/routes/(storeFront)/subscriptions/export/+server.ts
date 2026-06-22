import type { RequestHandler } from './$types';
import { createAuth } from '$lib/auth';
import { listActiveEntitlementsForUser } from '$lib/server/entitlements';
import {
	UTF8_BOM,
	buildSubscriptionExportCsv,
	buildSubscriptionExportFilename
} from '$lib/server/subscription-export';
import { getCurrentPlan } from '$lib/server/plan';
import { error } from '@sveltejs/kit';

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

	if (!currentPlan.isPremium) {
		error(403, 'premium plan required');
	}

	const subscriptions = await db.query.trackedSubscriptionTable.findMany({
		columns: {
			serviceName: true,
			cycle: true,
			amount: true,
			firstPaymentDate: true,
			nextBillingAt: true,
			daysUntilNextBilling: true,
			notifyDaysBefore: true,
			status: true,
			canceledAt: true,
			cancellationMethod: true,
			tags: true
		},
		where: (trackedSubscription, { eq }) => eq(trackedSubscription.userId, userId),
		orderBy: (trackedSubscription, { desc }) => desc(trackedSubscription.createdAt)
	});

	const csv = buildSubscriptionExportCsv(subscriptions);

	return new Response(`${UTF8_BOM}${csv}`, {
		headers: {
			'cache-control': 'no-store',
			'content-disposition': `attachment; filename="${buildSubscriptionExportFilename()}"`,
			'content-type': 'text/csv; charset=utf-8'
		}
	});
};
