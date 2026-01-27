import type { PageServerLoad } from './$types';
import { getCurrentPlan } from '$lib/server/plan';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { db } = locals;
	if (!db) {
		const { currentPlan } = getCurrentPlan([]);
		return { subscription: null, currentPlan };
	}

	const { user } = await parent();
	if (!user) {
		const { currentPlan } = getCurrentPlan([]);
		return { subscription: null, currentPlan };
	}

	const subscriptions = await db.query.subscription.findMany({
		where: (subscription, { eq }) => eq(subscription.referenceId, user.id)
	});

	const { subscription, currentPlan } = getCurrentPlan(subscriptions);

	return { subscription, currentPlan };
};
