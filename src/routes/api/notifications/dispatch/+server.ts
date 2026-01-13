import {
	dispatchSubscriptionNotifications,
	dispatchTrialEndingEmails
} from '$lib/server/notifications';
import { error, json } from '@sveltejs/kit';

const getAuthToken = (request: Request) => {
	const header = request.headers.get('authorization') ?? '';
	if (header.startsWith('Bearer ')) return header.slice('Bearer '.length);
	return null;
};

export const POST = async ({ request, locals: { db } }) => {
	const secret = process.env.PUSH_CRON_SECRET;
	if (!secret) {
		error(500, 'PUSH_CRON_SECRET is not configured');
	}

	if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
		console.warn('[notifications] VAPID keys are not configured; push disabled.');
	}

	const token = getAuthToken(request);
	if (token !== secret) {
		error(401, 'unauthorized request');
	}

	if (!db) {
		error(500, 'Database not available');
	}

	const [pushResult, trialResult] = await Promise.all([
		dispatchSubscriptionNotifications(db),
		dispatchTrialEndingEmails(db)
	]);

	return json({ push: pushResult, trial: trialResult });
};
