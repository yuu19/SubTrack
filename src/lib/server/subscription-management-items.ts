import { and, eq } from 'drizzle-orm';
import {
	PAYMENT_METHOD_TYPES,
	SUBSCRIPTION_CATEGORY_KEYS,
	type AppLocale,
	type PaymentMethodType,
	type SubscriptionCategoryKey
} from '$lib/constant';
import {
	trackedSubscriptionTable,
	subscriptionCategoryTable,
	subscriptionPaymentMethodTable
} from '$lib/server/db/schema';
import { listActiveEntitlementsForUser } from '$lib/server/entitlements';
import { getCurrentPlan } from '$lib/server/plan';
import type { SubscriptionColor } from '$lib/subscription-colors';

export const FREE_MANAGEMENT_ITEM_LIMIT = 3;

type Db = NonNullable<App.Locals['db']>;

type DefaultCategory = {
	key: SubscriptionCategoryKey;
	name: Record<AppLocale, string>;
	color: SubscriptionColor;
};

type DefaultPaymentMethod = {
	name: Record<AppLocale, string>;
	type: PaymentMethodType;
};

export const defaultSubscriptionCategories: DefaultCategory[] = [
	{ key: 'video', name: { ja: '動画', en: 'Video' }, color: 'red' },
	{ key: 'music', name: { ja: '音楽', en: 'Music' }, color: 'green' },
	{ key: 'work', name: { ja: '仕事', en: 'Work' }, color: 'blue' }
];

export const defaultSubscriptionPaymentMethods: DefaultPaymentMethod[] = [
	{ type: 'credit_card', name: { ja: 'クレジットカード', en: 'Credit card' } },
	{ type: 'app_store', name: { ja: 'Apple / Google', en: 'Apple / Google' } },
	{ type: 'other', name: { ja: 'その他', en: 'Other' } }
];

export const getPaymentMethodTypeLabel = (type: string | null | undefined, locale: AppLocale) => {
	const labels: Record<PaymentMethodType, Record<AppLocale, string>> = {
		credit_card: { ja: 'クレジットカード', en: 'Credit card' },
		app_store: { ja: 'Apple / Google', en: 'Apple / Google' },
		other: { ja: 'その他', en: 'Other' }
	};
	return labels[resolvePaymentMethodType(type)][locale];
};

export const resolvePaymentMethodType = (value: string | null | undefined): PaymentMethodType =>
	PAYMENT_METHOD_TYPES.includes(value as PaymentMethodType)
		? (value as PaymentMethodType)
		: 'other';

export const resolveSubscriptionCategoryKey = (
	value: string | null | undefined
): SubscriptionCategoryKey | null =>
	SUBSCRIPTION_CATEGORY_KEYS.includes(value as SubscriptionCategoryKey)
		? (value as SubscriptionCategoryKey)
		: null;

export const listSubscriptionCategories = (db: Db, userId: string) =>
	db.query.subscriptionCategoryTable.findMany({
		where: (category, { eq }) => eq(category.userId, userId),
		orderBy: (category, { asc }) => asc(category.createdAt)
	});

export const listSubscriptionPaymentMethods = (db: Db, userId: string) =>
	db.query.subscriptionPaymentMethodTable.findMany({
		where: (paymentMethod, { eq }) => eq(paymentMethod.userId, userId),
		orderBy: (paymentMethod, { asc }) => asc(paymentMethod.createdAt)
	});

export const seedDefaultSubscriptionManagementItems = async (
	db: Db,
	userId: string,
	locale: AppLocale
) => {
	const [categories, paymentMethods] = await Promise.all([
		listSubscriptionCategories(db, userId),
		listSubscriptionPaymentMethods(db, userId)
	]);

	if (categories.length === 0) {
		await db.insert(subscriptionCategoryTable).values(
			defaultSubscriptionCategories.map((category) => ({
				userId,
				key: category.key,
				name: category.name[locale],
				color: category.color
			}))
		);
	}

	if (paymentMethods.length === 0) {
		await db.insert(subscriptionPaymentMethodTable).values(
			defaultSubscriptionPaymentMethods.map((paymentMethod) => ({
				userId,
				name: paymentMethod.name[locale],
				type: paymentMethod.type
			}))
		);
	}
};

