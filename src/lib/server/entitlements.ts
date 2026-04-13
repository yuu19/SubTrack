import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './db/schema';

type Database = DrizzleD1Database<typeof schema> | BetterSQLite3Database<typeof schema>;

export const PREMIUM_LIFETIME_ENTITLEMENT_KEY = 'premium_lifetime';

export type UserEntitlementRecord = typeof schema.userEntitlement.$inferSelect;

export async function listActiveEntitlementsForUser(db: Database, userId: string) {
	return db.query.userEntitlement.findMany({
		where: (entitlement, { and, eq, isNull }) =>
			and(eq(entitlement.userId, userId), isNull(entitlement.revokedAt))
	});
}

export function hasActiveEntitlement(
	entitlements: UserEntitlementRecord[] | null | undefined,
	key: string
) {
	return Boolean(
		entitlements?.some((entitlement) => entitlement.key === key && !entitlement.revokedAt)
	);
}

export async function grantStripeCheckoutEntitlement(
	db: Database,
	{
		userId,
		key,
		stripeSessionId,
		stripePaymentIntentId,
		source = 'stripe_checkout',
		metadata
	}: {
		userId: string;
		key: string;
		stripeSessionId?: string | null;
		stripePaymentIntentId?: string | null;
		source?: string;
		metadata?: Record<string, unknown>;
	}
) {
	if (stripeSessionId) {
		const bySession = await db.query.userEntitlement.findFirst({
			where: (entitlement, { eq }) => eq(entitlement.stripeSessionId, stripeSessionId)
		});
		if (bySession) return bySession;
	}

	if (stripePaymentIntentId) {
		const byPaymentIntent = await db.query.userEntitlement.findFirst({
			where: (entitlement, { eq }) => eq(entitlement.stripePaymentIntentId, stripePaymentIntentId)
		});
		if (byPaymentIntent) return byPaymentIntent;
	}

	const duplicate = await db.query.userEntitlement.findFirst({
		where: (entitlement, { and, eq, isNull }) =>
			and(eq(entitlement.userId, userId), eq(entitlement.key, key), isNull(entitlement.revokedAt))
	});

	if (duplicate) return duplicate;

	const created = {
		id: crypto.randomUUID(),
		userId,
		key,
		source,
		stripeSessionId: stripeSessionId ?? null,
		stripePaymentIntentId: stripePaymentIntentId ?? null,
		grantedAt: new Date(),
		metadata: metadata ?? null
	} satisfies typeof schema.userEntitlement.$inferInsert;

	await db.insert(schema.userEntitlement).values(created);
	return created;
}
