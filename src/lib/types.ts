import {
	cartItemTable,
	cartTable,
	planGroupTable,
	planTable,
	subscriptionTable,
	subscriptionPlanTable,
	user
} from './server/db/schema';

export type TUser = typeof user.$inferSelect;
export type TCart = typeof cartTable.$inferSelect;
export type TCartItem = typeof cartItemTable.$inferSelect;
export type TPlan = typeof planTable.$inferSelect;
export type TPlanGroups = typeof planGroupTable.$inferSelect;
export type TSubscription = typeof subscriptionTable.$inferSelect;
export type TSubscriptionPlan = typeof subscriptionPlanTable.$inferSelect;
//  export type TUserWithAddress = TUser & { addresses: TAddress[] }
