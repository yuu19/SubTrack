import { user } from './server/db/schema';

export type TUser = typeof user.$inferSelect;
//  export type TUserWithAddress = TUser & { addresses: TAddress[] }
