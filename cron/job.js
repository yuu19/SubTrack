// cron/job.js
/* global worker_default */
// https://github.com/sveltejs/kit/issues/4841#issuecomment-3290611044

/**
 * @param {import('@cloudflare/workers-types').ScheduledController} controller
 * @param {{ PUSH_CRON_SECRET?: string; PUSH_CRON_URL?: string }} env
 * @param {import('@cloudflare/workers-types').ExecutionContext} ctx
 */
worker_default.scheduled = async (controller, env, ctx) => {
	if (!env.PUSH_CRON_SECRET) {
		console.error('[cron]', controller.cron, 'PUSH_CRON_SECRET is not configured');
		return;
	}

	if (!env.PUSH_CRON_URL) {
		console.error('[cron]', controller.cron, 'PUSH_CRON_URL is not configured');
		return;
	}

	let url;
	try {
		url = new URL(env.PUSH_CRON_URL);
	} catch (error) {
		console.error('[cron]', controller.cron, 'PUSH_CRON_URL is invalid', error);
		return;
	}
	const req = new Request(url, {
		method: 'POST',
		headers: {
			authorization: `Bearer ${env.PUSH_CRON_SECRET}`
		}
	});

	try {
		const res = await worker_default.fetch(req, env, ctx);
		if (!res.ok) {
			console.error('[cron]', controller.cron, 'dispatch failed', res.status, res.statusText);
			return;
		}
		console.log('[cron]', controller.cron, 'dispatch ok', res.status);
	} catch (error) {
		console.error('[cron]', controller.cron, 'dispatch failed', error);
	}
};
