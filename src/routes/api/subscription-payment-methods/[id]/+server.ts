import type { RequestHandler } from './$types';
import { createAuth } from '$lib/auth';
import { PAYMENT_METHOD_TYPES, type PaymentMethodType } from '$lib/constant';
import { subscriptionPaymentMethodTable } from '$lib/server/db/schema';
import {
	deleteOwnedPaymentMethod,
	listSubscriptionManagementItems,
	resolvePaymentMethodType
} from '$lib/server/subscription-management-items';
import { and, eq } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod/v4';

const paymentMethodSchema = z.object({
	name: z.string().trim().min(1).max(40),
	type: z.enum(PAYMENT_METHOD_TYPES).optional()
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
	if (!id) error(400, 'invalid payment method id');
	const userId = await getUserId(db, request);
	const parsed = paymentMethodSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) error(400, 'invalid payment method');

	await db
		.update(subscriptionPaymentMethodTable)
		.set({
			name: parsed.data.name,
			type: resolvePaymentMethodType(parsed.data.type as PaymentMethodType | undefined)
		})
		.where(
			and(
				eq(subscriptionPaymentMethodTable.id, id),
				eq(subscriptionPaymentMethodTable.userId, userId)
			)
		);

	return json(await listSubscriptionManagementItems(db, userId));
};

export const DELETE: RequestHandler = async ({ request, params, locals: { db } }) => {
	const id = parseId(params.id);
	if (!id) error(400, 'invalid payment method id');
	const userId = await getUserId(db, request);

	await deleteOwnedPaymentMethod(db, userId, id);

	return json(await listSubscriptionManagementItems(db, userId));
};
