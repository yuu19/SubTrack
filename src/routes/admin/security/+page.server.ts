import { createAuth } from '$lib/auth';
import {
	getAdminSecurityState,
	hasValidAdminMfaCookie,
	requireAdminSessionForSetup
} from '$lib/server/admin-security';

export const load = async ({ locals: { db }, request, url, cookies }) => {
	const auth = createAuth(db, { requestOrigin: url.origin });
	const session = await auth.api.getSession({ headers: request.headers });

	if (!session) {
		return {
			mode: 'verify' as const,
			hasPassword: false,
			twoFactorEnabled: true,
			adminMfaVerified: false
		};
	}

	requireAdminSessionForSetup(session.user, url.pathname);

	const state = await getAdminSecurityState(db, session.user.id);
	const adminMfaVerified = await hasValidAdminMfaCookie(cookies, session.user.id);

	return {
		mode: state.twoFactorEnabled && !adminMfaVerified ? ('verify' as const) : ('setup' as const),
		hasPassword: state.hasPassword,
		twoFactorEnabled: state.twoFactorEnabled,
		adminMfaVerified
	};
};
