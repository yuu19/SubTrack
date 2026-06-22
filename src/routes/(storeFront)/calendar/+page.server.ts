import type { PageServerLoad } from './$types';
import { and, desc, eq } from 'drizzle-orm';
import { createAuth } from '$lib/auth';
import { trackedSubscriptionTable } from '$lib/server/db/schema';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, request }) => {
	const db = locals.db;
	if (!db) {
		return { subscriptions: [] };
	}

	const auth = createAuth(db);
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) {
		redirect(303, '/');
	}
	const userId = session.user.id;

	const subscriptions =
		userId !== undefined
			? await db
					.select()
					.from(trackedSubscriptionTable)
					.where(
						and(
							eq(trackedSubscriptionTable.userId, userId),
							eq(trackedSubscriptionTable.status, 'active')
						)
					)
					.orderBy(desc(trackedSubscriptionTable.createdAt))
			: [];

	return { subscriptions };
};
