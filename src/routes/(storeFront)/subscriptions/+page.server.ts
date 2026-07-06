import type { Actions, PageServerLoad } from './$types';
import { fail, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { createSubscriptionSchema } from '$lib/formSchema';
import { resolveRequestLocale, subscriptionActionCopy } from '$lib/i18n-copy';
import { pushSubscriptionTable, trackedSubscriptionTable } from '$lib/server/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { createAuth } from '$lib/auth';
import { listActiveEntitlementsForUser } from '$lib/server/entitlements';
import { computeNextBilling } from '$lib/server/subscriptions';
import { getCurrentPlan } from '$lib/server/plan';
import {
	getOwnedCategoryId,
	getOwnedPaymentMethodId,
	listSubscriptionManagementItems,
	resolveCurrentPlanForUser
} from '$lib/server/subscription-management-items';
import { defaultSubscriptionColor, getFallbackSubscriptionColor } from '$lib/subscription-colors';
import {
	CANCELLATION_METHODS,
	DEFAULT_SUBSCRIPTION_CURRENCY,
	type CancellationMethod
} from '$lib/constant';
import { resolveTimeZone } from '$lib/time-zone';
import { deleteSubscriptionIconImage } from '$lib/server/subscription-icon-images';
import { serviceTemplates } from '$lib/service-templates';

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
	serviceUrl?: string | null;
	priceEditedByUser?: boolean | null;
}) => ({
	serviceTemplateId: normalizeOptionalText(data.serviceTemplateId),
	planName: normalizeOptionalText(data.planName),
	serviceUrl: normalizeOptionalText(data.serviceUrl),
	priceEditedByUser: Boolean(data.priceEditedByUser)
});

const resolveTemplateColor = (serviceTemplateId: string | null | undefined) => {
	const normalized = normalizeOptionalText(serviceTemplateId);
	return serviceTemplates.find((template) => template.id === normalized)?.color ?? null;
};

const resolveCreateSubscriptionColor = async (
	db: NonNullable<App.Locals['db']>,
	userId: string,
	serviceTemplateId: string | null | undefined
) => {
	const templateColor = resolveTemplateColor(serviceTemplateId);
	if (templateColor) return templateColor;

	const existingSubscriptions = await db.query.trackedSubscriptionTable.findMany({
		columns: {
			id: true
		},
		where: (trackedSubscription, { eq }) => eq(trackedSubscription.userId, userId)
	});

	return getFallbackSubscriptionColor(existingSubscriptions.length);
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
				? and(eq(trackedSubscription.userId, userId), eq(trackedSubscription.status, 'active'))
				: and(
						eq(trackedSubscription.userId, userId),
						eq(trackedSubscription.status, 'active'),
						ne(trackedSubscription.id, excludeId)
					),
		limit: 5
	});

	return activeSubscriptions.length >= 5;
};

const resolveUserNotificationConfig = async (
	db: NonNullable<App.Locals['db']>,
	userId?: string
) => {
	if (!userId) return { defaultNotifyDaysBefore: 3, timeZone: resolveTimeZone(null) };
	const userRecord = await db.query.user.findFirst({
		where: (user, { eq }) => eq(user.id, userId),
		columns: {
			defaultNotifyDaysBefore: true,
			timeZone: true
		}
	});
	return {
		defaultNotifyDaysBefore: userRecord?.defaultNotifyDaysBefore ?? 3,
		timeZone: resolveTimeZone(userRecord?.timeZone)
	};
};

