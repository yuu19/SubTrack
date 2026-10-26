import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const headers = { 'cache-control': 'no-store' };
	try {
		await locals.db.get(sql`SELECT 1`);
		return json({ status: 'ok', commit: process.env.DEPLOYMENT_SHA ?? null }, { headers });
	} catch {
		return json({ status: 'unavailable' }, { status: 503, headers });
	}
};
