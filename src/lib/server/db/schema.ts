import { sql } from 'drizzle-orm';
import { ROLE, THEMES } from '../../constant';
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const timestamps = {
	updatedAt: integer('updated_at', {
		mode: 'timestamp_ms'
	})
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull()
		.$onUpdate(() => new Date()),
	createdAt: integer('created_at', {
		mode: 'timestamp_ms'
	})
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull()
};
export function array<T>(name: string) {
	return text(name, { mode: 'json' }).$type<T[]>();
}

export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: integer('email_verified', {
		mode: 'boolean'
	})
		.default(false)
		.notNull(),
	image: text('image'),
	createdAt: integer('created_at', {
		mode: 'timestamp_ms'
	})
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer('updated_at', {
		mode: 'timestamp_ms'
	})
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => new Date())
		.notNull(),
	role: text('role', { enum: ROLE }).default('user'),
	activeTheme: text('active_theme', { enum: THEMES }).notNull().default('default'),
	banned: integer('banned', {
		mode: 'boolean'
	}).default(false),
	banReason: text('ban_reason'),
	banExpires: integer('ban_expires', {
		mode: 'timestamp_ms'
	}),
	stripeCustomerId: text('stripe_customer_id')
});

export const session = sqliteTable(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: integer('expires_at', {
			mode: 'timestamp_ms'
		}).notNull(),
		token: text('token').notNull().unique(),
		createdAt: integer('created_at', {
			mode: 'timestamp_ms'
		})
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', {
			mode: 'timestamp_ms'
		})
			.$onUpdate(() => new Date())
			.notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		impersonatedBy: text('impersonated_by')
	},
	(table) => [index('session_userId_idx').on(table.userId)]
);

export const account = sqliteTable(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: integer('access_token_expires_at', {
			mode: 'timestamp_ms'
		}),
		refreshTokenExpiresAt: integer('refresh_token_expires_at', {
			mode: 'timestamp_ms'
		}),
		scope: text('scope'),
		password: text('password'),
		createdAt: integer('created_at', {
			mode: 'timestamp_ms'
		})
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', {
			mode: 'timestamp_ms'
		})
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('account_userId_idx').on(table.userId)]
);

export const verification = sqliteTable(
	'verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: integer('expires_at', {
			mode: 'timestamp_ms'
		}).notNull(),
		createdAt: integer('created_at', {
			mode: 'timestamp_ms'
		})
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', {
			mode: 'timestamp_ms'
		})
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('verification_identifier_idx').on(table.identifier)]
);

export const subscription = sqliteTable('subscription', {
	id: text('id').primaryKey(),
	plan: text('plan').notNull(),
	referenceId: text('reference_id').notNull(),
	stripeCustomerId: text('stripe_customer_id'),
	stripeSubscriptionId: text('stripe_subscription_id'),
	status: text('status').default('incomplete'),
	periodStart: integer('period_start', { mode: 'timestamp_ms' }),
	periodEnd: integer('period_end', { mode: 'timestamp_ms' }),
	trialStart: integer('trial_start', { mode: 'timestamp_ms' }),
	trialEnd: integer('trial_end', { mode: 'timestamp_ms' }),
	cancelAtPeriodEnd: integer('cancel_at_period_end', {
		mode: 'boolean'
	}).default(false),
	seats: integer('seats')
});


export const trackedSubscriptionTable = sqliteTable('tracked_subscription', {
	id: integer('id').primaryKey(),
	userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
	serviceName: text('service_name').notNull(),
	cycle: text('cycle').notNull(),
	amount: integer('amount').notNull(),
	firstPaymentDate: text('first_payment_date').notNull(),
	nextBillingAt: text('next_billing_at').notNull(),
	daysUntilNextBilling: integer('days_until_next_billing').notNull(),
	notifyDaysBefore: integer('notify_days_before').notNull().default(1),
	lastNotifiedAt: integer('last_notified_at', { mode: 'timestamp_ms' }),
	tags: array<string>('tags').notNull(),
	...timestamps
});

export const pushSubscriptionTable = sqliteTable(
	'push_subscription',
	{
		id: integer('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		endpoint: text('endpoint').notNull(),
		p256dh: text('p256dh').notNull(),
		auth: text('auth').notNull(),
		expirationTime: integer('expiration_time', { mode: 'timestamp_ms' }),
		userAgent: text('user_agent'),
		...timestamps
	},
	(t) => ({
		userIdx: index('push_subscription_user_idx').on(t.userId),
		endpointIdx: index('push_subscription_endpoint_idx').on(t.endpoint)
	})
);