export const load: PageServerLoad = async ({ locals, request, cookies }) => {
	const locale = resolveRequestLocale(request, cookies);
	const form = await superValidate(zod4(createSubscriptionSchema(locale)));
	if (!form.data.select) {
		form.data.select = 'monthly';
	}
	form.data.color = defaultSubscriptionColor;
	form.data.notifyDaysBefore = 3;
	form.data.currency = DEFAULT_SUBSCRIPTION_CURRENCY;
	form.data.categoryId = null;
	form.data.paymentMethodId = null;

	const vapidPublicKey = process.env.VAPID_PUBLIC_KEY ?? '';
	const { currentPlan: freePlan } = getCurrentPlan([]);

	const db = locals.db;
	if (!db) {
		return {
			form,
			subscriptions: [],
			categories: [],
			paymentMethods: [],
			vapidPublicKey,
			hasPushSubscription: false,
			currentPlan: freePlan
		};
	}

	const auth = createAuth(db);
	const session = await auth.api.getSession({ headers: request.headers });
	const userId = session?.user.id;
	const userNotificationConfig = await resolveUserNotificationConfig(db, userId);
	form.data.notifyDaysBefore = userNotificationConfig.defaultNotifyDaysBefore;
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
	const managementItems =
		userId !== undefined
			? await listSubscriptionManagementItems(db, userId)
			: { categories: [], paymentMethods: [] };

	// refresh nextBillingAt/daysUntilNextBilling each load
	for (const sub of subscriptions) {
		if (sub.status === 'canceled') continue;
		const computed = computeNextBilling(sub.firstPaymentDate, sub.cycle, {
			timeZone: userNotificationConfig.timeZone
		});
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

	return {
		form,
		subscriptions,
		categories: managementItems.categories,
		paymentMethods: managementItems.paymentMethods,
		vapidPublicKey,
		hasPushSubscription,
		currentPlan
	};
};

export const actions: Actions = {
	create: async ({ request, locals, cookies }) => {
		const locale = resolveRequestLocale(request, cookies);
		const copy = subscriptionActionCopy[locale];
		const form = await superValidate(request, zod4(createSubscriptionSchema(locale)));
		if (!form.valid) {
			return fail(400, { form });
		}

		const db = locals.db;
		if (!db) {
			return fail(500, { form, error: copy.databaseUnavailable });
		}

		const auth = createAuth(db);
		const session = await auth.api.getSession({ headers: request.headers });
		const userId = session?.user.id;

		if (!userId) {
			return fail(401, { form, error: copy.loginRequired });
		}

		try {
			if (form.data.iconType === 'image') {
				return fail(400, { form, error: copy.imageAfterCreate });
			}

			const { defaultNotifyDaysBefore, timeZone } = await resolveUserNotificationConfig(db, userId);
			const currentPlan = await resolveCurrentPlanForUser(db, userId);
			const categoryId = await getOwnedCategoryId(db, userId, form.data.categoryId);
			const paymentMethodId = await getOwnedPaymentMethodId(db, userId, form.data.paymentMethodId);

			if (!currentPlan.isPremium && (await hasReachedFreeActiveLimit(db, userId))) {
				return fail(403, {
					form,
					error: copy.freeLimitReached
				});
			}

			const { nextBillingAt, daysUntilNextBilling } = computeNextBilling(
				form.data.datepicker,
				form.data.select,
				{ timeZone }
			);
			const color = await resolveCreateSubscriptionColor(db, userId, form.data.serviceTemplateId);

			await db.insert(trackedSubscriptionTable).values({
				userId,
				categoryId,
				paymentMethodId,
				serviceName: form.data.text,
				...buildTemplateValues(form.data),
				status: 'active',
				color,
				iconType: form.data.iconType,
				iconValue: form.data.iconValue,
				cycle: form.data.select,
				amount: form.data.number,
				currency: form.data.currency,
				firstPaymentDate: form.data.datepicker,
				nextBillingAt,
				daysUntilNextBilling,
				notifyDaysBefore: form.data.notifyDaysBefore ?? defaultNotifyDaysBefore,
				tags: [],
				...buildCancellationValues(form.data)
			});

			form.message = { type: 'success', text: copy.subscriptionSaved };

			const subscriptions = await fetchSubscriptions(db, userId);

			return { form, subscriptions };
		} catch (error) {
			console.error('Failed to save subscription', error);
			return fail(500, { form, error: copy.saveFailed });
		}
	},
	update: async ({ request, locals, cookies }) => {
		const locale = resolveRequestLocale(request, cookies);
		const copy = subscriptionActionCopy[locale];
		const formData = await request.formData();
		const form = await superValidate(formData, zod4(createSubscriptionSchema(locale)));
		if (!form.valid) {
			return fail(400, { form });
		}

		const id = Number(formData.get('id'));
		if (!Number.isFinite(id)) {
			return fail(400, { form, error: copy.invalidSubscriptionId });
		}

		const db = locals.db;
		if (!db) {
			return fail(500, { form, error: copy.databaseUnavailable });
		}

		const auth = createAuth(db);
		const session = await auth.api.getSession({ headers: request.headers });
		const userId = session?.user.id;

		if (!userId) {
			return fail(401, { form, error: copy.loginRequired });
		}

		try {
			const existingSubscription = await db.query.trackedSubscriptionTable.findFirst({
				where: (trackedSubscription, { and, eq }) =>
					and(eq(trackedSubscription.id, id), eq(trackedSubscription.userId, userId))
			});

			if (!existingSubscription) {
				return fail(404, { form, error: copy.subscriptionNotFound });
			}

			if (
				form.data.iconType === 'image' &&
				(existingSubscription.iconType !== 'image' ||
					existingSubscription.iconValue !== form.data.iconValue)
			) {
				return fail(400, { form, error: copy.imageFromUploadOnly });
			}

			const { defaultNotifyDaysBefore, timeZone } = await resolveUserNotificationConfig(db, userId);
			const categoryId = await getOwnedCategoryId(db, userId, form.data.categoryId);
			const paymentMethodId = await getOwnedPaymentMethodId(db, userId, form.data.paymentMethodId);
			const { nextBillingAt, daysUntilNextBilling } = computeNextBilling(
				form.data.datepicker,
				form.data.select,
				{ timeZone }
			);

			await db
				.update(trackedSubscriptionTable)
				.set({
					categoryId,
					paymentMethodId,
					serviceName: form.data.text,
					...buildTemplateValues(form.data),
					color: existingSubscription.color,
					iconType: form.data.iconType,
					iconValue: form.data.iconValue,
					cycle: form.data.select,
					amount: form.data.number,
					currency: form.data.currency,
					firstPaymentDate: form.data.datepicker,
					nextBillingAt,
					daysUntilNextBilling,
					notifyDaysBefore: form.data.notifyDaysBefore ?? defaultNotifyDaysBefore,
					tags: [],
					...buildCancellationValues(form.data)
				})
				.where(
					and(eq(trackedSubscriptionTable.id, id), eq(trackedSubscriptionTable.userId, userId))
				);

			if (
				existingSubscription.iconType === 'image' &&
				(form.data.iconType !== 'image' || existingSubscription.iconValue !== form.data.iconValue)
			) {
				await deleteSubscriptionIconImage(locals.bucket, existingSubscription.iconValue);
			}

			const subscriptions = await fetchSubscriptions(db, userId);
			return { form, subscriptions };
		} catch (error) {
			console.error('Failed to update subscription', error);
			return fail(500, { form, error: copy.updateFailed });
		}
	},
	cancel: async ({ request, locals, cookies }) => {
		const copy = subscriptionActionCopy[resolveRequestLocale(request, cookies)];
		const formData = await request.formData();
		const id = Number(formData.get('id'));
		if (!Number.isFinite(id)) {
			return fail(400, { error: copy.invalidSubscriptionId });
		}

		const db = locals.db;
		if (!db) {
			return fail(500, { error: copy.databaseUnavailable });
		}

		const auth = createAuth(db);
		const session = await auth.api.getSession({ headers: request.headers });
		const userId = session?.user.id;

		if (!userId) {
			return fail(401, { error: copy.loginRequired });
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
			return fail(500, { error: copy.cancelFailed });
		}
	},
	reactivate: async ({ request, locals, cookies }) => {
		const copy = subscriptionActionCopy[resolveRequestLocale(request, cookies)];
		const formData = await request.formData();
		const id = Number(formData.get('id'));
		if (!Number.isFinite(id)) {
			return fail(400, { error: copy.invalidSubscriptionId });
		}

		const db = locals.db;
		if (!db) {
			return fail(500, { error: copy.databaseUnavailable });
		}

		const auth = createAuth(db);
		const session = await auth.api.getSession({ headers: request.headers });
		const userId = session?.user.id;

		if (!userId) {
			return fail(401, { error: copy.loginRequired });
		}

		try {
			const currentPlan = await resolveCurrentPlanForUser(db, userId);
			if (!currentPlan.isPremium && (await hasReachedFreeActiveLimit(db, userId, id))) {
				return fail(403, {
					error: copy.freeLimitReached
				});
			}

			const subscription = await db.query.trackedSubscriptionTable.findFirst({
				where: (trackedSubscription, { and, eq }) =>
					and(eq(trackedSubscription.id, id), eq(trackedSubscription.userId, userId))
			});

			if (!subscription) {
				return fail(404, { error: copy.subscriptionNotFound });
			}

			const { nextBillingAt, daysUntilNextBilling } = computeNextBilling(
				subscription.firstPaymentDate,
				subscription.cycle,
				{ timeZone: (await resolveUserNotificationConfig(db, userId)).timeZone }
			);

			await db
				.update(trackedSubscriptionTable)
				.set({
					status: 'active',
					canceledAt: null,
					nextBillingAt,
					daysUntilNextBilling,
					lastNotifiedAt: null,
					lastNotifiedDate: null
				})
				.where(
					and(eq(trackedSubscriptionTable.id, id), eq(trackedSubscriptionTable.userId, userId))
				);

			const subscriptions = await fetchSubscriptions(db, userId);
			return { subscriptions };
		} catch (error) {
			console.error('Failed to reactivate subscription', error);
			return fail(500, { error: copy.reactivateFailed });
		}
	},
	delete: async ({ request, locals, cookies }) => {
		const copy = subscriptionActionCopy[resolveRequestLocale(request, cookies)];
		const formData = await request.formData();
		const id = Number(formData.get('id'));
		if (!Number.isFinite(id)) {
			return fail(400, { error: copy.invalidSubscriptionId });
		}

		const db = locals.db;
		if (!db) {
			return fail(500, { error: copy.databaseUnavailable });
		}

		const auth = createAuth(db);
		const session = await auth.api.getSession({ headers: request.headers });
		const userId = session?.user.id;

		if (!userId) {
			return fail(401, { error: copy.loginRequired });
		}

		try {
			const subscription = await db.query.trackedSubscriptionTable.findFirst({
				where: (trackedSubscription, { and, eq }) =>
					and(eq(trackedSubscription.id, id), eq(trackedSubscription.userId, userId))
			});

			await db
				.delete(trackedSubscriptionTable)
				.where(
					and(eq(trackedSubscriptionTable.id, id), eq(trackedSubscriptionTable.userId, userId))
				);

			if (subscription?.iconType === 'image') {
				await deleteSubscriptionIconImage(locals.bucket, subscription.iconValue);
			}

			const subscriptions = await fetchSubscriptions(db, userId);
			return { subscriptions };
		} catch (error) {
			console.error('Failed to delete subscription', error);
			return fail(500, { error: copy.deleteFailed });
		}
	}
};
