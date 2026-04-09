import type { PageServerLoad } from './$types';
import { createAuth } from '$lib/auth';
import { trackedSubscriptionTable } from '$lib/server/db/schema';
import {
	buildSubscriptionAnalytics,
	emptySubscriptionAnalytics
} from '$lib/server/subscription-analytics';
import { desc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, request }) => {
	const db = locals.db;
	if (!db) {
		return {
			analytics: emptySubscriptionAnalytics()
		};
	}

	const auth = createAuth(db);
	const session = await auth.api.getSession({ headers: request.headers });
	const userId = session?.user.id;

	if (!userId) {
		return {
			analytics: emptySubscriptionAnalytics()
		};
	}

	const subscriptions = await db
		.select({
			serviceName: trackedSubscriptionTable.serviceName,
			cycle: trackedSubscriptionTable.cycle,
			amount: trackedSubscriptionTable.amount
		})
		.from(trackedSubscriptionTable)
		.where(eq(trackedSubscriptionTable.userId, userId))
		.orderBy(desc(trackedSubscriptionTable.createdAt));

	return {
		analytics: buildSubscriptionAnalytics(subscriptions)
	};
};
