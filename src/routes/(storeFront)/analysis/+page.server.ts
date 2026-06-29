import type { PageServerLoad } from './$types';
import { createAuth } from '$lib/auth';
import {
	buildSubscriptionAnalytics,
	emptySubscriptionAnalytics
} from '$lib/server/subscription-analytics';
import { resolveSubscriptionColor } from '$lib/subscription-colors';
import { listSubscriptionManagementItems } from '$lib/server/subscription-management-items';

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
			categoryId: true,
			paymentMethodId: true,
			cycle: true,
			amount: true,
			currency: true
		},
		where: (trackedSubscription, { and, eq }) =>
			and(eq(trackedSubscription.userId, userId), eq(trackedSubscription.status, 'active')),
		orderBy: (trackedSubscription, { desc }) => desc(trackedSubscription.createdAt)
	});
	const { categories, paymentMethods } = await listSubscriptionManagementItems(db, userId);
	const categoryById = new Map(categories.map((category) => [category.id, category]));
	const paymentMethodById = new Map(
		paymentMethods.map((paymentMethod) => [paymentMethod.id, paymentMethod])
	);

	return {
		analytics: buildSubscriptionAnalytics(
			subscriptions.map((subscription) => {
				const category =
					subscription.categoryId !== null ? categoryById.get(subscription.categoryId) : null;
				const paymentMethod =
					subscription.paymentMethodId !== null
						? paymentMethodById.get(subscription.paymentMethodId)
						: null;
				return {
					...subscription,
					color: resolveSubscriptionColor(subscription.color),
					categoryName: category?.name ?? null,
					categoryColor: category ? resolveSubscriptionColor(category.color) : null,
					paymentMethodName: paymentMethod?.name ?? null
				};
			})
		)
	};
};
