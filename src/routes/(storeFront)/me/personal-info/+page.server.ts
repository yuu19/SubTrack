import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { db } = locals;
	if (!db) {
		return { subscription: null };
	}

	const { user } = await parent();
	if (!user) {
		return { subscription: null };
	}

	const subscription = await db.query.subscription.findFirst({
		where: (subscription, { eq }) => eq(subscription.referenceId, user.id)
	});

	return { subscription };
};
