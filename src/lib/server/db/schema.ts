import { ROLE, SUBSCRIPTION_STATUS, THEMES } from '../../constant';
import { relations, sql } from 'drizzle-orm';
import { sqliteTable, text, integer, primaryKey, check, index } from 'drizzle-orm/sqlite-core';
import { nanoid } from 'nanoid';
// ;
export const timestamps = {
	updatedAt: integer('updated_at', {
		mode: 'timestamp'
	})
		.notNull()
		.$onUpdate(() => new Date()),
	createdAt: integer('created_at', {
		mode: 'timestamp'
	})
		.notNull()
		.$default(() => new Date())
};
export function array<T>(name: string) {
	return text(name, { mode: 'json' }).$type<T[]>();
}

export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: integer('emailVerified', {
		mode: 'boolean'
	}).notNull(),
	image: text('image'),
	createdAt: integer('createdAt', {
		mode: 'timestamp'
	}).notNull(),
	updatedAt: integer('updatedAt', {
		mode: 'timestamp'
	}).notNull(),
	role: text('role', { enum: ROLE }).default('user'),
	activeTheme: text('activeTheme', { enum: THEMES }).notNull().default('default'),
	banned: integer('banned', {
		mode: 'boolean'
	}),
	banReason: text('banReason'),
	banExpires: integer('banExpires', {
		mode: 'timestamp'
	})
});

export const session = sqliteTable('session', {
	id: text('id').primaryKey(),
	expiresAt: integer('expiresAt', {
		mode: 'timestamp'
	}).notNull(),
	token: text('token').notNull().unique(),
	createdAt: integer('createdAt', {
		mode: 'timestamp'
	}).notNull(),
	updatedAt: integer('updatedAt', {
		mode: 'timestamp'
	}).notNull(),
	ipAddress: text('ipAddress'),
	userAgent: text('userAgent'),
	userId: text('userId')
		.notNull()
		.references(() => user.id),
	impersonatedBy: text('impersonatedBy')
});

export const account = sqliteTable('account', {
	id: text('id').primaryKey(),
	accountId: text('accountId').notNull(),
	providerId: text('providerId').notNull(),
	userId: text('userId')
		.notNull()
		.references(() => user.id),
	accessToken: text('accessToken'),
	refreshToken: text('refreshToken'),
	idToken: text('idToken'),
	accessTokenExpiresAt: integer('accessTokenExpiresAt', {
		mode: 'timestamp'
	}),
	refreshTokenExpiresAt: integer('refreshTokenExpiresAt', {
		mode: 'timestamp'
	}),
	scope: text('scope'),
	password: text('password'),
	createdAt: integer('createdAt', {
		mode: 'timestamp'
	}).notNull(),
	updatedAt: integer('updatedAt', {
		mode: 'timestamp'
	}).notNull()
});

export const verification = sqliteTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: integer('expiresAt', {
		mode: 'timestamp'
	}).notNull(),
	createdAt: integer('createdAt', {
		mode: 'timestamp'
	}),
	updatedAt: integer('updatedAt', {
		mode: 'timestamp'
	})
});

