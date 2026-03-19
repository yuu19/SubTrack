type StatusLike = {
	status?: string | null;
};

type TimestampLike = number | Date | null | undefined;

type PendingCancelLike = {
	cancelAtPeriodEnd?: boolean | number | null;
	cancelAt?: TimestampLike;
};

// Mirrors @better-auth/stripe src/utils.ts behavior until the package exports them.
export function isActiveOrTrialing(sub: StatusLike): boolean {
	return sub.status === 'active' || sub.status === 'trialing';
}

export function isPendingCancel(sub: PendingCancelLike): boolean {
	return !!(sub.cancelAtPeriodEnd || sub.cancelAt);
}

export function toTimestamp(value: TimestampLike): number | null {
	if (typeof value === 'number') return value;
	if (value instanceof Date) return value.getTime();
	return null;
}
