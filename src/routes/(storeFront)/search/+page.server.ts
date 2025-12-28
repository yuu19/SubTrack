import { getPlans } from '$lib/server/queries.js';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';

export const load = async ({ locals: { db }, url, platform }) => {
	const kv = platform?.env.kv;
	const dbForQueries = db as DrizzleD1Database<typeof schema>;
	const term = url.searchParams.get('term') || '';
	const planGroupId = url.searchParams.get('planGroupId') as unknown as number;
	const billingIntervalsParam = url.searchParams.get('billingIntervals');
	let billingIntervals: string[] = [];

	if (billingIntervalsParam) {
		try {
			billingIntervals = JSON.parse(billingIntervalsParam) as string[];
		} catch (error) {
			console.error('Failed to parse billingIntervals:', error);
		}
	}

	const validBillingIntervals = billingIntervals.filter(
		(billingInterval) => billingInterval.trim() !== ''
	);

	// If KV unavailable, skip caching
	if (!kv) {
		const { plans, planGroups } = await getPlans({
			term,
			db: dbForQueries,
			planGroupId,
			billingIntervals: validBillingIntervals
		});
		return { plans, planGroups };
	}

	// Generate a unique cache key based on the search parameters
	const cacheKey = `search:${term}:${planGroupId ?? 'none'}:${validBillingIntervals.sort().join(',')}`;

	// Try to get the cached data
	const cachedData = await kv.get(cacheKey);
	if (cachedData) {
		return JSON.parse(cachedData);
	}

	// If not cached, fetch the data and cache it
	const { plans, planGroups } = await getPlans({
		term,
		db: dbForQueries,
		planGroupId,
		billingIntervals: validBillingIntervals
	});

	// Cache the result
	await kv.put(cacheKey, JSON.stringify({ plans, planGroups }), { expirationTtl: 3600 }); // Cache for 1 hour

	// Return the fetched data
	return {
		plans,
		planGroups
	};
};
