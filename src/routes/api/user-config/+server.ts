import { createAuth } from '$lib/auth.js';
import { THEMES } from '$lib/constant.js';
import { user } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod/v4';

const configSchema = z
	.object({
		activeTheme: z.enum(THEMES).optional(),
		defaultNotifyDaysBefore: z.number().int().min(0).max(365).optional()
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: 'empty payload'
	});

export const POST = async ({ request, locals: { db } }) => {
	const auth = createAuth(db);
	const session = await auth.api.getSession({
		headers: request.headers
	});
	const userId = session?.user.id;
	if (!userId) error(401, 'unauthorized request');

	const body = await request.json().catch(() => null);
	const parsed = configSchema.safeParse(body);
	if (!parsed.success) error(400, 'invalid config');

	const updates: { activeTheme?: string; defaultNotifyDaysBefore?: number } = {};
	if (parsed.data.activeTheme) {
		updates.activeTheme = parsed.data.activeTheme;
	}
	if (typeof parsed.data.defaultNotifyDaysBefore === 'number') {
		updates.defaultNotifyDaysBefore = parsed.data.defaultNotifyDaysBefore;
	}
	if (Object.keys(updates).length === 0) {
		error(400, 'invalid config');
	}

	await db
		.update(user)
		.set(updates)
		.where(eq(user.id, userId));

	return json({ ok: true });
};
