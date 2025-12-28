import type { PageServerLoad } from './$types';
import { desc, eq } from 'drizzle-orm';
import { createAuth } from '$lib/auth';
import { trackedSubscriptionTable } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals, request }) => {
	const db = locals.db;
	if (!db) {
		return { subscriptions: [] };
	}

	const auth = createAuth(db);
	const session = await auth.api.getSession({ headers: request.headers });
	const userId = session?.user.id;

	const subscriptions =
		userId !== undefined
			? await db
					.select()
				.from(trackedSubscriptionTable)
				.where(eq(trackedSubscriptionTable.userId, userId))
				.orderBy(desc(trackedSubscriptionTable.createdAt))
			: [];

	return { subscriptions };
};
