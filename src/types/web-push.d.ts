declare module 'web-push' {
	type PushSubscription = {
		endpoint: string;
		expirationTime?: number | null;
		keys: {
			p256dh: string;
			auth: string;
		};
	};

	type VapidDetails = {
		subject: string;
		publicKey: string;
		privateKey: string;
	};

	type RequestDetails = {
		endpoint: string;
		method: string;
		headers: Record<string, string>;
		body?: string | Uint8Array;
	};

	const webPush: {
		generateRequestDetails: (
			subscription: PushSubscription,
			payload?: string,
			options?: { vapidDetails?: VapidDetails; TTL?: number }
		) => RequestDetails;
	};

	export default webPush;
}
