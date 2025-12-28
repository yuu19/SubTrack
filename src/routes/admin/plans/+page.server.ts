import { planTable } from '$lib/server/db/schema.js';
import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const load = async ({ locals: { db }, url }) => {
	const term = url.searchParams.get('term') || '';
	const plans = await db.query.planTable.findMany({
		with: {
			planGroup: true
		},
		orderBy: (plan, { desc }) => desc(plan.createdAt),
		where: (t, { like, or }) => or(like(t.name, `%${term}%`), like(t.description, `%${term}%`))
	});

	return {
		plans
	};
};

export const actions = {
	deletePlan: async ({ locals: { db, bucket }, request }) => {
		const data = await request.formData();

		const id = data.get('id') as unknown as number;
		try {
			// Your deletion logic here
			const res = await db.delete(planTable).where(eq(planTable.id, id)).returning().get();
			if (!res) {
				return fail(400, {
					message: 'Failed to delete plan. Please try again.'
				});
			}
			const keys = res.images.map((image) => {
				return image.key;
			});
			await bucket.delete(keys);
			// Return a success message
			return {
				message: 'Plan successfully deleted!'
			};
		} catch {
			// Return an error message
			return fail(400, {
				message: 'Failed to delete plan. Please try again.'
			});
		}
	}
};
