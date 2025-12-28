export const load = async ({ locals: { db }, params }) => {
	const { code } = params;
	const subscription = await db.query.subscriptionTable.findFirst({
		where: (t, { eq }) => eq(t.code, code),
		with: {
			subscriptionPlans: {
				with: {
					plan: true
				}
			}
		}
	});
	return {
		subscription
	};
};
