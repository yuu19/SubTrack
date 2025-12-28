import { createAuth } from '$lib/auth';
import { pushSubscriptionTable } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';

type PushSubscriptionPayload = {
	endpoint?: string;
	expirationTime?: number | null;
	keys?: {
		p256dh?: string;
		auth?: string;
	};
};

const parsePayload = (body: unknown): PushSubscriptionPayload | null => {
	if (!body || typeof body !== 'object') return null;
	return body as PushSubscriptionPayload;
};

export const POST = async ({ request, locals: { db } }) => {
	const auth = createAuth(db);
	const session = await auth.api.getSession({ headers: request.headers });
	const userId = session?.user.id;
	if (!userId) error(401, 'unauthorized request');

	const payload = parsePayload(await request.json().catch(() => null));
	const endpoint = payload?.endpoint;
	const p256dh = payload?.keys?.p256dh;
	const authKey = payload?.keys?.auth;

	if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof authKey !== 'string') {
		error(400, 'invalid subscription payload');
	}

	const expirationTime =
		typeof payload.expirationTime === 'number' ? Math.trunc(payload.expirationTime) : null;

	const existing = await db
		.select({ id: pushSubscriptionTable.id })
		.from(pushSubscriptionTable)
		.where(and(eq(pushSubscriptionTable.userId, userId), eq(pushSubscriptionTable.endpoint, endpoint)))
		.limit(1);

	if (existing.length > 0) {
		await db
			.update(pushSubscriptionTable)
			.set({
				p256dh,
				auth: authKey,
				expirationTime,
				userAgent: request.headers.get('user-agent') ?? null
			})
			.where(eq(pushSubscriptionTable.id, existing[0].id));
	} else {
		await db.insert(pushSubscriptionTable).values({
			userId,
			endpoint,
			p256dh,
			auth: authKey,
			expirationTime,
			userAgent: request.headers.get('user-agent') ?? null
		});
	}

	return json({ ok: true });
};

export const DELETE = async ({ request, locals: { db } }) => {
	const auth = createAuth(db);
	const session = await auth.api.getSession({ headers: request.headers });
	const userId = session?.user.id;
	if (!userId) error(401, 'unauthorized request');

	const payload = parsePayload(await request.json().catch(() => null));
	const endpoint = payload?.endpoint;
	if (typeof endpoint !== 'string') error(400, 'invalid subscription payload');

	await db
		.delete(pushSubscriptionTable)
		.where(and(eq(pushSubscriptionTable.userId, userId), eq(pushSubscriptionTable.endpoint, endpoint)));

	return json({ ok: true });
};
