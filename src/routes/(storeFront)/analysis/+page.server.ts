import type { PageServerLoad } from './$types';
import { createAuth } from '$lib/auth';
import {
	buildSubscriptionAnalytics,
	emptySubscriptionAnalytics
} from '$lib/server/subscription-analytics';
import { resolveSubscriptionColor } from '$lib/subscription-colors';

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

	const subscriptions = await db.query.trackedSubscriptionTable.findMany({
		columns: {
			id: true,
			serviceName: true,
			color: true,
			iconType: true,
			iconValue: true,
			cycle: true,
			amount: true
		},
		where: (trackedSubscription, { and, eq }) =>
			and(eq(trackedSubscription.userId, userId), eq(trackedSubscription.status, 'active')),
		orderBy: (trackedSubscription, { desc }) => desc(trackedSubscription.createdAt)
	});

	return {
		analytics: buildSubscriptionAnalytics(
			subscriptions.map((subscription) => ({
				...subscription,
				color: resolveSubscriptionColor(subscription.color)
			}))
		)
	};
};
