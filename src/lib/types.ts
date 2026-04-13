import { subscription, user, userEntitlement } from './server/db/schema';

export type TUser = typeof user.$inferSelect;
export type TSubscription = typeof subscription.$inferSelect;
export type TUserEntitlement = typeof userEntitlement.$inferSelect;
//  export type TUserWithAddress = TUser & { addresses: TAddress[] }
