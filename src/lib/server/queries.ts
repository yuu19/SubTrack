import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './db/schema';

export async function getUsers(db: DrizzleD1Database<typeof schema>) {
	const users = await db.query.user.findMany({
		orderBy: (t, { desc }) => desc(t.createdAt)
	});
	return users;
}
