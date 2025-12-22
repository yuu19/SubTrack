import { createAuth } from '$lib/auth.js';
import { THEMES } from '$lib/constant.js';
import { user } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod/v4';

const themeSchema = z.object({
	activeTheme: z.enum(THEMES)
});

export const POST = async ({ request, locals: { db } }) => {
	const auth = createAuth(db);
	const session = await auth.api.getSession({
		headers: request.headers
	});
	const userId = session?.user.id;
	if (!userId) error(401, 'unauthorized request');

	const body = await request.json().catch(() => null);
	const parsed = themeSchema.safeParse(body);
	if (!parsed.success) error(400, 'invalid theme');

	await db
		.update(user)
		.set({ activeTheme: parsed.data.activeTheme })
		.where(eq(user.id, userId));

	return json({ ok: true });
};
