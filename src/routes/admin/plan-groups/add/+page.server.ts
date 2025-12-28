import { createAuth } from '$lib/auth.js';
import { planGroupSchema } from '$lib/formSchema';
import { planGroupTable } from '$lib/server/db/schema.js';
import { redirect } from '@sveltejs/kit';
import { fail, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

export const load = async () => {
	const form = await superValidate(zod4(planGroupSchema));
	return {
		form
	};
};

export const actions = {
	default: async ({ request, locals }) => {
		const { db } = locals;
		const auth = createAuth(db);
		const session = await auth.api.getSession({
			headers: request.headers
		});
		console.log('🚀 ~ default: ~ session:', session);
		// if (session?.user.role !== 'admin') {
		// 	error(401, 'sorry you are not authorized to perform this operation');
		// }
		const form = await superValidate(request, zod4(planGroupSchema));
		console.log('🚀 ~ default: ~ form:', form);
		if (!form.valid) {
			return fail(400, { form });
		}
		const { description, billingIntervals, name } = form.data;
		await db.insert(planGroupTable).values({
			description,
			billingIntervals,
			name
		});
		redirect(303, '/admin/plan-groups');
	}
};
