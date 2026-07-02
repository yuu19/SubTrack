import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { createAuth } from '$lib/auth';
import { listActiveEntitlementsForUser } from '$lib/server/entitlements';
import { trackedSubscriptionTable } from '$lib/server/db/schema';
import { getCurrentPlan } from '$lib/server/plan';
import { importSubscriptionsFromCsv } from '$lib/server/subscription-import';
import { listSubscriptionManagementItems } from '$lib/server/subscription-management-items';
import { resolveTimeZone } from '$lib/time-zone';

const MAX_IMPORT_BYTES = 512 * 1024;

const getCsvText = async (request: Request) => {
	const formData = await request.formData();
	const file = formData.get('file');
	if (!file || typeof file === 'string' || typeof file.text !== 'function') {
		error(400, 'csv file required');
	}
	if (typeof file.size === 'number' && file.size > MAX_IMPORT_BYTES) {
		error(400, 'csv file is too large');
	}
	return file.text();
};

const requirePremiumUser = async (db: NonNullable<App.Locals['db']>, request: Request) => {
	const auth = createAuth(db);
	const session = await auth.api.getSession({ headers: request.headers });
	const userId = session?.user.id;
	if (!userId) error(401, 'unauthorized request');

	const [billingSubscriptions, entitlements, userRecord] = await Promise.all([
		db.query.subscription.findMany({
			where: (subscription, { eq }) => eq(subscription.referenceId, userId)
		}),
		listActiveEntitlementsForUser(db, userId),
		db.query.user.findFirst({
			columns: { defaultNotifyDaysBefore: true, timeZone: true },
			where: (user, { eq }) => eq(user.id, userId)
		})
	]);
	const { currentPlan } = getCurrentPlan(billingSubscriptions, entitlements);
	if (!currentPlan.isPremium) error(403, 'premium plan required');

	return {
		userId,
		defaultNotifyDaysBefore: userRecord?.defaultNotifyDaysBefore ?? 3,
		timeZone: resolveTimeZone(userRecord?.timeZone)
	};
};

export const POST: RequestHandler = async ({ request, locals: { db } }) => {
	const { userId, defaultNotifyDaysBefore, timeZone } = await requirePremiumUser(db, request);
	const csv = await getCsvText(request);

	const result = await importSubscriptionsFromCsv({
		db,
		userId,
		csv,
		defaultNotifyDaysBefore,
		timeZone
	});

	if (result.preview.errors.length > 0 || result.preview.summary.errorRows > 0) {
		return json({ preview: result.preview, imported: 0 }, { status: 400 });
	}

	const [subscriptions, managementItems] = await Promise.all([
		db
			.select()
			.from(trackedSubscriptionTable)
			.where(eq(trackedSubscriptionTable.userId, userId))
			.orderBy(desc(trackedSubscriptionTable.createdAt)),
		listSubscriptionManagementItems(db, userId)
	]);

	return json({
		imported: result.imported,
		createdCategories: result.createdCategories,
		createdPaymentMethods: result.createdPaymentMethods,
		preview: result.preview,
		subscriptions,
		categories: managementItems.categories,
		paymentMethods: managementItems.paymentMethods
	});
};
