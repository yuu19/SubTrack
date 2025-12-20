import type { Actions, PageServerLoad } from './$types';
import { fail, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { subscriptionSchema } from '$lib/formSchema';
import { subscriptionTable } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { createAuth } from '$lib/auth';
import dayjs from 'dayjs';

const cycleToMonths = (cycle: string) => {
	if (cycle === 'yearly') return 12;
	if (cycle === 'quarterly') return 3;
	return 1;
};

export const load: PageServerLoad = async ({ locals, request }) => {
	const form = await superValidate(zod4(subscriptionSchema));

	const db = locals.db;
	if (!db) {
		return { form, subscriptions: [] };
	}

	const auth = createAuth(db);
	const session = await auth.api.getSession({ headers: request.headers });
	const userId = session?.user.id;

	const today = dayjs().startOf('day');

	const subscriptions =
		userId !== undefined
			? await db
					.select()
					.from(subscriptionTable)
					.where(eq(subscriptionTable.userId, userId))
					.orderBy(desc(subscriptionTable.createdAt))
			: [];

	// refresh days_until_next_billing each load
	for (const sub of subscriptions) {
		const days = dayjs(sub.nextBillingAt).startOf('day').diff(today, 'day');
		if (days !== sub.daysUntilNextBilling) {
			await db
				.update(subscriptionTable)
				.set({ daysUntilNextBilling: days })
				.where(eq(subscriptionTable.id, sub.id));
			sub.daysUntilNextBilling = days;
		}
	}

	return { form, subscriptions };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
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
			const today = dayjs().startOf('day');
			const first = dayjs(form.data.datepicker);
			const monthsToAdd = cycleToMonths(form.data.select);

			let next = first;
			while (next.isBefore(today, 'day')) {
				next = next.add(monthsToAdd, 'month');
			}

			const daysUntil = next.diff(today, 'day');

			await db.insert(subscriptionTable).values({
				userId,
				serviceName: form.data.text,
				cycle: form.data.select,
				amount: form.data.number,
				firstPaymentDate: form.data.datepicker,
				nextBillingAt: next.toISOString(),
				daysUntilNextBilling: daysUntil,
				notifyDaysBefore: form.data.notifyDaysBefore ?? 1,
				tags: form.data.tagsinput
			});

			form.message = { type: 'success', text: 'Subscription saved.' };

			const subscriptions = await db
				.select()
				.from(subscriptionTable)
				.where(eq(subscriptionTable.userId, userId))
				.orderBy(desc(subscriptionTable.createdAt));

			return { form, subscriptions };
		} catch (error) {
			console.error('Failed to save subscription', error);
			return fail(500, { form, error: 'Failed to save subscription' });
		}
	}
};
