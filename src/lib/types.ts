import { subscription, user } from './server/db/schema';

export type TUser = typeof user.$inferSelect;
export type TSubscription = typeof subscription.$inferSelect;
//  export type TUserWithAddress = TUser & { addresses: TAddress[] }
