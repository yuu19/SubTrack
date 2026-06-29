import type { RequestHandler } from './$types';
import { createAuth } from '$lib/auth';
import { subscriptionCategoryTable } from '$lib/server/db/schema';
import {
	hasReachedFreeCategoryLimit,
	listSubscriptionManagementItems,
	resolveCurrentPlanForUser
} from '$lib/server/subscription-management-items';
import { defaultSubscriptionColor, resolveSubscriptionColor } from '$lib/subscription-colors';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod/v4';

const categorySchema = z.object({
	name: z.string().trim().min(1).max(40),
	color: z.string().optional()
});

export const POST: RequestHandler = async ({ request, locals: { db } }) => {
	const auth = createAuth(db);
	const session = await auth.api.getSession({ headers: request.headers });
	const userId = session?.user.id;
	if (!userId) error(401, 'unauthorized request');

	const parsed = categorySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) error(400, 'invalid category');

	const currentPlan = await resolveCurrentPlanForUser(db, userId);
	if (!currentPlan.isPremium && (await hasReachedFreeCategoryLimit(db, userId))) {
		return json({ error: 'category_limit_reached' }, { status: 403 });
	}

	await db.insert(subscriptionCategoryTable).values({
		userId,
		name: parsed.data.name,
		color: resolveSubscriptionColor(parsed.data.color, defaultSubscriptionColor)
	});

	return json(await listSubscriptionManagementItems(db, userId));
};
