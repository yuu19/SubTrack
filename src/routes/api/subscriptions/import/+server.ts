import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { createAuth } from '$lib/auth';
import { csvImportApiCopy, resolveRequestLocale } from '$lib/i18n-copy';
import { listActiveEntitlementsForUser } from '$lib/server/entitlements';
import { trackedSubscriptionTable } from '$lib/server/db/schema';
import { getCurrentPlan } from '$lib/server/plan';
import { importSubscriptionsFromCsv } from '$lib/server/subscription-import';
import { listSubscriptionManagementItems } from '$lib/server/subscription-management-items';
import { resolveTimeZone } from '$lib/time-zone';

const MAX_IMPORT_BYTES = 512 * 1024;
type CsvImportApiMessages = (typeof csvImportApiCopy)['ja'];
type CsvTextResult = { csv: string } | { error: Response };
type PremiumUserResult =
	| {
			userId: string;
			defaultNotifyDaysBefore: number;
			timeZone: string;
	  }
	| { error: Response };

const getCsvText = async (request: Request, copy: CsvImportApiMessages): Promise<CsvTextResult> => {
	const formData = await request.formData();
	const file = formData.get('file');
	if (!file || typeof file === 'string' || typeof file.text !== 'function') {
		return { error: json({ message: copy.fileRequired }, { status: 400 }) };
	}
	if (typeof file.size === 'number' && file.size > MAX_IMPORT_BYTES) {
		return { error: json({ message: copy.fileTooLarge }, { status: 400 }) };
	}
	return { csv: await file.text() };
};

const requirePremiumUser = async (
	db: NonNullable<App.Locals['db']>,
	request: Request,
	copy: CsvImportApiMessages
): Promise<PremiumUserResult> => {
	const auth = createAuth(db);
	const session = await auth.api.getSession({ headers: request.headers });
	const userId = session?.user.id;
	if (!userId) return { error: json({ message: copy.loginRequired }, { status: 401 }) };

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
	if (!currentPlan.isPremium) {
		return { error: json({ message: copy.premiumRequired }, { status: 403 }) };
	}

	return {
		userId,
		defaultNotifyDaysBefore: userRecord?.defaultNotifyDaysBefore ?? 3,
		timeZone: resolveTimeZone(userRecord?.timeZone)
	};
};

export const POST: RequestHandler = async ({ request, cookies, locals: { db } }) => {
	const locale = resolveRequestLocale(request, cookies);
	const copy = csvImportApiCopy[locale];
	const userResult = await requirePremiumUser(db, request, copy);
	if ('error' in userResult) return userResult.error;
	const { userId, defaultNotifyDaysBefore, timeZone } = userResult;
	const csvResult = await getCsvText(request, copy);
	if ('error' in csvResult) return csvResult.error;
	const { csv } = csvResult;

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
