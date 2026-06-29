import type { RequestHandler } from './$types';
import { createAuth } from '$lib/auth';
import { subscriptionCategoryTable } from '$lib/server/db/schema';
import {
	deleteOwnedCategory,
	listSubscriptionManagementItems
} from '$lib/server/subscription-management-items';
import { defaultSubscriptionColor, resolveSubscriptionColor } from '$lib/subscription-colors';
import { and, eq } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod/v4';

const categorySchema = z.object({
	name: z.string().trim().min(1).max(40),
	color: z.string().optional()
});

const parseId = (value: string) => {
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : null;
};

const getUserId = async (db: NonNullable<App.Locals['db']>, request: Request) => {
	const auth = createAuth(db);
	const session = await auth.api.getSession({ headers: request.headers });
	const userId = session?.user.id;
	if (!userId) error(401, 'unauthorized request');
	return userId;
};

export const PATCH: RequestHandler = async ({ request, params, locals: { db } }) => {
	const id = parseId(params.id);
	if (!id) error(400, 'invalid category id');
	const userId = await getUserId(db, request);
	const parsed = categorySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) error(400, 'invalid category');

	await db
		.update(subscriptionCategoryTable)
		.set({
			name: parsed.data.name,
			color: resolveSubscriptionColor(parsed.data.color, defaultSubscriptionColor)
		})
		.where(and(eq(subscriptionCategoryTable.id, id), eq(subscriptionCategoryTable.userId, userId)));

	return json(await listSubscriptionManagementItems(db, userId));
};

export const DELETE: RequestHandler = async ({ request, params, locals: { db } }) => {
	const id = parseId(params.id);
	if (!id) error(400, 'invalid category id');
	const userId = await getUserId(db, request);

	await deleteOwnedCategory(db, userId, id);

	return json(await listSubscriptionManagementItems(db, userId));
};
