import type { TCart, TCartItem, TPlan, TSubscription, TSubscriptionPlan, TUser } from '$lib/types';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

// for information about these interfaces
type Schema = typeof import('./lib/server/db/schema');
declare global {
	namespace App {
		interface Platform {
			env: {
				DB: D1Database;
				BUCKET: R2Bucket;
				kv: KVNamespace;
			};
			cf: CfProperties;
			ctx: ExecutionContext;
		}

		interface Locals {
			db: DrizzleD1Database<Schema> | BetterSQLite3Database<Schema>;
			bucket: R2Bucket;
		}
		interface PageData {
			user: TUser & {
				cart?: TCart & {
					cartItems?: (TCartItem & { plan: TPlan })[];
				};
				subscriptions?: (TSubscription & {
					subscriptionPlans?: (TSubscriptionPlan & { plan: TPlan })[];
				})[];
			};
		}
		namespace Superforms {
			type Message = {
				type: 'error' | 'success';
				text: string;
			};
		}
	}
}

export {};
