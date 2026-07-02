import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { createAuth } from '$lib/auth';
import { listActiveEntitlementsForUser } from '$lib/server/entitlements';
import { getCurrentPlan } from '$lib/server/plan';
import { parseSubscriptionImportCsv } from '$lib/server/subscription-import';

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
		defaultNotifyDaysBefore: userRecord?.defaultNotifyDaysBefore ?? 3
	};
};

export const POST: RequestHandler = async ({ request, locals: { db } }) => {
	const { userId, defaultNotifyDaysBefore } = await requirePremiumUser(db, request);
	const csv = await getCsvText(request);
	const preview = parseSubscriptionImportCsv(csv, { defaultNotifyDaysBefore });

	if (preview.errors.length === 0) {
		const [categories, paymentMethods] = await Promise.all([
			db.query.subscriptionCategoryTable.findMany({
				columns: { name: true },
				where: (category, { eq }) => eq(category.userId, userId)
			}),
			db.query.subscriptionPaymentMethodTable.findMany({
				columns: { name: true },
				where: (paymentMethod, { eq }) => eq(paymentMethod.userId, userId)
			})
		]);
		const categoryNames = new Set(categories.map((category) => category.name));
		const paymentMethodNames = new Set(paymentMethods.map((paymentMethod) => paymentMethod.name));
		preview.summary.newCategories = preview.summary.newCategories.filter(
			(name) => !categoryNames.has(name)
		);
		preview.summary.newPaymentMethods = preview.summary.newPaymentMethods.filter(
			(name) => !paymentMethodNames.has(name)
		);
	}

	return json({ preview });
};
