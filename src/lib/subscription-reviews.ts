import { nextBillingDateOnOrAfter } from '$lib/billing-dates';
import {
	diffCalendarDays,
	getLocalDateString,
	normalizeDateString,
	resolveTimeZone
} from '$lib/time-zone';

export type ReviewDecision = 'keep' | 'review';
export type ReviewState = {
	billingDate: string;
	context: string;
	decision: ReviewDecision | null;
	reviewedAt: number | null;
	daysUntilBilling: number;
};

export type ReviewSubscription = {
	createdAt: Date | string | number;
	firstPaymentDate: string;
	cycle: string;
	amount: number;
	currency: string;
	status: string;
	reviewRevision?: number;
};

export type SavedReview = {
	billingDate: string;
	billingContext: string;
	decision: ReviewDecision | null;
	reviewedAt: number;
};

const createdAtMs = (subscription: Pick<ReviewSubscription, 'createdAt'>): number =>
	typeof subscription.createdAt === 'number'
		? subscription.createdAt
		: new Date(subscription.createdAt).getTime();

/** A comparison token, not authority: the server always reconstructs it from owned data. */
export const getReviewContext = (subscription: Omit<ReviewSubscription, 'status'>): string =>
	JSON.stringify([
		// IDs can be reused by SQLite; bind the token to this immutable creation instance.
		createdAtMs(subscription),
		subscription.reviewRevision ?? 0,
		normalizeDateString(subscription.firstPaymentDate),
		subscription.cycle,
		subscription.amount,
		subscription.currency
	]);

export const getReviewState = (
	subscription: ReviewSubscription,
	review: SavedReview | null,
	options: { timeZone?: string; now?: Date } = {}
): ReviewState | null => {
	if (subscription.status !== 'active' || !Number.isFinite(createdAtMs(subscription))) return null;
	const today = getLocalDateString(options.now ?? new Date(), resolveTimeZone(options.timeZone));
	const billingDate = nextBillingDateOnOrAfter(
		subscription.firstPaymentDate,
		subscription.cycle,
		today
	);
	if (!billingDate) return null;
	const context = getReviewContext(subscription);
	const current =
		review?.billingDate === billingDate && review.billingContext === context ? review : null;
	return {
		billingDate,
		context,
		decision: current?.decision ?? null,
		reviewedAt: current?.reviewedAt ?? null,
		daysUntilBilling: diffCalendarDays(billingDate, today)
	};
};

/** Today through today + N calendar days, inclusive; never based on elapsed 24-hour periods. */
export const isReviewWithinDays = (state: ReviewState, days: number): boolean =>
	state.daysUntilBilling >= 0 && state.daysUntilBilling <= days;
