export type ChecklistSubscription = {
	id: number | string;
	serviceName: string;
	nextBillingAt: string;
	status?: string;
	_pending?: boolean;
};

export type ChecklistPreferences = {
	collapsed: boolean;
	reviewedSubscriptionId: string | null;
	reviewedBillingDate: string | null;
	reviewedNotificationMethod: string | null;
};

export const emptyChecklistPreferences = (): ChecklistPreferences => ({
	collapsed: false,
	reviewedSubscriptionId: null,
	reviewedBillingDate: null,
	reviewedNotificationMethod: null
});

export function parseChecklistPreferences(value: string | null): ChecklistPreferences {
	try {
		const parsed: unknown = JSON.parse(value ?? 'null');
		if (!parsed || typeof parsed !== 'object') return emptyChecklistPreferences();
		const data = parsed as Record<string, unknown>;
		return {
			collapsed: data.collapsed === true,
			reviewedSubscriptionId:
				typeof data.reviewedSubscriptionId === 'string' ? data.reviewedSubscriptionId : null,
			reviewedBillingDate:
				typeof data.reviewedBillingDate === 'string' ? data.reviewedBillingDate : null,
			reviewedNotificationMethod:
				typeof data.reviewedNotificationMethod === 'string' ? data.reviewedNotificationMethod : null
		};
	} catch {
		return emptyChecklistPreferences();
	}
}

export function checklistProgress(
	subscriptions: ChecklistSubscription[],
	preferences: ChecklistPreferences,
	notificationMethod: string
) {
	// Unsynced local rows are not yet saved to the account; canceled contracts do not count.
	const saved = subscriptions.filter(
		(subscription) => !subscription._pending && subscription.status !== 'canceled'
	);
	const next =
		saved
			.filter((subscription) => /^\d{4}-\d{2}-\d{2}$/.test(subscription.nextBillingAt))
			.sort((a, b) => a.nextBillingAt.localeCompare(b.nextBillingAt))[0] ?? null;
	const billingReviewed = saved.some(
		(subscription) =>
			String(subscription.id) === preferences.reviewedSubscriptionId &&
			subscription.nextBillingAt === preferences.reviewedBillingDate
	);
	const steps = [
		saved.length >= 1,
		billingReviewed,
		saved.length >= 3,
		preferences.reviewedNotificationMethod === notificationMethod
	];
	return { count: saved.length, next, steps, completed: steps.filter(Boolean).length };
}
