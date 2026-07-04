import { dev } from '$app/environment';
import { redirect, type Cookies, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { localizePathname } from '$lib/locale-routing';
import { getLocalePrefix } from '$lib/locale-routing';
import { isAdminUser, parseAdminUserIds } from '$lib/server/admin';
import {
	adminLoginAttemptTable,
	session as sessionTable,
	user as userTable
} from '$lib/server/db/schema';

type Db = NonNullable<App.Locals['db']>;

type AdminUserRecord = {
	id: string;
	email: string;
	role?: string | null;
	banned?: boolean | null;
	banReason?: string | null;
	banExpires?: Date | null;
	twoFactorEnabled?: boolean | null;
};

const ADMIN_BASIC_REALM = 'SubTrack Admin';
const ADMIN_MFA_COOKIE = 'subtrack_admin_mfa';
const ADMIN_LOGIN_LOCK_REASON = 'admin_login_failed_attempts';
const DEFAULT_ADMIN_LOGIN_LOCK_MINUTES = 60;
const DEFAULT_ADMIN_MFA_MAX_AGE_MINUTES = 12 * 60;
const MAX_ADMIN_LOGIN_FAILURES = 10;

const encoder = new TextEncoder();

const parsePositiveInteger = (value: string | undefined, fallback: number) => {
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const getAdminLoginFailureLimit = () =>
	Math.min(
		parsePositiveInteger(process.env.ADMIN_LOGIN_FAILURE_LIMIT, MAX_ADMIN_LOGIN_FAILURES),
		MAX_ADMIN_LOGIN_FAILURES
	);

const getAdminLoginLockMs = () =>
	parsePositiveInteger(process.env.ADMIN_LOGIN_LOCK_MINUTES, DEFAULT_ADMIN_LOGIN_LOCK_MINUTES) *
	60 *
	1000;

const getAdminMfaMaxAgeSeconds = () =>
	parsePositiveInteger(process.env.ADMIN_MFA_MAX_AGE_MINUTES, DEFAULT_ADMIN_MFA_MAX_AGE_MINUTES) *
	60;

const timingSafeEqual = (left: string, right: string) => {
	const leftBytes = encoder.encode(left);
	const rightBytes = encoder.encode(right);
	const maxLength = Math.max(leftBytes.length, rightBytes.length);
	let diff = leftBytes.length ^ rightBytes.length;

	for (let index = 0; index < maxLength; index += 1) {
		diff |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
	}

	return diff === 0;
};

const getExpectedBasicCredentials = () => {
	const username = process.env.ADMIN_BASIC_AUTH_USER;
	const password = process.env.ADMIN_BASIC_AUTH_PASSWORD;
	return username && password ? { username, password } : null;
};

const parseBasicCredentials = (authorization: string | null) => {
	if (!authorization?.startsWith('Basic ')) return null;
	try {
		const decoded = atob(authorization.slice('Basic '.length));
		const separatorIndex = decoded.indexOf(':');
		if (separatorIndex < 0) return null;
		return {
			username: decoded.slice(0, separatorIndex),
			password: decoded.slice(separatorIndex + 1)
		};
	} catch {
		return null;
	}
};

const unauthorizedBasicResponse = () =>
	new Response('Authentication required', {
		status: 401,
		headers: {
			'WWW-Authenticate': `Basic realm="${ADMIN_BASIC_REALM}", charset="UTF-8"`
		}
	});

const forbiddenResponse = () => new Response('Forbidden', { status: 403 });

const isAdminBasicAuthValid = (request: Request) => {
	const expected = getExpectedBasicCredentials();
	if (!expected) {
		return dev;
	}

	const actual = parseBasicCredentials(request.headers.get('authorization'));
	if (!actual) return false;

	return (
		timingSafeEqual(actual.username, expected.username) &&
		timingSafeEqual(actual.password, expected.password)
	);
};

const parseAdminAllowedIps = () =>
	(process.env.ADMIN_ALLOWED_IPS ?? '')
		.split(',')
		.map((entry) => entry.trim())
		.filter(Boolean);

const getClientIp = (request: Request) => {
	const direct =
		request.headers.get('cf-connecting-ip') ??
		request.headers.get('true-client-ip') ??
		request.headers.get('x-real-ip');
	if (direct) return direct.trim();

	const forwarded = request.headers.get('x-forwarded-for');
	return forwarded?.split(',')[0]?.trim() || null;
};

const parseIpv4 = (value: string) => {
	const parts = value.split('.');
	if (parts.length !== 4) return null;

	const bytes = parts.map((part) => {
		if (!/^\d{1,3}$/.test(part)) return null;
		const parsed = Number(part);
		return parsed >= 0 && parsed <= 255 ? parsed : null;
	});

	if (bytes.some((byte) => byte === null)) return null;
	return (bytes as number[]).reduce((acc, byte) => (acc << 8) + byte, 0) >>> 0;
};

const ipv4MatchesCidr = (ip: string, cidr: string) => {
	const [range, bitsValue] = cidr.split('/');
	const bits = Number(bitsValue);
	if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;

	const ipNumber = parseIpv4(ip);
	const rangeNumber = parseIpv4(range ?? '');
	if (ipNumber === null || rangeNumber === null) return false;

	const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
	return (ipNumber & mask) === (rangeNumber & mask);
};

const isIpAllowed = (clientIp: string | null) => {
	const allowedIps = parseAdminAllowedIps();
	if (allowedIps.length === 0) return true;
	if (!clientIp) return false;

	return allowedIps.some((allowedIp) =>
		allowedIp.includes('/') ? ipv4MatchesCidr(clientIp, allowedIp) : allowedIp === clientIp
	);
};

export const isAdminExtraProtectedPath = (pathname: string) =>
	pathname.startsWith('/admin') ||
	pathname.startsWith('/api/auth/admin') ||
	pathname.startsWith('/api/admin/security');

export const requireAdminExtraAccess = (event: RequestEvent, canonicalPathname: string) => {
	if (!isAdminExtraProtectedPath(canonicalPathname)) return null;

	if (!getExpectedBasicCredentials() && !dev) {
		return new Response('Admin access is not configured', { status: 503 });
	}

	if (!isIpAllowed(getClientIp(event.request))) {
		return forbiddenResponse();
	}

	if (!isAdminBasicAuthValid(event.request)) {
		return unauthorizedBasicResponse();
	}

	return null;
};

export const localizedAdminSecurityPath = (pathname: string, verify = false) => {
	const locale = getLocalePrefix(pathname) ?? 'ja';
	const path = localizePathname('/admin/security', locale);
	return verify ? `${path}?verify=1` : path;
};

const getAdminMfaSecret = () => process.env.BETTER_AUTH_SECRET;

const bytesToHex = (bytes: ArrayBuffer) =>
	[...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');

const signAdminMfaPayload = async (payload: string) => {
	const secret = getAdminMfaSecret();
	if (!secret) return null;
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
	return bytesToHex(signature);
};

export const createAdminMfaCookieValue = async (userId: string) => {
	const expiresAt = Date.now() + getAdminMfaMaxAgeSeconds() * 1000;
	const payload = `${userId}.${expiresAt}`;
	const signature = await signAdminMfaPayload(payload);
	return signature ? `${payload}.${signature}` : null;
};

export const setAdminMfaCookie = async (cookies: Cookies, userId: string) => {
	const value = await createAdminMfaCookieValue(userId);
	if (!value) return false;

	cookies.set(ADMIN_MFA_COOKIE, value, {
		httpOnly: true,
		secure: !dev,
		sameSite: 'strict',
		path: '/',
		maxAge: getAdminMfaMaxAgeSeconds()
	});

	return true;
};

export const hasValidAdminMfaCookie = async (cookies: Cookies, userId: string) => {
	const value = cookies.get(ADMIN_MFA_COOKIE);
	if (!value) return false;

	const [cookieUserId, expiresAtValue, signature] = value.split('.');
	if (!cookieUserId || !expiresAtValue || !signature || cookieUserId !== userId) return false;

	const expiresAt = Number(expiresAtValue);
	if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

	const expected = await signAdminMfaPayload(`${cookieUserId}.${expiresAtValue}`);
	return expected ? timingSafeEqual(signature, expected) : false;
};

export const findAdminSignInUser = async (
	db: Db,
	request: { headers: Headers; text(): Promise<string> }
) => {
	const email = await extractSignInEmail(request);
	if (!email) return null;

	const record = await db.query.user.findFirst({
		columns: {
			id: true,
			email: true,
			role: true,
			banned: true,
			banReason: true,
			banExpires: true,
			twoFactorEnabled: true
		},
		where: (user, { eq }) => eq(user.email, email)
	});

	if (!record) return null;

	const adminUserIds = parseAdminUserIds(process.env.ADMIN_USER_IDS);
	return isAdminUser(record, adminUserIds) ? record : null;
};

const extractSignInEmail = async (request: { headers: Headers; text(): Promise<string> }) => {
	try {
		const contentType = request.headers.get('content-type') ?? '';
		const text = await request.text();
		if (!text) return null;

		if (contentType.includes('application/json')) {
			const body = JSON.parse(text) as { email?: unknown };
			return typeof body.email === 'string' ? body.email.trim().toLowerCase() : null;
		}

		if (contentType.includes('application/x-www-form-urlencoded')) {
			const body = new URLSearchParams(text);
			return body.get('email')?.trim().toLowerCase() ?? null;
		}
	} catch {
		return null;
	}

	return null;
};

export const clearExpiredAdminLock = async (db: Db, user: AdminUserRecord) => {
	if (
		user.banned &&
		user.banReason === ADMIN_LOGIN_LOCK_REASON &&
		user.banExpires &&
		user.banExpires.getTime() <= Date.now()
	) {
		await db
			.update(userTable)
			.set({ banned: false, banReason: null, banExpires: null })
			.where(eq(userTable.id, user.id));
		await db.delete(adminLoginAttemptTable).where(eq(adminLoginAttemptTable.userId, user.id));
		return true;
	}

	return false;
};

export const isAdminLoginLocked = (user: AdminUserRecord) =>
	Boolean(
		user.banned &&
		user.banReason === ADMIN_LOGIN_LOCK_REASON &&
		user.banExpires &&
		user.banExpires.getTime() > Date.now()
	);

export const recordAdminSignInResult = async (
	db: Db,
	user: AdminUserRecord,
	succeeded: boolean
) => {
	if (succeeded) {
		await db.delete(adminLoginAttemptTable).where(eq(adminLoginAttemptTable.userId, user.id));
		return;
	}

	const existing = await db.query.adminLoginAttemptTable.findFirst({
		where: (attempt, { eq }) => eq(attempt.userId, user.id)
	});
	const failedCount = (existing?.failedCount ?? 0) + 1;
	const now = new Date();

	if (failedCount >= getAdminLoginFailureLimit()) {
		const lockedUntil = new Date(Date.now() + getAdminLoginLockMs());
		await db
			.update(userTable)
			.set({
				banned: true,
				banReason: ADMIN_LOGIN_LOCK_REASON,
				banExpires: lockedUntil
			})
			.where(eq(userTable.id, user.id));
		await db.delete(sessionTable).where(eq(sessionTable.userId, user.id));
		await upsertAdminLoginAttempt(db, user, failedCount, lockedUntil, now);
		return;
	}

	await upsertAdminLoginAttempt(db, user, failedCount, null, now);
};

const upsertAdminLoginAttempt = async (
	db: Db,
	user: AdminUserRecord,
	failedCount: number,
	lockedUntil: Date | null,
	now: Date
) => {
	const existing = await db.query.adminLoginAttemptTable.findFirst({
		where: (attempt, { eq }) => eq(attempt.userId, user.id)
	});

	if (existing) {
		await db
			.update(adminLoginAttemptTable)
			.set({
				email: user.email,
				failedCount,
				lockedUntil,
				updatedAt: now
			})
			.where(eq(adminLoginAttemptTable.userId, user.id));
		return;
	}

	await db.insert(adminLoginAttemptTable).values({
		userId: user.id,
		email: user.email,
		failedCount,
		lockedUntil,
		updatedAt: now,
		createdAt: now
	});
};

export const getAdminSecurityState = async (db: Db, userId: string) => {
	const [userRecord, credentialAccount] = await Promise.all([
		db.query.user.findFirst({
			columns: {
				id: true,
				role: true,
				twoFactorEnabled: true
			},
			where: (user, { eq }) => eq(user.id, userId)
		}),
		db.query.account.findFirst({
			columns: {
				password: true
			},
			where: (account, { and, eq }) =>
				and(eq(account.userId, userId), eq(account.providerId, 'credential'))
		})
	]);

	return {
		twoFactorEnabled: Boolean(userRecord?.twoFactorEnabled),
		hasPassword: Boolean(credentialAccount?.password)
	};
};

export const requireAdminSessionForSetup = (user: AdminUserRecord | null, pathname: string) => {
	const adminUserIds = parseAdminUserIds(process.env.ADMIN_USER_IDS);
	if (!isAdminUser(user, adminUserIds)) {
		redirect(303, localizePathname('/', getLocalePrefix(pathname) ?? 'ja'));
	}
};
