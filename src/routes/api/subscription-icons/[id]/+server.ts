import { json, type RequestHandler } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { createAuth } from '$lib/auth';
import { listActiveEntitlementsForUser } from '$lib/server/entitlements';
import { getCurrentPlan } from '$lib/server/plan';
import { trackedSubscriptionTable } from '$lib/server/db/schema';
import {
	createSubscriptionIconImageKey,
	deleteSubscriptionIconImage,
	isOwnedSubscriptionIconImageKey,
	validateSubscriptionIconImageFile
} from '$lib/server/subscription-icon-images';

const fetchSubscriptions = async (db: NonNullable<App.Locals['db']>, userId: string) =>
	db
		.select()
		.from(trackedSubscriptionTable)
		.where(eq(trackedSubscriptionTable.userId, userId))
		.orderBy(desc(trackedSubscriptionTable.createdAt));

const resolveCurrentPlanForUser = async (db: NonNullable<App.Locals['db']>, userId: string) => {
	const billingSubscriptions = await db.query.subscription.findMany({
		where: (subscription, { eq }) => eq(subscription.referenceId, userId)
	});
	const entitlements = await listActiveEntitlementsForUser(db, userId);
	const { currentPlan } = getCurrentPlan(billingSubscriptions, entitlements);
	return currentPlan;
};

const getSessionUserId = async (
	db: NonNullable<App.Locals['db']>,
	request: Request,
	origin: string
) => {
	const auth = createAuth(db, { requestOrigin: origin });
	const session = await auth.api.getSession({ headers: request.headers });
	return session?.user.id;
};

const getOwnedSubscription = async (
	db: NonNullable<App.Locals['db']>,
	userId: string,
	subscriptionId: number
) =>
	db.query.trackedSubscriptionTable.findFirst({
		where: (trackedSubscription, { and, eq }) =>
			and(eq(trackedSubscription.id, subscriptionId), eq(trackedSubscription.userId, userId))
	});

export const GET: RequestHandler = async ({ locals, params, request, url }) => {
	const subscriptionId = Number(params.id);
	if (!Number.isFinite(subscriptionId)) {
		return new Response('Invalid subscription id', { status: 400 });
	}

	const db = locals.db;
	const bucket = locals.bucket;
	if (!db || !bucket) {
		return new Response('Storage is not available', { status: 500 });
	}

	const userId = await getSessionUserId(db, request, url.origin);
	if (!userId) {
		return new Response('Unauthorized', { status: 401 });
	}

	const subscription = await getOwnedSubscription(db, userId, subscriptionId);
	if (
		!subscription ||
		subscription.iconType !== 'image' ||
		!isOwnedSubscriptionIconImageKey(subscription.iconValue, userId, subscriptionId)
	) {
		return new Response('Not found', { status: 404 });
	}

	const object = await bucket.get(subscription.iconValue);
	if (!object) {
		return new Response('Not found', { status: 404 });
	}

	const headers = new Headers({
		'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
		'Cache-Control': 'private, max-age=3600'
	});
	if (object.httpEtag) {
		headers.set('ETag', object.httpEtag);
	}

	return new Response(object.body, {
		headers
	});
};

export const POST: RequestHandler = async ({ locals, params, request, url }) => {
	const subscriptionId = Number(params.id);
	if (!Number.isFinite(subscriptionId)) {
		return json({ error: 'Invalid subscription id' }, { status: 400 });
	}

	const db = locals.db;
	const bucket = locals.bucket;
	if (!db || !bucket) {
		return json({ error: 'Storage is not available' }, { status: 500 });
	}

	const userId = await getSessionUserId(db, request, url.origin);
	if (!userId) {
		return json({ error: 'ログインしてください。' }, { status: 401 });
	}

	const currentPlan = await resolveCurrentPlanForUser(db, userId);
	if (!currentPlan.isPremium) {
		return json({ error: '画像アップロードはPremiumで利用できます。' }, { status: 403 });
	}

	const subscription = await getOwnedSubscription(db, userId, subscriptionId);
	if (!subscription) {
		return json({ error: 'Subscription not found' }, { status: 404 });
	}

	const formData = await request.formData();
	const validation = await validateSubscriptionIconImageFile(formData.get('image'));
	if (!validation.ok) {
		return json({ error: validation.message }, { status: validation.status });
	}

	const oldImageKey = subscription.iconType === 'image' ? subscription.iconValue : null;
	const newImageKey = createSubscriptionIconImageKey(
		userId,
		subscriptionId,
		validation.contentType
	);

	try {
		await bucket.put(newImageKey, validation.bytes, {
			httpMetadata: {
				contentType: validation.contentType,
				cacheControl: 'private, max-age=3600'
			}
		});

		await db
			.update(trackedSubscriptionTable)
			.set({
				iconType: 'image',
				iconValue: newImageKey
			})
			.where(
				and(
					eq(trackedSubscriptionTable.id, subscriptionId),
					eq(trackedSubscriptionTable.userId, userId)
				)
			);

		if (oldImageKey && oldImageKey !== newImageKey) {
			await deleteSubscriptionIconImage(bucket, oldImageKey);
		}

		const subscriptions = await fetchSubscriptions(db, userId);
		return json({ iconType: 'image', iconValue: newImageKey, subscriptions });
	} catch (error) {
		await deleteSubscriptionIconImage(bucket, newImageKey);
		console.error('Failed to upload subscription icon image', error);
		return json({ error: 'Failed to upload image.' }, { status: 500 });
	}
};
