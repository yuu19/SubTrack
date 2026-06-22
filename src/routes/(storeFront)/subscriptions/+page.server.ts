import type { Actions, PageServerLoad } from './$types';
import { fail, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { subscriptionSchema } from '$lib/formSchema';
import { pushSubscriptionTable, trackedSubscriptionTable } from '$lib/server/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { createAuth } from '$lib/auth';
import { listActiveEntitlementsForUser } from '$lib/server/entitlements';
import { computeNextBilling } from '$lib/server/subscriptions';
import { getCurrentPlan } from '$lib/server/plan';
import { defaultSubscriptionColor } from '$lib/subscription-colors';
import { CANCELLATION_METHODS, type CancellationMethod } from '$lib/constant';

const fetchSubscriptions = async (db: NonNullable<App.Locals['db']>, userId: string) => {
	return db
		.select()
		.from(trackedSubscriptionTable)
		.where(eq(trackedSubscriptionTable.userId, userId))
		.orderBy(desc(trackedSubscriptionTable.createdAt));
};

const normalizeOptionalText = (value: string | null | undefined) => {
	const trimmed = value?.trim() ?? '';
	return trimmed.length > 0 ? trimmed : null;
};

const normalizeCancellationMethod = (value: string | null | undefined) =>
	CANCELLATION_METHODS.includes(value as CancellationMethod) ? (value as CancellationMethod) : null;

const buildCancellationValues = (data: {
	cancellationUrl?: string | null;
	cancellationMethod?: string | null;
	cancellationMemo?: string | null;
	cancellationDeadlineMemo?: string | null;
}) => ({
	cancellationUrl: normalizeOptionalText(data.cancellationUrl),
	cancellationMethod: normalizeCancellationMethod(data.cancellationMethod),
	cancellationMemo: normalizeOptionalText(data.cancellationMemo),
	cancellationDeadlineMemo: normalizeOptionalText(data.cancellationDeadlineMemo)
});

const buildTemplateValues = (data: {
	serviceTemplateId?: string | null;
	planName?: string | null;
	priceEditedByUser?: boolean | null;
}) => ({
	serviceTemplateId: normalizeOptionalText(data.serviceTemplateId),
	planName: normalizeOptionalText(data.planName),
	priceEditedByUser: Boolean(data.priceEditedByUser)
});

const resolveCurrentPlanForUser = async (db: NonNullable<App.Locals['db']>, userId: string) => {
	const billingSubscriptions = await db.query.subscription.findMany({
		where: (subscription, { eq }) => eq(subscription.referenceId, userId)
	});
	const entitlements = await listActiveEntitlementsForUser(db, userId);
	const { currentPlan } = getCurrentPlan(billingSubscriptions, entitlements);
	return currentPlan;
};

const hasReachedFreeActiveLimit = async (
	db: NonNullable<App.Locals['db']>,
	userId: string,
	excludeId?: number
) => {
	const activeSubscriptions = await db.query.trackedSubscriptionTable.findMany({
		columns: {
			id: true
		},
		where: (trackedSubscription, { and, eq, ne }) =>
			excludeId === undefined
				? and(
						eq(trackedSubscription.userId, userId),
						eq(trackedSubscription.status, 'active'),
						eq(trackedSubscription.isSample, false)
					)
				: and(
						eq(trackedSubscription.userId, userId),
						eq(trackedSubscription.status, 'active'),
						eq(trackedSubscription.isSample, false),
						ne(trackedSubscription.id, excludeId)
					),
		limit: 5
	});

	return activeSubscriptions.length >= 5;
};

const resolveDefaultNotifyDaysBefore = async (
	db: NonNullable<App.Locals['db']>,
	userId?: string
) => {
	if (!userId) return 3;
	const userRecord = await db.query.user.findFirst({
		where: (user, { eq }) => eq(user.id, userId),
		columns: {
			defaultNotifyDaysBefore: true
		}
	});
	return userRecord?.defaultNotifyDaysBefore ?? 3;
};

export const load: PageServerLoad = async ({ locals, request }) => {
	const form = await superValidate(zod4(subscriptionSchema));
	if (!form.data.select) {
		form.data.select = 'monthly';
	}
	form.data.color = defaultSubscriptionColor;
	form.data.notifyDaysBefore = 3;

	const vapidPublicKey = process.env.VAPID_PUBLIC_KEY ?? '';
	const { currentPlan: freePlan } = getCurrentPlan([]);

	const db = locals.db;
	if (!db) {
		return {
			form,
			subscriptions: [],
			vapidPublicKey,
			hasPushSubscription: false,
			currentPlan: freePlan
		};
	}

	const auth = createAuth(db);
	const session = await auth.api.getSession({ headers: request.headers });
	const userId = session?.user.id;
	form.data.notifyDaysBefore = await resolveDefaultNotifyDaysBefore(db, userId);
	const billingSubscriptions =
		userId !== undefined
			? await db.query.subscription.findMany({
					where: (subscription, { eq }) => eq(subscription.referenceId, userId)
				})
			: [];
	const entitlements = userId !== undefined ? await listActiveEntitlementsForUser(db, userId) : [];
	const { currentPlan } = getCurrentPlan(billingSubscriptions, entitlements);

	const subscriptions =
		userId !== undefined
			? await db
					.select()
					.from(trackedSubscriptionTable)
					.where(eq(trackedSubscriptionTable.userId, userId))
					.orderBy(desc(trackedSubscriptionTable.createdAt))
			: [];

	// refresh nextBillingAt/daysUntilNextBilling each load
	for (const sub of subscriptions) {
		if (sub.status === 'canceled') continue;
		const computed = computeNextBilling(sub.firstPaymentDate, sub.cycle);
		if (
			computed.nextBillingAt !== sub.nextBillingAt ||
			computed.daysUntilNextBilling !== sub.daysUntilNextBilling
		) {
			await db
				.update(trackedSubscriptionTable)
				.set({
					nextBillingAt: computed.nextBillingAt,
					daysUntilNextBilling: computed.daysUntilNextBilling
				})
				.where(eq(trackedSubscriptionTable.id, sub.id));
			sub.nextBillingAt = computed.nextBillingAt;
			sub.daysUntilNextBilling = computed.daysUntilNextBilling;
		}
	}

	const hasPushSubscription =
		userId !== undefined
			? Boolean(
					await db.query.pushSubscriptionTable.findFirst({
						columns: {
							id: true
						},
						where: (pushSubscription, { eq }) => eq(pushSubscription.userId, userId)
					})
				)
			: false;

	return { form, subscriptions, vapidPublicKey, hasPushSubscription, currentPlan };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(subscriptionSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		const db = locals.db;
		if (!db) {
			return fail(500, { form, error: 'Database not available' });
		}

		const auth = createAuth(db);
		const session = await auth.api.getSession({ headers: request.headers });
		const userId = session?.user.id;

		if (!userId) {
			return fail(401, { form, error: 'ログインしてください。' });
		}

		try {
			const defaultNotifyDaysBefore = await resolveDefaultNotifyDaysBefore(db, userId);
			const currentPlan = await resolveCurrentPlanForUser(db, userId);

			if (!currentPlan.isPremium && (await hasReachedFreeActiveLimit(db, userId))) {
				return fail(403, {
					form,
					error: '無料プランはサブスクリプションを最大5件まで登録できます。'
				});
			}

			await db
				.delete(trackedSubscriptionTable)
				.where(
					and(
						eq(trackedSubscriptionTable.userId, userId),
						eq(trackedSubscriptionTable.isSample, true)
					)
				);

			const { nextBillingAt, daysUntilNextBilling } = computeNextBilling(
				form.data.datepicker,
				form.data.select
			);

			await db.insert(trackedSubscriptionTable).values({
				userId,
				serviceName: form.data.text,
				...buildTemplateValues(form.data),
				status: 'active',
				color: form.data.color,
				cycle: form.data.select,
				amount: form.data.number,
				firstPaymentDate: form.data.datepicker,
				nextBillingAt,
				daysUntilNextBilling,
				notifyDaysBefore: form.data.notifyDaysBefore ?? defaultNotifyDaysBefore,
				tags: form.data.tagsinput,
				...buildCancellationValues(form.data)
			});

			form.message = { type: 'success', text: 'Subscription saved.' };

			const subscriptions = await fetchSubscriptions(db, userId);

			return { form, subscriptions };
		} catch (error) {
			console.error('Failed to save subscription', error);
			return fail(500, { form, error: 'Failed to save subscription' });
		}
	},
	update: async ({ request, locals }) => {
		const formData = await request.formData();
		const form = await superValidate(formData, zod4(subscriptionSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		const id = Number(formData.get('id'));
		if (!Number.isFinite(id)) {
			return fail(400, { form, error: 'Invalid subscription id' });
		}

		const db = locals.db;
		if (!db) {
			return fail(500, { form, error: 'Database not available' });
		}

		const auth = createAuth(db);
		const session = await auth.api.getSession({ headers: request.headers });
		const userId = session?.user.id;

		if (!userId) {
			return fail(401, { form, error: 'ログインしてください。' });
		}

		try {
			const defaultNotifyDaysBefore = await resolveDefaultNotifyDaysBefore(db, userId);
			const { nextBillingAt, daysUntilNextBilling } = computeNextBilling(
				form.data.datepicker,
				form.data.select
			);

			await db
				.update(trackedSubscriptionTable)
				.set({
					serviceName: form.data.text,
					...buildTemplateValues(form.data),
					color: form.data.color,
					cycle: form.data.select,
					amount: form.data.number,
					firstPaymentDate: form.data.datepicker,
					nextBillingAt,
					daysUntilNextBilling,
					notifyDaysBefore: form.data.notifyDaysBefore ?? defaultNotifyDaysBefore,
					tags: form.data.tagsinput,
					...buildCancellationValues(form.data)
				})
				.where(
					and(eq(trackedSubscriptionTable.id, id), eq(trackedSubscriptionTable.userId, userId))
				);

			const subscriptions = await fetchSubscriptions(db, userId);
			return { form, subscriptions };
		} catch (error) {
			console.error('Failed to update subscription', error);
			return fail(500, { form, error: 'Failed to update subscription' });
		}
	},
	cancel: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = Number(formData.get('id'));
		if (!Number.isFinite(id)) {
			return fail(400, { error: 'Invalid subscription id' });
		}

		const db = locals.db;
		if (!db) {
			return fail(500, { error: 'Database not available' });
		}

		const auth = createAuth(db);
		const session = await auth.api.getSession({ headers: request.headers });
		const userId = session?.user.id;

		if (!userId) {
			return fail(401, { error: 'ログインしてください。' });
		}

		try {
			await db
				.update(trackedSubscriptionTable)
				.set({
					status: 'canceled',
					canceledAt: new Date()
				})
				.where(
					and(eq(trackedSubscriptionTable.id, id), eq(trackedSubscriptionTable.userId, userId))
				);

			const subscriptions = await fetchSubscriptions(db, userId);
			return { subscriptions };
		} catch (error) {
			console.error('Failed to cancel subscription', error);
			return fail(500, { error: 'Failed to cancel subscription' });
		}
	},
	reactivate: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = Number(formData.get('id'));
		if (!Number.isFinite(id)) {
			return fail(400, { error: 'Invalid subscription id' });
		}

		const db = locals.db;
		if (!db) {
			return fail(500, { error: 'Database not available' });
		}

		const auth = createAuth(db);
		const session = await auth.api.getSession({ headers: request.headers });
		const userId = session?.user.id;

		if (!userId) {
			return fail(401, { error: 'ログインしてください。' });
		}

		try {
			const currentPlan = await resolveCurrentPlanForUser(db, userId);
			if (!currentPlan.isPremium && (await hasReachedFreeActiveLimit(db, userId, id))) {
				return fail(403, {
					error: '無料プランは登録中のサブスクリプションを最大5件まで管理できます。'
				});
			}

			const subscription = await db.query.trackedSubscriptionTable.findFirst({
				where: (trackedSubscription, { and, eq }) =>
					and(eq(trackedSubscription.id, id), eq(trackedSubscription.userId, userId))
			});

			if (!subscription) {
				return fail(404, { error: 'Subscription not found' });
			}

			const { nextBillingAt, daysUntilNextBilling } = computeNextBilling(
				subscription.firstPaymentDate,
				subscription.cycle
			);

			await db
				.update(trackedSubscriptionTable)
				.set({
					status: 'active',
					canceledAt: null,
					nextBillingAt,
					daysUntilNextBilling,
					lastNotifiedAt: null
				})
				.where(
					and(eq(trackedSubscriptionTable.id, id), eq(trackedSubscriptionTable.userId, userId))
				);

			const subscriptions = await fetchSubscriptions(db, userId);
			return { subscriptions };
		} catch (error) {
			console.error('Failed to reactivate subscription', error);
			return fail(500, { error: 'Failed to reactivate subscription' });
		}
	},
	delete: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = Number(formData.get('id'));
		if (!Number.isFinite(id)) {
			return fail(400, { error: 'Invalid subscription id' });
		}

		const db = locals.db;
		if (!db) {
			return fail(500, { error: 'Database not available' });
		}

		const auth = createAuth(db);
		const session = await auth.api.getSession({ headers: request.headers });
		const userId = session?.user.id;

		if (!userId) {
			return fail(401, { error: 'ログインしてください。' });
		}

		try {
			await db
				.delete(trackedSubscriptionTable)
				.where(
					and(eq(trackedSubscriptionTable.id, id), eq(trackedSubscriptionTable.userId, userId))
				);

			const subscriptions = await fetchSubscriptions(db, userId);
			return { subscriptions };
		} catch (error) {
			console.error('Failed to delete subscription', error);
			return fail(500, { error: 'Failed to delete subscription' });
		}
	}
};
