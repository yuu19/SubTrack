import type { RequestHandler } from './$types';
import { createAuth } from '$lib/auth';
import { PAYMENT_METHOD_TYPES, type PaymentMethodType } from '$lib/constant';
import { subscriptionPaymentMethodTable } from '$lib/server/db/schema';
import {
	hasReachedFreePaymentMethodLimit,
	listSubscriptionManagementItems,
	resolveCurrentPlanForUser,
	resolvePaymentMethodType
} from '$lib/server/subscription-management-items';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod/v4';

const paymentMethodSchema = z.object({
	name: z.string().trim().min(1).max(40),
	type: z.enum(PAYMENT_METHOD_TYPES).optional()
});

export const POST: RequestHandler = async ({ request, locals: { db } }) => {
	const auth = createAuth(db);
	const session = await auth.api.getSession({ headers: request.headers });
	const userId = session?.user.id;
	if (!userId) error(401, 'unauthorized request');

	const parsed = paymentMethodSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) error(400, 'invalid payment method');

	const currentPlan = await resolveCurrentPlanForUser(db, userId);
	if (!currentPlan.isPremium && (await hasReachedFreePaymentMethodLimit(db, userId))) {
		return json({ error: 'payment_method_limit_reached' }, { status: 403 });
	}

	await db.insert(subscriptionPaymentMethodTable).values({
		userId,
		name: parsed.data.name,
		type: resolvePaymentMethodType(parsed.data.type as PaymentMethodType | undefined)
	});

	return json(await listSubscriptionManagementItems(db, userId));
};
