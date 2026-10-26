import { and, eq, sql } from 'drizzle-orm';
import { getReviewState, type ReviewDecision, type ReviewState } from '$lib/subscription-reviews';
import { isValidDateString, resolveTimeZone } from '$lib/time-zone';
import { subscriptionReviewTable, trackedSubscriptionTable, user } from './db/schema';

type Db = NonNullable<App.Locals['db']>;
type Subscription = typeof trackedSubscriptionTable.$inferSelect;
export type ReviewError = 'invalid' | 'unauthorized' | 'not_found' | 'stale' | 'unavailable';
export type ReviewInput = {
	id: number;
	billingDate: string;
	context: string;
	decision: ReviewDecision | 'undo';
	reviewedAt: number | null;
};

export const parseReviewInput = (data: FormData): ReviewInput | null => {
	const id = data.get('id');
	const billingDate = data.get('billingDate');
	const context = data.get('context');
	const decision = data.get('decision');
	const reviewedAt = data.get('reviewedAt');
	if (
		typeof id !== 'string' ||
		!/^[1-9]\d*$/.test(id) ||
		!Number.isSafeInteger(Number(id)) ||
		typeof billingDate !== 'string' ||
		!isValidDateString(billingDate) ||
		typeof context !== 'string' ||
		context.length > 1000 ||
		!context ||
		(decision !== 'keep' && decision !== 'review' && decision !== 'undo') ||
		typeof reviewedAt !== 'string' ||
		(reviewedAt !== '' && (!/^\d+$/.test(reviewedAt) || !Number.isSafeInteger(Number(reviewedAt))))
	)
		return null;
	return {
		id: Number(id),
		billingDate,
		context,
		decision,
		reviewedAt: reviewedAt === '' ? null : Number(reviewedAt)
	};
};

export const listReviewStates = async (
	db: Db,
	userId: string,
	subscriptions: Subscription[],
	options: { timeZone?: string; now?: Date } = {}
): Promise<Record<string, ReviewState>> => {
	// One calendar instant for the entire response, even at local midnight.
	const reviewOptions = { ...options, now: options.now ?? new Date() };
	const reviews = await db
		.select()
		.from(subscriptionReviewTable)
		.where(eq(subscriptionReviewTable.userId, userId));
	const byCycle = new Map(
		reviews.map((review) => [`${review.subscriptionId}:${review.billingDate}`, review])
	);
	const states: Record<string, ReviewState> = {};
	for (const subscription of subscriptions) {
		if (subscription.userId !== userId) continue;
		const next = getReviewState(subscription, null, reviewOptions);
		if (!next) continue;
		states[subscription.id] = getReviewState(
			subscription,
			byCycle.get(`${subscription.id}:${next.billingDate}`) ?? null,
			reviewOptions
		)!;
	}
	return states;
};

/** Every write is a single guarded statement; no read-then-write authorization race. */
export const saveSubscriptionReview = async (
	db: Db,
	userId: string,
	input: ReviewInput,
	now = new Date()
): Promise<{ reviewState: ReviewState; subscriptionId: number } | { reviewError: ReviewError }> => {
	const subscription = await db.query.trackedSubscriptionTable.findFirst({
		where: and(
			eq(trackedSubscriptionTable.id, input.id),
			eq(trackedSubscriptionTable.userId, userId)
		)
	});
	if (!subscription) return { reviewError: 'not_found' };
	const owner = await db.query.user.findFirst({
		where: eq(user.id, userId),
		columns: { timeZone: true }
	});
	if (!owner) return { reviewError: 'not_found' };
	const state = getReviewState(subscription, null, {
		timeZone: resolveTimeZone(owner.timeZone),
		now
	});
	if (!state || state.billingDate !== input.billingDate || state.context !== input.context) {
		return { reviewError: 'stale' };
	}
	const decision = input.decision === 'undo' ? null : input.decision;
	// Null-decision tombstones prevent an old initial-save retry from recreating an undone choice.
	const rows = await db.all<{ decision: ReviewDecision | null; reviewed_at: number }>(sql`
		INSERT INTO subscription_review (user_id, subscription_id, billing_date, billing_context, decision, reviewed_at)
		SELECT ${userId}, id, ${state.billingDate}, ${state.context}, ${decision}, ${now.getTime()}
		FROM tracked_subscription
		WHERE id = ${input.id} AND user_id = ${userId} AND status = 'active'
			AND created_at = ${subscription.createdAt.getTime()}
			AND review_revision = ${subscription.reviewRevision}
			AND first_payment_date = ${subscription.firstPaymentDate} AND cycle = ${subscription.cycle}
			AND amount = ${subscription.amount} AND currency = ${subscription.currency}
			AND EXISTS (SELECT 1 FROM user WHERE id = ${userId} AND time_zone = ${owner.timeZone})
			AND (${input.reviewedAt} IS NULL OR EXISTS (
				SELECT 1 FROM subscription_review WHERE subscription_id = ${input.id} AND billing_date = ${state.billingDate}
			))
		ON CONFLICT (subscription_id, billing_date) DO UPDATE SET
			billing_context = excluded.billing_context,
			decision = excluded.decision,
			reviewed_at = CASE
				WHEN subscription_review.billing_context = excluded.billing_context AND subscription_review.decision IS excluded.decision
				THEN subscription_review.reviewed_at
				ELSE MAX(subscription_review.reviewed_at + 1, excluded.reviewed_at) END
		WHERE subscription_review.user_id = ${userId} AND (
			subscription_review.billing_context != excluded.billing_context
			OR subscription_review.reviewed_at = ${input.reviewedAt}
			OR subscription_review.decision IS excluded.decision
		)
		RETURNING decision, reviewed_at
	`);
	if (rows.length !== 1) return { reviewError: 'stale' };
	return {
		subscriptionId: input.id,
		reviewState: { ...state, decision: rows[0].decision, reviewedAt: rows[0].reviewed_at }
	};
};
