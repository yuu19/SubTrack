import type { RequestHandler } from './$types';
import { createAuth } from '$lib/auth';
import { listActiveEntitlementsForUser } from '$lib/server/entitlements';
import {
	UTF8_BOM,
	buildSubscriptionExportCsv,
	buildSubscriptionExportFilename
} from '$lib/server/subscription-export';
import { getCurrentPlan } from '$lib/server/plan';
import { listSubscriptionManagementItems } from '$lib/server/subscription-management-items';
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
			currency: true,
			firstPaymentDate: true,
			nextBillingAt: true,
			daysUntilNextBilling: true,
			notifyDaysBefore: true,
			categoryId: true,
			paymentMethodId: true,
			status: true,
			canceledAt: true,
			cancellationMethod: true
		},
		where: (trackedSubscription, { eq }) => eq(trackedSubscription.userId, userId),
		orderBy: (trackedSubscription, { desc }) => desc(trackedSubscription.createdAt)
	});
	const { categories, paymentMethods } = await listSubscriptionManagementItems(db, userId);
	const categoryById = new Map(categories.map((category) => [category.id, category.name]));
	const paymentMethodById = new Map(
		paymentMethods.map((paymentMethod) => [paymentMethod.id, paymentMethod.name])
	);

	const csv = buildSubscriptionExportCsv(
		subscriptions.map((subscription) => ({
			...subscription,
			categoryName:
				subscription.categoryId !== null ? categoryById.get(subscription.categoryId) : null,
			paymentMethodName:
				subscription.paymentMethodId !== null
					? paymentMethodById.get(subscription.paymentMethodId)
					: null
		}))
	);

	return new Response(`${UTF8_BOM}${csv}`, {
		headers: {
			'cache-control': 'no-store',
			'content-disposition': `attachment; filename="${buildSubscriptionExportFilename()}"`,
			'content-type': 'text/csv; charset=utf-8'
		}
	});
};
