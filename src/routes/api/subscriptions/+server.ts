import { createAuth } from '$lib/auth.js';
import { SHIPPING_FEE } from '$lib/constant.js';
import { cartTable, planTable, subscriptionPlanTable, subscriptionTable } from '$lib/server/db/schema';
import { error, text } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const POST = async ({ request, locals: { db } }) => {
	const { cartId }: { cartId: number } = await request.json();
	const auth = createAuth(db);
	const session = await auth.api.getSession({
		headers: request.headers
	});
	const userId = session?.user.id;
	if (!userId) error(401, 'unauthorized request');
	const cartItems = await db.query.cartItemTable.findMany({
		where: (cartItemTable, { eq }) => eq(cartItemTable.cartId, cartId),
		with: {
			plan: true
		}
	});
	const overCapacityItems = cartItems.filter((item) => item.quantity > item.plan.seatLimit);
	if (overCapacityItems.length > 0) {
		error(
			400,
			`Insufficient seats for plans: ${overCapacityItems.map((item) => item.plan.name).join(', ')}`
		);
	}
	const totalAmount =
		cartItems.reduce((total, item) => total + item.quantity * item.plan.price, 0) + SHIPPING_FEE;
	const newSubscription = await db
		.insert(subscriptionTable)
		.values({
			userId: userId,
			status: 'trialing',
			amount: totalAmount,
			addressId: null
		})
		.returning()
		.get();
	const subscriptionPlans = cartItems.map((item) => ({
		subscriptionId: newSubscription.id,
		planId: item.planId,
		quantity: item.quantity
	}));
	await db.batch([
		db.insert(subscriptionPlanTable).values(subscriptionPlans),
		...cartItems.map((item) =>
			db
				.update(planTable)
				.set({ seatLimit: item.plan.seatLimit - item.quantity })
				.where(eq(planTable.id, item.planId))
		),
		db.delete(cartTable).where(eq(cartTable.id, cartId))
	]);
	return text(newSubscription.code);
};
