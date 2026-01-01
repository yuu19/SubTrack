// import worker from './.svelte-kit/cloudflare/_worker.js';
// import { createDb } from './src/lib/server/db';
// import { dispatchSubscriptionNotifications } from './src/lib/server/notifications';

// type Env = {
// 	DB: D1Database;
// };

// export default {
// 	fetch: worker.fetch,
// 	async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
// 		ctx.waitUntil(
// 			(async () => {
// 				const db = createDb(env.DB);
// 				const result = await dispatchSubscriptionNotifications(db);
// 				console.log('[cron]', controller.cron, result);
// 			})().catch((error) => {
// 				console.error('[cron] dispatch failed', error);
// 			})
// 		);
// 	}
// };
