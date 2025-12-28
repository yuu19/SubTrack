import { SUBSCRIPTION_STATUS } from '$lib/constant.js';
import { subscriptionTable } from '$lib/server/db/schema.js';
import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const load = async ({ locals: { db }, url }) => {
	const code = url.searchParams.get('code') || '';
	const subscriptions = await db.query.subscriptionTable.findMany({
		with: {
			subscriptionPlans: {
				with: {
					plan: true
				}
			},
			user: {
				columns: {
					name: true
				}
			}
		},
		where: (subscriptionTable, { like }) => like(subscriptionTable.code, `%${code}%`),
		orderBy: (t, { desc }) => desc(t.createdAt)
	});
	return {
		subscriptions
	};
};

export const actions = {
	updateSubscription: async ({ request, locals: { db } }) => {
		const data = await request.formData();
		const id = data.get('id') as unknown as number;
		console.log('🚀 ~ updateSubscription: ~ id:', id);

		if (!id) {
			return fail(400, { message: 'Invalid subscription ID' });
		}

		const subscription = await db.query.subscriptionTable.findFirst({
			where: eq(subscriptionTable.id, id)
		});

		if (!subscription) {
			return fail(404, { message: 'Subscription not found' });
		}

		let nextStatus: (typeof SUBSCRIPTION_STATUS)[number];

		switch (subscription.status) {
			case 'trialing':
				nextStatus = 'active';
				break;
			case 'active':
				nextStatus = 'canceled';
				break;
			default:
				return fail(400, { message: 'Invalid status transition' });
		}

		try {
			await db
				.update(subscriptionTable)
				.set({ status: nextStatus })
				.where(eq(subscriptionTable.id, id));

			return {
				message: `Subscription status updated to ${nextStatus}`
			};
		} catch {
			return fail(500, {
				message: 'Failed to update subscription status'
			});
		}
	}
};
