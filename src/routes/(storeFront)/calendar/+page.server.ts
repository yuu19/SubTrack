import type { PageServerLoad } from './$types';
import { and, desc, eq } from 'drizzle-orm';
import { createAuth } from '$lib/auth';
import { trackedSubscriptionTable } from '$lib/server/db/schema';
import {
	listSubscriptionManagementItems,
	resolveCurrentPlanForUser
} from '$lib/server/subscription-management-items';
import { DEFAULT_LOCALE } from '$lib/constant';
import { getLocalePrefix, localizePathname } from '$lib/locale-routing';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, request, url }) => {
	const db = locals.db;
	if (!db) {
		return { subscriptions: [], categories: [], paymentMethods: [], currentPlan: null };
	}

	const auth = createAuth(db);
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) {
		redirect(303, localizePathname('/', getLocalePrefix(url.pathname) ?? DEFAULT_LOCALE));
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
	const { categories, paymentMethods } = await listSubscriptionManagementItems(db, userId);
	const currentPlan = await resolveCurrentPlanForUser(db, userId);

	return { subscriptions, categories, paymentMethods, currentPlan };
};
