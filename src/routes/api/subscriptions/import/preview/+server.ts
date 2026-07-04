import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { createAuth } from '$lib/auth';
import { csvImportApiCopy, resolveRequestLocale } from '$lib/i18n-copy';
import { listActiveEntitlementsForUser } from '$lib/server/entitlements';
import { getCurrentPlan } from '$lib/server/plan';
import { parseSubscriptionImportCsv } from '$lib/server/subscription-import';

const MAX_IMPORT_BYTES = 512 * 1024;
type CsvImportApiMessages = (typeof csvImportApiCopy)['ja'];
type CsvTextResult = { csv: string } | { error: Response };
type PremiumUserResult =
	| {
			userId: string;
			defaultNotifyDaysBefore: number;
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
		defaultNotifyDaysBefore: userRecord?.defaultNotifyDaysBefore ?? 3
	};
};

export const POST: RequestHandler = async ({ request, cookies, locals: { db } }) => {
	const locale = resolveRequestLocale(request, cookies);
	const copy = csvImportApiCopy[locale];
	const userResult = await requirePremiumUser(db, request, copy);
	if ('error' in userResult) return userResult.error;
	const { userId, defaultNotifyDaysBefore } = userResult;
	const csvResult = await getCsvText(request, copy);
	if ('error' in csvResult) return csvResult.error;
	const { csv } = csvResult;
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
