import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './db/schema';

export async function getPlans({
	db,
	term,
	planGroupId,
	billingIntervals
}: {
	db: DrizzleD1Database<typeof schema>;
	term: string;
	planGroupId?: number;
	billingIntervals?: string[];
}) {
	// Normalize and defensively bound the search term to avoid pathological LIKE patterns
	const normalizedTerm = (term ?? '').trim().slice(0, 100);
	const likeTerm = normalizedTerm ? `%${normalizedTerm}%` : undefined;

	try {
		const plans = await db.query.planTable.findMany({
			with: {
				planGroup: true
			},
			orderBy: (plan, { desc }) => desc(plan.createdAt),
			where: (t, { like, or, and, eq, inArray }) =>
				and(
					likeTerm ? or(like(t.name, likeTerm), like(t.description, likeTerm)) : undefined,
					planGroupId ? eq(t.planGroupId, planGroupId) : undefined,
					billingIntervals && billingIntervals.length > 0
						? inArray(t.billingInterval, billingIntervals)
						: undefined
				)
		});
		const planGroups = Array.from(
			new Map(plans.map((item) => [item.planGroup.id, item.planGroup])).values()
		);
		return { plans, planGroups };
	} catch (error) {
		console.error('getPlans failed', { term: normalizedTerm, error });
		return { plans: [], planGroups: [] };
	}
}

export async function getUsers(db: DrizzleD1Database<typeof schema>) {
	const users = await db.query.user.findMany({
		orderBy: (t, { desc }) => desc(t.createdAt)
	});
	return users;
}
