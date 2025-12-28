export const load = async ({ locals: { db } }) => {
	const currentDate = new Date();
	const thirtyDaysAgo = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
	const sixtyDaysAgo = new Date(currentDate.getTime() - 60 * 24 * 60 * 60 * 1000);

	const batch = await db.batch([
		// Recent subscriptions
		db.query.subscriptionTable.findMany({
			with: {
				subscriptionPlans: {
					with: {
						plan: true
					}
				},
				user: true
			},
			limit: 3,
			orderBy: (t, { desc }) => desc(t.createdAt)
		}),
		// Users from last 30 days
		db.query.user.findMany({
			where: (t, { gt }) => gt(t.createdAt, thirtyDaysAgo)
		}),
		// Users from previous 30 days (30-60 days ago)
		db.query.user.findMany({
			where: (t, { and, gt, lt }) =>
				and(gt(t.createdAt, sixtyDaysAgo), lt(t.createdAt, thirtyDaysAgo))
		}),
		// Subscriptions from last 30 days
		db.query.subscriptionTable.findMany({
			where: (t, { gt }) => gt(t.createdAt, thirtyDaysAgo)
		}),
		// Subscriptions from previous 30 days
		db.query.subscriptionTable.findMany({
			where: (t, { and, gt, lt }) =>
				and(gt(t.createdAt, sixtyDaysAgo), lt(t.createdAt, thirtyDaysAgo))
		})
		// Top selling plan
	]);

	const [recentSubscriptions, thisMonthUsers, lastMonthUsers, thisMonthSubscriptions, lastMonthSubscriptions] =
		batch;

	const thisMonthRevenue = thisMonthSubscriptions.reduce((total, item) => total + item.amount, 0);
	const lastMonthRevenue = lastMonthSubscriptions.reduce((total, item) => total + item.amount, 0);

	const userGrowthPercentage =
		lastMonthUsers.length === 0
			? 100
			: ((thisMonthUsers.length - lastMonthUsers.length) / lastMonthUsers.length) * 100;

	const revenueGrowthPercentage =
		lastMonthRevenue === 0 ? 100 : ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

	return {
		subscriptions: recentSubscriptions,
		totalRevenue: thisMonthRevenue,
		newCustomers: thisMonthUsers.length,
		userGrowth: userGrowthPercentage.toFixed(1),
		revenueGrowth: revenueGrowthPercentage.toFixed(1)
	};
};
