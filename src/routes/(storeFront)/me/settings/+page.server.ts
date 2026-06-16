import type { PageServerLoad } from './$types';
import { listActiveEntitlementsForUser } from '$lib/server/entitlements';
import { getCurrentPlan } from '$lib/server/plan';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { db } = locals;
	const vapidPublicKey = process.env.VAPID_PUBLIC_KEY ?? '';
	if (!db) {
		const { currentPlan } = getCurrentPlan([]);
		return { subscription: null, currentPlan, vapidPublicKey, hasPushSubscription: false };
	}

	const { user } = await parent();
	if (!user) {
		const { currentPlan } = getCurrentPlan([]);
		return { subscription: null, currentPlan, vapidPublicKey, hasPushSubscription: false };
	}

	const subscriptions = await db.query.subscription.findMany({
		where: (subscription, { eq }) => eq(subscription.referenceId, user.id)
	});
	const entitlements = await listActiveEntitlementsForUser(db, user.id);
	const hasPushSubscription = Boolean(
		await db.query.pushSubscriptionTable.findFirst({
			columns: {
				id: true
			},
			where: (pushSubscription, { eq }) => eq(pushSubscription.userId, user.id)
		})
	);

	const { subscription, currentPlan } = getCurrentPlan(subscriptions, entitlements);

	return { subscription, currentPlan, vapidPublicKey, hasPushSubscription };
};
