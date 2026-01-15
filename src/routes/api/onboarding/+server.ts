import { createAuth } from '$lib/auth.js';
import { user } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const POST = async ({ request, locals: { db } }) => {
	const auth = createAuth(db);
	const session = await auth.api.getSession({
		headers: request.headers
	});
	const userId = session?.user.id;
	if (!userId) error(401, 'unauthorized request');

	const body = await request.json().catch(() => ({}));
	const completed = body?.completed ?? true;
	if (completed !== true) error(400, 'invalid payload');

	await db.update(user).set({ onboardingCompleted: true }).where(eq(user.id, userId));

	return json({ ok: true });
};
