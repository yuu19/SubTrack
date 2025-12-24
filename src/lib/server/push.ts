import webPush from 'web-push';

export type StoredPushSubscription = {
	endpoint: string;
	p256dh: string;
	auth: string;
	expirationTime?: number | null;
};

type VapidDetails = {
	subject: string;
	publicKey: string;
	privateKey: string;
};

const getVapidDetails = (): VapidDetails => {
	const publicKey = process.env.VAPID_PUBLIC_KEY ?? '';
	const privateKey = process.env.VAPID_PRIVATE_KEY ?? '';
	const subject = process.env.VAPID_SUBJECT ?? 'mailto:no-reply@example.com';

	if (!publicKey || !privateKey) {
		throw new Error('VAPID keys are not configured');
	}

	return { subject, publicKey, privateKey };
};

export const getVapidPublicKey = () => process.env.VAPID_PUBLIC_KEY ?? '';

export const sendWebPush = async (subscription: StoredPushSubscription, payload: object) => {
	const vapidDetails = getVapidDetails();
	const details = webPush.generateRequestDetails(
		{
			endpoint: subscription.endpoint,
			expirationTime: subscription.expirationTime ?? null,
			keys: {
				p256dh: subscription.p256dh,
				auth: subscription.auth
			}
		},
		JSON.stringify(payload),
		{
			TTL: 60 * 60 * 24,
			vapidDetails
		}
	);

	const response = await fetch(details.endpoint, {
		method: details.method,
		headers: details.headers,
		body: details.body
	});

	return response;
};
