import { createAuth } from '$lib/auth.js';
import { userConfigSchema } from '$lib/states/userConfig.svelte';

export const load = async ({ request, locals }) => {
	const { db } = locals;
	const auth = createAuth(db);
	const session = await auth.api.getSession({
		headers: request.headers
	});
	const id = session?.user.id || '';
	const user = id
		? await db.query.user.findFirst({
				where: (user, { eq }) => eq(user.id, id)
			})
		: null;
	const parsedConfig = userConfigSchema.safeParse({
		activeTheme: user?.activeTheme ?? 'default'
	});
	const userConfig = parsedConfig.success ? parsedConfig.data : userConfigSchema.parse({});

	return {
		user,
		userConfig
	};
};