export const listSubscriptionManagementItems = async (db: Db, userId: string) => {
	const [categories, paymentMethods] = await Promise.all([
		listSubscriptionCategories(db, userId),
		listSubscriptionPaymentMethods(db, userId)
	]);
	return { categories, paymentMethods };
};

export const resolveCurrentPlanForUser = async (db: Db, userId: string) => {
	const billingSubscriptions = await db.query.subscription.findMany({
		where: (subscription, { eq }) => eq(subscription.referenceId, userId)
	});
	const entitlements = await listActiveEntitlementsForUser(db, userId);
	const { currentPlan } = getCurrentPlan(billingSubscriptions, entitlements);
	return currentPlan;
};

export const hasReachedFreeCategoryLimit = async (db: Db, userId: string) => {
	const categories = await db.query.subscriptionCategoryTable.findMany({
		columns: { id: true },
		where: (category, { eq }) => eq(category.userId, userId),
		limit: FREE_MANAGEMENT_ITEM_LIMIT
	});
	return categories.length >= FREE_MANAGEMENT_ITEM_LIMIT;
};

export const hasReachedFreePaymentMethodLimit = async (db: Db, userId: string) => {
	const paymentMethods = await db.query.subscriptionPaymentMethodTable.findMany({
		columns: { id: true },
		where: (paymentMethod, { eq }) => eq(paymentMethod.userId, userId),
		limit: FREE_MANAGEMENT_ITEM_LIMIT
	});
	return paymentMethods.length >= FREE_MANAGEMENT_ITEM_LIMIT;
};

export const getOwnedCategoryId = async (db: Db, userId: string, categoryId: number | null) => {
	if (categoryId === null) return null;
	const category = await db.query.subscriptionCategoryTable.findFirst({
		columns: { id: true },
		where: (category, { and, eq }) => and(eq(category.id, categoryId), eq(category.userId, userId))
	});
	return category?.id ?? null;
};

export const getOwnedPaymentMethodId = async (
	db: Db,
	userId: string,
	paymentMethodId: number | null
) => {
	if (paymentMethodId === null) return null;
	const paymentMethod = await db.query.subscriptionPaymentMethodTable.findFirst({
		columns: { id: true },
		where: (paymentMethod, { and, eq }) =>
			and(eq(paymentMethod.id, paymentMethodId), eq(paymentMethod.userId, userId))
	});
	return paymentMethod?.id ?? null;
};

export const deleteOwnedCategory = async (db: Db, userId: string, categoryId: number) => {
	await db
		.update(trackedSubscriptionTable)
		.set({ categoryId: null })
		.where(
			and(
				eq(trackedSubscriptionTable.userId, userId),
				eq(trackedSubscriptionTable.categoryId, categoryId)
			)
		);
	return db
		.delete(subscriptionCategoryTable)
		.where(
			and(
				eq(subscriptionCategoryTable.id, categoryId),
				eq(subscriptionCategoryTable.userId, userId)
			)
		);
};

export const deleteOwnedPaymentMethod = async (db: Db, userId: string, paymentMethodId: number) => {
	await db
		.update(trackedSubscriptionTable)
		.set({ paymentMethodId: null })
		.where(
			and(
				eq(trackedSubscriptionTable.userId, userId),
				eq(trackedSubscriptionTable.paymentMethodId, paymentMethodId)
			)
		);
	return db
		.delete(subscriptionPaymentMethodTable)
		.where(
			and(
				eq(subscriptionPaymentMethodTable.id, paymentMethodId),
				eq(subscriptionPaymentMethodTable.userId, userId)
			)
		);
};
