import { createAuth } from '$lib/auth.js';
import { cartItemTable, cartTable } from '$lib/server/db/schema.js';
import { error, fail } from '@sveltejs/kit';
import { sql, and, eq } from 'drizzle-orm';

export const load = async ({ locals: { db }, params }) => {
	const { slug } = params;
	const plan = await db.query.planTable.findFirst({
		where: (plan, { eq }) => eq(plan.slug, slug)
	});
	if (!plan) {
		error(404);
	}
	return {
		plan
	};
};

export const actions = {
	addToSubscription: async ({ locals: { db }, request, params }) => {
		const { slug } = params;

		const auth = createAuth(db);
		const form = await request.formData();
		const quantity = form.get('quantity') as unknown as number;
		const session = await auth.api.getSession({
			headers: request.headers
		});
		if (!session) {
			return fail(401, {
				message: 'You need to log in first'
			});
		}

		const userId = session.user.id;
		const plan = await db.query.planTable.findFirst({
			where: (plan, { eq }) => eq(plan.slug, slug),
			columns: {
				id: true,
				price: true,
				name: true,
				seatLimit: true
			}
		});

		if (!plan) {
			throw error(404, 'Plan not found');
		}

		// First, check if user has an existing cart
		let cart = await db.query.cartTable.findFirst({
			where: (cart, { eq }) => eq(cart.userId, userId)
		});

		// If no cart exists, create one
		if (!cart) {
			cart = await db
				.insert(cartTable)
				.values({
					userId
				})
				.returning()
				.get();
		}

		// Check if the plan is already in the user's cart
		const existingCartItem = await db.query.cartItemTable.findFirst({
			where: (cartItem, { eq, and }) =>
				and(eq(cartItem.cartId, cart.id), eq(cartItem.planId, plan.id)),
			columns: {
				quantity: true
			}
		});

		const alreadyInCart = existingCartItem?.quantity || 0;
		const availableSeats = plan.seatLimit - alreadyInCart;
		const quantityToAdd = Math.min(quantity, availableSeats);

		if (quantityToAdd === 0) {
			return fail(400, {
				message: `Sorry ${plan.name} isn't available.`
			});
		}

		await db
			.insert(cartItemTable)
			.values({
				cartId: cart.id,
				planId: plan.id,
				priceAtTimeOfAddition: plan.price,
				quantity: quantityToAdd
			})
			.onConflictDoUpdate({
				target: [cartItemTable.cartId, cartItemTable.planId],
				set: {
					quantity: sql`${cartItemTable.quantity} + ${quantityToAdd}`,
					priceAtTimeOfAddition: plan.price
				}
			});

		const message =
			quantityToAdd < quantity
				? `Only ${quantityToAdd} of ${plan.name} could be added to your cart due to seat limitations.`
				: `${quantityToAdd} ${plan.name} added to cart.`;

		return {
			message
		};
	}
};
