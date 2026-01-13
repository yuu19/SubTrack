import { createAuth } from '$lib/auth.js';
import { NOTIFICATION_METHODS, THEMES } from '$lib/constant.js';
import { user } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod/v4';

const configSchema = z
	.object({
		activeTheme: z.enum(THEMES).optional(),
		defaultNotifyDaysBefore: z.number().int().min(0).max(365).optional(),
		notificationMethod: z.enum(NOTIFICATION_METHODS).optional()
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

	const updates: {
		activeTheme?: string;
		defaultNotifyDaysBefore?: number;
		notificationMethod?: string;
	} = {};
	if (parsed.data.activeTheme) {
		updates.activeTheme = parsed.data.activeTheme;
	}
	if (typeof parsed.data.defaultNotifyDaysBefore === 'number') {
		updates.defaultNotifyDaysBefore = parsed.data.defaultNotifyDaysBefore;
	}
	if (parsed.data.notificationMethod) {
		updates.notificationMethod = parsed.data.notificationMethod;
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