export const planGroupTable = sqliteTable('plan_group', {
	id: integer('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	billingIntervals: array<string>('billing_intervals').notNull(),
	...timestamps
});

export const planTable = sqliteTable(
	'plan',
	{
		id: integer('id').primaryKey(),
		name: text('name').notNull(),
		description: text('description').notNull(),
		planGroupId: integer('plan_group_id')
			.notNull()
			.references(() => planGroupTable.id, { onDelete: 'cascade' }),
		billingInterval: text('billing_interval').notNull(),
		price: integer('price').notNull(),
		seatLimit: integer('seat_limit').notNull(),
		images: array<{ fileUrl: string; key: string }>('images').notNull(),
		slug: text('slug').unique().notNull(),
		sku: text('sku').$default(() => `SKU-${nanoid(8)}`),
		adminId: text('admin_id')
			.references(() => user.id)
			.notNull(),
		...timestamps
	},
	(t) => {
		return {
			nameIdx: index('name_idx').on(t.name),
			descIdx: index('desc_idx').on(t.description)
		};
	}
);
export const addressTable = sqliteTable('address', {
	id: integer('id').primaryKey(),
	label: text('label').notNull(),
	address: text('address').notNull(),
	state: text('state'),
	country: text('country').notNull(),
	isDefaultShipping: integer('is_default_shipping', { mode: 'boolean' }).notNull(),
	isDefaultBilling: integer('is_default_billing', { mode: 'boolean' }).notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	...timestamps
});
export const cartTable = sqliteTable('cart', {
	id: integer('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	...timestamps
});
export const cartItemTable = sqliteTable(
	'cart_item',
	{
		cartId: integer('cart_id')
			.notNull()
			.references(() => cartTable.id, { onDelete: 'cascade' }),
		planId: integer('plan_id')
			.notNull()
			.references(() => planTable.id, { onDelete: 'cascade' }),
		quantity: integer('quantity').notNull().default(1),

		priceAtTimeOfAddition: integer('price_at_addition').notNull(),
		...timestamps
	},
	(table) => ({
		// Ensure unique combination of cart and plan to prevent duplicate entries
		pk: primaryKey({ columns: [table.cartId, table.planId] })
	})
);

export const subscriptionTable = sqliteTable('subscription', {
	id: integer('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	status: text('status', { enum: SUBSCRIPTION_STATUS }).notNull(),
	amount: integer('amount').notNull(),
	addressId: integer('address_id').references(() => addressTable.id),
	code: text('code')
		.notNull()
		.$default(() => nanoid(8)),

	...timestamps
});
// Subscription to Plan junction table
export const subscriptionPlanTable = sqliteTable(
	'subscription_plan',
	{
		subscriptionId: integer('subscription_id')
			.notNull()
			.references(() => subscriptionTable.id, { onDelete: 'cascade' }),
		planId: integer('plan_id')
			.notNull()
			.references(() => planTable.id, { onDelete: 'cascade' }),
		quantity: integer('quantity').notNull().default(1),
		// Optional: Add any additional fields specific to this subscription-plan relationship
		...timestamps
	},
	(t) => ({
		pk: primaryKey({ columns: [t.subscriptionId, t.planId] })
	})
);

// Relationships
export const subscriptionRelations = relations(subscriptionTable, ({ many, one }) => ({
	user: one(user, {
		fields: [subscriptionTable.userId],
		references: [user.id]
	}),
	subscriptionPlans: many(subscriptionPlanTable)
}));

export const planRelations = relations(planTable, ({ many, one }) => ({
	subscriptionPlans: many(subscriptionPlanTable),
	planGroup: one(planGroupTable, {
		fields: [planTable.planGroupId],
		references: [planGroupTable.id]
	})
}));

export const subscriptionPlanRelations = relations(subscriptionPlanTable, ({ one }) => ({
	subscription: one(subscriptionTable, {
		fields: [subscriptionPlanTable.subscriptionId],
		references: [subscriptionTable.id]
	}),
	plan: one(planTable, {
		fields: [subscriptionPlanTable.planId],
		references: [planTable.id]
	})
}));
export const userRelation = relations(user, ({ many, one }) => ({
	addresses: many(addressTable),
	cart: one(cartTable),
	subscriptions: many(subscriptionTable)
}));

export const addressRelations = relations(addressTable, ({ one }) => ({
	user: one(user, {
		fields: [addressTable.userId],
		references: [user.id]
	})
}));
export const cartRelations = relations(cartTable, ({ many, one }) => ({
	user: one(user, {
		fields: [cartTable.userId],
		references: [user.id]
	}),
	cartItems: many(cartItemTable)
}));

export const cartItemRelations = relations(cartItemTable, ({ one }) => ({
	cart: one(cartTable, {
		fields: [cartItemTable.cartId],
		references: [cartTable.id]
	}),
	plan: one(planTable, {
		fields: [cartItemTable.planId],
		references: [planTable.id]
	})
}));

export const planGroupRelations = relations(planGroupTable, ({ many }) => ({
	plans: many(planTable)
}));

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
	lastNotifiedAt: integer('last_notified_at', { mode: 'timestamp' }),
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
		expirationTime: integer('expiration_time'),
		userAgent: text('user_agent'),
		...timestamps
	},
	(t) => ({
		userIdx: index('push_subscription_user_idx').on(t.userId),
		endpointIdx: index('push_subscription_endpoint_idx').on(t.endpoint)
	})
);
