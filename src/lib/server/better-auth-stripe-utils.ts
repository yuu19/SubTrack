type StatusLike = {
	status?: string | null;
};

type PendingCancelLike = {
	cancelAtPeriodEnd?: boolean | number | null;
	cancelAt?: number | null;
};

// Mirrors @better-auth/stripe src/utils.ts (v1.4.10) until the package exports them.
export function isActiveOrTrialing(sub: StatusLike): boolean {
	return sub.status === 'active' || sub.status === 'trialing';
}

export function isPendingCancel(sub: PendingCancelLike): boolean {
	return !!(sub.cancelAtPeriodEnd || sub.cancelAt);
}
