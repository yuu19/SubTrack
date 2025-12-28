import type { Actions, PageServerLoad } from './$types';
import { fail, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { subscriptionSchema } from '$lib/formSchema';
import { pushSubscriptionTable, trackedSubscriptionTable } from '$lib/server/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { createAuth } from '$lib/auth';
import { computeNextBilling } from '$lib/server/subscriptions';

const fetchSubscriptions = async (
	db: NonNullable<App.Locals['db']>,
	userId: string
) => {
	return db
		.select()
		.from(trackedSubscriptionTable)
		.where(eq(trackedSubscriptionTable.userId, userId))
		.orderBy(desc(trackedSubscriptionTable.createdAt));
};

export const load: PageServerLoad = async ({ locals, request }) => {
	const form = await superValidate(zod4(subscriptionSchema));
	if (!form.data.select) {
		form.data.select = 'monthly';
	}

	const vapidPublicKey = process.env.VAPID_PUBLIC_KEY ?? '';

	const db = locals.db;
	if (!db) {
		return { form, subscriptions: [], vapidPublicKey, hasPushSubscription: false };
	}

	const auth = createAuth(db);
	const session = await auth.api.getSession({ headers: request.headers });
	const userId = session?.user.id;

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
			? (
					await db
						.select({ id: pushSubscriptionTable.id })
						.from(pushSubscriptionTable)
						.where(eq(pushSubscriptionTable.userId, userId))
						.limit(1)
				).length > 0
			: false;

	return { form, subscriptions, vapidPublicKey, hasPushSubscription };
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
			const { nextBillingAt, daysUntilNextBilling } = computeNextBilling(
				form.data.datepicker,
				form.data.select
			);

			await db.insert(trackedSubscriptionTable).values({
				userId,
				serviceName: form.data.text,
				cycle: form.data.select,
				amount: form.data.number,
				firstPaymentDate: form.data.datepicker,
				nextBillingAt,
				daysUntilNextBilling,
				notifyDaysBefore: form.data.notifyDaysBefore ?? 1,
				tags: form.data.tagsinput
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
			const { nextBillingAt, daysUntilNextBilling } = computeNextBilling(
				form.data.datepicker,
				form.data.select
			);

			await db
				.update(trackedSubscriptionTable)
				.set({
					serviceName: form.data.text,
					cycle: form.data.select,
					amount: form.data.number,
					firstPaymentDate: form.data.datepicker,
					nextBillingAt,
					daysUntilNextBilling,
					notifyDaysBefore: form.data.notifyDaysBefore ?? 1,
					tags: form.data.tagsinput
				})
				.where(and(eq(trackedSubscriptionTable.id, id), eq(trackedSubscriptionTable.userId, userId)));

			const subscriptions = await fetchSubscriptions(db, userId);
			return { form, subscriptions };
		} catch (error) {
			console.error('Failed to update subscription', error);
			return fail(500, { form, error: 'Failed to update subscription' });
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
				.where(and(eq(trackedSubscriptionTable.id, id), eq(trackedSubscriptionTable.userId, userId)));

			const subscriptions = await fetchSubscriptions(db, userId);
			return { subscriptions };
		} catch (error) {
			console.error('Failed to delete subscription', error);
			return fail(500, { error: 'Failed to delete subscription' });
		}
	}
};
