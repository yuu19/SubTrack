import { createAuth } from '$lib/auth';
import { pushSubscriptionTable, user } from '$lib/server/db/schema';
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
	const keys = payload?.keys;
	if (
		!payload ||
		typeof payload.endpoint !== 'string' ||
		!keys ||
		typeof keys.p256dh !== 'string' ||
		typeof keys.auth !== 'string'
	) {
		error(400, 'invalid subscription payload');
	}
	const endpoint = payload.endpoint;
	const p256dh = keys.p256dh;
	const authKey = keys.auth;

	const expirationTime =
		typeof payload.expirationTime === 'number'
			? new Date(Math.trunc(payload.expirationTime))
			: null;

	const existing = await db.query.pushSubscriptionTable.findFirst({
		columns: {
			id: true
		},
		where: (pushSubscription, { and, eq }) =>
			and(eq(pushSubscription.userId, userId), eq(pushSubscription.endpoint, endpoint))
	});

	if (existing) {
		await db
			.update(pushSubscriptionTable)
			.set({
				p256dh,
				auth: authKey,
				expirationTime,
				userAgent: request.headers.get('user-agent') ?? null
			})
			.where(eq(pushSubscriptionTable.id, existing.id));
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

	await db.update(user).set({ notificationMethod: 'both' }).where(eq(user.id, userId));

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
		.where(
			and(eq(pushSubscriptionTable.userId, userId), eq(pushSubscriptionTable.endpoint, endpoint))
		);

	await db.update(user).set({ notificationMethod: 'email' }).where(eq(user.id, userId));

	return json({ ok: true });
};
