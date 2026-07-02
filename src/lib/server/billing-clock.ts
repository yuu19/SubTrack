let e2eBillingNowMs: number | null = null;

export function isE2EBillingTestHelpersEnabled() {
	return process.env.E2E_BILLING_TEST_HELPERS === 'true';
}

export function getBillingNowMs() {
	if (isE2EBillingTestHelpersEnabled() && e2eBillingNowMs !== null) {
		return e2eBillingNowMs;
	}

	return Date.now();
}

export function setE2EBillingNowMs(value: number | null) {
	if (!isE2EBillingTestHelpersEnabled()) return;
	e2eBillingNowMs = value;
}
