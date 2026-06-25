import {
	DEFAULT_LOCALE,
	DEFAULT_NOTIFY_TIME,
	DEFAULT_TIME_ZONE,
	type AppLocale
} from '$lib/constant';
import { createAuth } from '$lib/auth.js';
import { userConfigSchema } from '$lib/states/userConfig.svelte';
import { trackedSubscriptionTable, user as userTable } from '$lib/server/db/schema';
import { computeNextBilling } from '$lib/server/subscriptions';
import { isAdminUser, parseAdminUserIds } from '$lib/server/admin';
import { listActiveEntitlementsForUser } from '$lib/server/entitlements';
import { getCurrentPlan } from '$lib/server/plan';
import { isPublicDemoPathname } from '$lib/server/public-routes';
import { defaultSubscriptionIconType } from '$lib/subscription-icons';
import { subscriptionColors } from '$lib/subscription-colors';
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

	if (user && !user.sampleDataSeeded) {
		const existing = await db.query.trackedSubscriptionTable.findFirst({
			columns: {
				id: true
			},
			where: (trackedSubscription, { eq }) => eq(trackedSubscription.userId, user.id)
		});

		if (!existing) {
			const today = new Date();
			const dateSeed = today.toISOString().slice(0, 10);
			const samples = [
				{
					serviceName: 'Netflix',
					color: subscriptionColors[0],
					iconValue: '🎬',
					cycle: 'monthly',
					amount: 1490,
					firstPaymentDate: dateSeed,
					notifyDaysBefore: 3,
					tags: ['動画', 'エンタメ']
				},
				{
					serviceName: 'Spotify',
					color: subscriptionColors[1],
					iconValue: '🎧',
					cycle: 'monthly',
					amount: 980,
					firstPaymentDate: dateSeed,
					notifyDaysBefore: 3,
					tags: ['音楽']
				},
				{
					serviceName: 'Notion',
					color: subscriptionColors[2],
					iconValue: '💼',
					cycle: 'yearly',
					amount: 12000,
					firstPaymentDate: dateSeed,
					notifyDaysBefore: 7,
					tags: ['仕事', 'ツール']
				}
			];

			for (const sample of samples) {
				const billing = computeNextBilling(sample.firstPaymentDate, sample.cycle, {
					timeZone: user.timeZone ?? DEFAULT_TIME_ZONE
				});
				await db.insert(trackedSubscriptionTable).values({
					userId: user.id,
					serviceName: sample.serviceName,
					color: sample.color,
					iconType: defaultSubscriptionIconType,
					iconValue: sample.iconValue,
					cycle: sample.cycle,
					amount: sample.amount,
					firstPaymentDate: sample.firstPaymentDate,
					nextBillingAt: billing.nextBillingAt,
					daysUntilNextBilling: billing.daysUntilNextBilling,
					notifyDaysBefore: sample.notifyDaysBefore,
					tags: sample.tags,
					isSample: true
				});
			}
		}

		await db.update(userTable).set({ sampleDataSeeded: true }).where(eq(userTable.id, user.id));
		user.sampleDataSeeded = true;
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
