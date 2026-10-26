import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import { decodeBase32IgnorePadding } from '@oslojs/encoding';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { account, twoFactor, user } from './db/schema';
import { createTestDb } from './test-db';

vi.mock('$app/server', () => ({ getRequestEvent: () => undefined }));

const origin = 'http://localhost:3000';
const email = 'auth-regression@example.test';
const password = 'SubTrack-regression-password-1';
let fixture: Awaited<ReturnType<typeof createTestDb>>;
let auth: ReturnType<typeof import('../auth').createAuth>;

function cookieFrom(response: Response) {
	return response.headers
		.getSetCookie()
		.map((cookie) => cookie.split(';')[0])
		.join('; ');
}

function post(path: string, body: Record<string, unknown>, cookie = '') {
	return auth.handler(
		new Request(`${origin}/api/auth${path}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', origin, cookie },
			body: JSON.stringify(body)
		})
	);
}

async function signUp() {
	return post('/sign-up/email', { name: 'Auth regression', email, password });
}

async function mockGoogle(emailVerified = true) {
	const context = await auth.$context;
	const google = context.socialProviders.find((provider) => provider.id === 'google')!;
	// Mock only Google's external boundary. Better Auth's linking gate, sessions,
	// adapter, and SubTrack configuration all execute for real.
	vi.spyOn(google, 'verifyIdToken').mockResolvedValue(true);
	vi.spyOn(google, 'getUserInfo').mockResolvedValue({
		user: { id: 'google-test-subject', email, name: 'Google regression', emailVerified },
		data: {}
	});
	return google;
}

beforeEach(async () => {
	vi.stubEnv('E2E_AUTH_DISABLE_STRIPE', 'true');
	vi.stubEnv('BETTER_AUTH_SECRET', 'subtrack-isolated-test-secret-0123456789-abcdef');
	vi.stubEnv('BETTER_AUTH_URL', origin);
	vi.stubEnv('GOOGLE_CLIENT_ID', 'isolated-google-client');
	vi.stubEnv('GOOGLE_CLIENT_SECRET', 'isolated-google-secret');
	vi.stubGlobal(
		'fetch',
		vi.fn(() => {
			throw new Error('Unexpected network request in auth test');
		})
	);
	vi.resetModules();
	fixture = await createTestDb();
	const { createAuth } = await import('../auth');
	auth = createAuth(fixture.db, { requestOrigin: origin });
	// Better Auth skips origin checks in NODE_ENV=test; exercise the production gate.
	(await auth.$context).skipOriginCheck = false;
});

afterEach(() => {
	fixture?.sqlite.close();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe('Better Auth security upgrade', () => {
	it('preserves password sign-up, sign-in, and session lookup', async () => {
		const signup = await signUp();
		expect(signup.status).toBe(200);
		const signin = await post('/sign-in/email', { email, password });
		expect(signin.status).toBe(200);
		const session = await auth.handler(
			new Request(`${origin}/api/auth/get-session`, {
				headers: { cookie: cookieFrom(signin) }
			})
		);
		expect(((await session.json()) as { user: { email: string } }).user.email).toBe(email);
		expect((await post('/sign-in/email', { email, password: 'wrong-password' })).status).toBe(401);
	});

	it('rejects Google auto-linking to an unverified password account (GHSA-g38m-r43w-p2q7)', async () => {
		expect((await signUp()).status).toBe(200);
		await mockGoogle();
		const response = await post('/sign-in/social', {
			provider: 'google',
			idToken: { token: 'mock-google-id-token' }
		});
		expect(response.status).toBe(401);
		expect(await response.json()).toMatchObject({ code: 'OAUTH_LINK_ERROR' });
		expect(
			fixture.db
				.select()
				.from(account)
				.all()
				.map((row) => row.providerId)
		).toEqual(['credential']);
		expect(fixture.db.select().from(user).get()?.emailVerified).toBe(false);
	});

	it('allows Google auto-linking when local email ownership is already verified', async () => {
		expect((await signUp()).status).toBe(200);
		fixture.db.update(user).set({ emailVerified: true }).where(eq(user.email, email)).run();
		await mockGoogle();
		const response = await post('/sign-in/social', {
			provider: 'google',
			idToken: { token: 'mock-google-id-token' }
		});
		expect(response.status).toBe(200);
		expect(
			fixture.db
				.select()
				.from(account)
				.all()
				.map((row) => row.providerId)
				.sort()
		).toEqual(['credential', 'google']);
		expect(fixture.db.select().from(user).all()).toHaveLength(1);
	});

	it('supports first-time Google sign-in and repeat sign-in', async () => {
		await mockGoogle();
		const body = { provider: 'google', idToken: { token: 'mock-google-id-token' } };
		expect((await post('/sign-in/social', body)).status).toBe(200);
		expect((await post('/sign-in/social', body)).status).toBe(200);
		expect(fixture.db.select().from(user).all()).toHaveLength(1);
		expect(fixture.db.select().from(user).get()?.emailVerified).toBe(true);
		expect(fixture.db.select().from(account).get()?.providerId).toBe('google');
	});

	it('preserves the Google redirect callback and rejects callback state replay', async () => {
		const google = await mockGoogle();
		const exchange = vi.spyOn(google, 'validateAuthorizationCode').mockResolvedValue({
			accessToken: 'mock-google-access-token',
			scopes: ['openid', 'email', 'profile']
		});
		const start = await post('/sign-in/social', {
			provider: 'google',
			callbackURL: `${origin}/me`,
			disableRedirect: true
		});
		expect(start.status).toBe(200);
		const { url } = (await start.json()) as { url: string };
		const authorizationUrl = new URL(url);
		expect(authorizationUrl.searchParams.get('redirect_uri')).toBe(
			`${origin}/api/auth/callback/google`
		);
		expect(authorizationUrl.searchParams.get('code_challenge_method')).toBe('S256');
		const callback = `${origin}/api/auth/callback/google?code=mock-code&state=${authorizationUrl.searchParams.get('state')}`;
		const response = await auth.handler(
			new Request(callback, { headers: { cookie: cookieFrom(start) } })
		);
		expect(response.status).toBe(302);
		expect(response.headers.get('location')).toBe(`${origin}/me`);
		expect(exchange).toHaveBeenCalledWith(
			expect.objectContaining({ code: 'mock-code', codeVerifier: expect.any(String) })
		);
		expect(fixture.db.select().from(account).get()?.providerId).toBe('google');
		const replay = await auth.handler(
			new Request(callback, { headers: { cookie: cookieFrom(start) } })
		);
		expect(replay.headers.get('location')).toContain('error=state_mismatch');
		expect(exchange).toHaveBeenCalledTimes(1);
	});

	it('enrolls 2FA, verifies TOTP, requires a challenge, and consumes backup codes once', async () => {
		const signup = await signUp();
		expect(signup.status).toBe(200);
		const enrollment = await post('/two-factor/enable', { password }, cookieFrom(signup));
		expect(enrollment.status).toBe(200);
		const { totpURI, backupCodes } = (await enrollment.json()) as {
			totpURI: string;
			backupCodes: string[];
		};
		expect(fixture.db.select().from(twoFactor).get()?.verified).toBe(false);
		const secret = new TextDecoder().decode(
			decodeBase32IgnorePadding(new URL(totpURI).searchParams.get('secret')!)
		);
		const { code } = await auth.api.generateTOTP({ body: { secret } });
		const verified = await post('/two-factor/verify-totp', { code }, cookieFrom(signup));
		expect(verified.status).toBe(200);
		expect(fixture.db.select().from(twoFactor).get()?.verified).toBe(true);
		expect(fixture.db.select().from(user).get()?.twoFactorEnabled).toBe(true);
		const totpSignin = await post('/sign-in/email', { email, password });
		expect(await totpSignin.json()).toMatchObject({ twoFactorRedirect: true });
		const totpVerified = await post('/two-factor/verify-totp', { code }, cookieFrom(totpSignin));
		expect(totpVerified.status).toBe(200);
		const session = await auth.handler(
			new Request(`${origin}/api/auth/get-session`, {
				headers: { cookie: cookieFrom(totpVerified) }
			})
		);
		expect((await session.json()) as object).toMatchObject({ user: { email } });
		const signin = await post('/sign-in/email', { email, password });
		expect(await signin.json()).toMatchObject({ twoFactorRedirect: true });
		const recovered = await post(
			'/two-factor/verify-backup-code',
			{ code: backupCodes[0] },
			cookieFrom(signin)
		);
		expect(recovered.status).toBe(200);
		const nextSignin = await post('/sign-in/email', { email, password });
		expect(
			(
				await post(
					'/two-factor/verify-backup-code',
					{ code: backupCodes[0] },
					cookieFrom(nextSignin)
				)
			).status
		).toBe(401);
		expect(fixture.db.select().from(twoFactor).get()?.failedVerificationCount).toBe(1);
	});

	it('persists account-level 2FA lockout across fresh sign-in challenges', async () => {
		const signup = await signUp();
		const enrollment = await post('/two-factor/enable', { password }, cookieFrom(signup));
		const { totpURI } = (await enrollment.json()) as { totpURI: string };
		const secret = new TextDecoder().decode(
			decodeBase32IgnorePadding(new URL(totpURI).searchParams.get('secret')!)
		);
		const { code } = await auth.api.generateTOTP({ body: { secret } });
		expect((await post('/two-factor/verify-totp', { code }, cookieFrom(signup))).status).toBe(200);
		// Fresh challenges cannot reset the account-level ten-attempt budget.
		for (let attempt = 0; attempt < 10; attempt++) {
			const signin = await post('/sign-in/email', { email, password });
			expect(
				(await post('/two-factor/verify-totp', { code: 'invalid' }, cookieFrom(signin))).status
			).toBe(401);
		}
		const locked = fixture.db.select().from(twoFactor).get()!;
		expect(locked.failedVerificationCount).toBe(10);
		expect(locked.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
		const signin = await post('/sign-in/email', { email, password });
		const response = await post('/two-factor/verify-totp', { code }, cookieFrom(signin));
		expect(response.status).toBe(429);
		expect(await response.json()).toMatchObject({ code: 'ACCOUNT_TEMPORARILY_LOCKED' });
		fixture.db
			.update(twoFactor)
			.set({ lockedUntil: new Date(Date.now() - 1000) })
			.run();
		const retry = await post('/sign-in/email', { email, password });
		const freshCode = await auth.api.generateTOTP({ body: { secret } });
		expect((await post('/two-factor/verify-totp', freshCode, cookieFrom(retry))).status).toBe(200);
		expect(fixture.db.select().from(twoFactor).get()).toMatchObject({
			failedVerificationCount: 0,
			lockedUntil: null
		});
	});

	it('migrates legacy 2FA rows without changing enrolled secrets or backup codes', () => {
		const legacy = new Database(':memory:');
		try {
			legacy.exec('CREATE TABLE user (id text PRIMARY KEY, two_factor_enabled integer NOT NULL)');
			legacy.exec("INSERT INTO user VALUES ('user-1', 1), ('user-2', 0)");
			legacy.exec(
				'CREATE TABLE twoFactor (id text PRIMARY KEY, secret text NOT NULL, backupCodes text NOT NULL, userId text NOT NULL)'
			);
			legacy.exec(
				"INSERT INTO twoFactor VALUES ('legacy', 'encrypted-secret', 'encrypted-codes', 'user-1')"
			);
			legacy.exec(
				"INSERT INTO twoFactor VALUES ('pending', 'pending-secret', 'pending-codes', 'user-2')"
			);
			legacy.exec(readFileSync('migrations/0027_better_auth_two_factor_security.sql', 'utf8'));
			expect(legacy.prepare("SELECT * FROM twoFactor WHERE id = 'legacy'").get()).toEqual({
				id: 'legacy',
				secret: 'encrypted-secret',
				backupCodes: 'encrypted-codes',
				userId: 'user-1',
				verified: 1,
				failedVerificationCount: 0,
				lockedUntil: null
			});
			expect(legacy.prepare("SELECT * FROM twoFactor WHERE id = 'pending'").get()).toEqual({
				id: 'pending',
				secret: 'pending-secret',
				backupCodes: 'pending-codes',
				userId: 'user-2',
				verified: 0,
				failedVerificationCount: 0,
				lockedUntil: null
			});
		} finally {
			legacy.close();
		}
	});
});
