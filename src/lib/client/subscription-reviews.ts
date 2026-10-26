import type { ReviewState } from '$lib/subscription-reviews';

/**
 * A page load can start before a save and finish after it. Never let that older
 * snapshot undo a confirmed decision (including an undo tombstone). Only keep
 * entries still present in the load, so removed/unowned subscriptions disappear.
 */
export const mergeReviewStates = (
	current: Record<number, ReviewState>,
	loaded: Record<number, ReviewState>
): Record<number, ReviewState> =>
	Object.fromEntries(
		Object.entries(loaded).map(([id, state]) => {
			const known = current[Number(id)];
			const knownIsNewer =
				known?.context === state.context &&
				known.billingDate === state.billingDate &&
				(known.reviewedAt ?? 0) > (state.reviewedAt ?? 0);
			return [id, knownIsNewer ? known : state];
		})
	);

type ReviewIdentity = { id: number | string; createdAt: Date | string | number };

/** SQLite may reuse numeric IDs after deletion; revisions belong to a creation instance. */
export const getReviewIdentity = (subscription: ReviewIdentity): string => {
	const createdAt =
		typeof subscription.createdAt === 'number'
			? subscription.createdAt
			: new Date(subscription.createdAt).getTime();
	return `${subscription.id}:${createdAt}`;
};

export const mergeReviewRevisions = (
	current: Record<string, number>,
	loaded: (ReviewIdentity & { reviewRevision?: number })[]
): Record<string, number> => {
	const revisions = { ...current };
	for (const subscription of loaded) {
		const identity = getReviewIdentity(subscription);
		revisions[identity] = Math.max(revisions[identity] ?? 0, subscription.reviewRevision ?? 0);
	}
	return revisions;
};
