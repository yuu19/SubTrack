import {
	APP_LOCALES,
	DEFAULT_LOCALE,
	DEFAULT_NOTIFY_TIME,
	DEFAULT_TIME_ZONE,
	type AppLocale
} from '$lib/constant';
import { createAuth } from '$lib/auth.js';
import { userConfigSchema } from '$lib/states/userConfig.svelte';
import { user as userTable } from '$lib/server/db/schema';
import { isAdminUser, parseAdminUserIds } from '$lib/server/admin';
import { listActiveEntitlementsForUser } from '$lib/server/entitlements';
import { getCurrentPlan } from '$lib/server/plan';
import { isPublicDemoPathname } from '$lib/server/public-routes';
import { seedDefaultSubscriptionManagementItems } from '$lib/server/subscription-management-items';
import { eq } from 'drizzle-orm';

export const load = async ({ request, locals, url }) => {
	if (isPublicDemoPathname(url.pathname)) {
		return {
			user: null,
			userConfig: userConfigSchema.parse({}),
			isAdmin: false,
			currentPlan: {
				planName: 'Free',
				isPremium: false,
				isPendingCancel: false,
				status: null,
				accessEndsAt: null,
				hasSubscriptionAccess: false,
				hasLifetimeEntitlement: false
			}
		};
	}

	const { db } = locals;
	const auth = createAuth(db);
	const session = await auth.api.getSession({
		headers: request.headers
	});
	const adminUserIds = parseAdminUserIds(process.env.ADMIN_USER_IDS);
	const id = session?.user.id || '';
	const user = id
		? ((await db.query.user.findFirst({
				where: (user, { eq }) => eq(user.id, id)
			})) ?? null)
		: null;
	const isAdmin = isAdminUser(user, adminUserIds);

	const seedLocale =
		user && APP_LOCALES.includes(user.locale as AppLocale)
			? (user.locale as AppLocale)
			: DEFAULT_LOCALE;

	if (user) {
		await seedDefaultSubscriptionManagementItems(db, user.id, seedLocale);
		if (!user.subscriptionManagementItemsSeeded) {
			await db
				.update(userTable)
				.set({ subscriptionManagementItemsSeeded: true })
				.where(eq(userTable.id, user.id));
			user.subscriptionManagementItemsSeeded = true;
		}
	}

	const parsedConfig = userConfigSchema.safeParse({
		locale: (user?.locale as AppLocale | null | undefined) ?? DEFAULT_LOCALE,
		timeZone: user?.timeZone ?? DEFAULT_TIME_ZONE,
		activeTheme: user?.activeTheme ?? 'rose',
		defaultNotifyDaysBefore: user?.defaultNotifyDaysBefore ?? 3,
		defaultNotifyTime: user?.defaultNotifyTime ?? DEFAULT_NOTIFY_TIME,
		notificationMethod: user?.notificationMethod ?? 'email'
	});
	const userConfig = parsedConfig.success ? parsedConfig.data : userConfigSchema.parse({});
	const billingSubscriptions =
		user && db
			? await db.query.subscription.findMany({
					where: (subscription, { eq }) => eq(subscription.referenceId, user.id)
				})
			: [];
	const entitlements = user && db ? await listActiveEntitlementsForUser(db, user.id) : [];
	const { currentPlan } = getCurrentPlan(billingSubscriptions, entitlements);

	return {
		user,
		userConfig,
		isAdmin,
		currentPlan
	};
};
