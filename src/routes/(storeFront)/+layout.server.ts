import { DEFAULT_LOCALE, type AppLocale } from '$lib/constant';
import { createAuth } from '$lib/auth.js';
import { userConfigSchema } from '$lib/states/userConfig.svelte';
import { trackedSubscriptionTable, user as userTable } from '$lib/server/db/schema';
import { computeNextBilling } from '$lib/server/subscriptions';
import { isAdminUser, parseAdminUserIds } from '$lib/server/admin';
import { eq } from 'drizzle-orm';

export const load = async ({ request, locals }) => {
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
					cycle: 'monthly',
					amount: 1490,
					firstPaymentDate: dateSeed,
					notifyDaysBefore: 3,
					tags: ['動画', 'エンタメ']
				},
				{
					serviceName: 'Spotify',
					cycle: 'monthly',
					amount: 980,
					firstPaymentDate: dateSeed,
					notifyDaysBefore: 3,
					tags: ['音楽']
				},
				{
					serviceName: 'Notion',
					cycle: 'yearly',
					amount: 12000,
					firstPaymentDate: dateSeed,
					notifyDaysBefore: 7,
					tags: ['仕事', 'ツール']
				}
			];

			for (const sample of samples) {
				const billing = computeNextBilling(sample.firstPaymentDate, sample.cycle);
				await db.insert(trackedSubscriptionTable).values({
					userId: user.id,
					serviceName: sample.serviceName,
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
		activeTheme: user?.activeTheme ?? 'rose',
		defaultNotifyDaysBefore: user?.defaultNotifyDaysBefore ?? 3,
		notificationMethod: user?.notificationMethod ?? 'push'
	});
	const userConfig = parsedConfig.success ? parsedConfig.data : userConfigSchema.parse({});

	return {
		user,
		userConfig,
		isAdmin
	};
};
