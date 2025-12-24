/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `cache-${version}`;
const ASSETS = [...build, ...files];

sw.addEventListener('install', (event) => {
	const addAssets = async () => {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	};

	event.waitUntil(addAssets());
});

sw.addEventListener('activate', (event) => {
	const clearOldCaches = async () => {
		const keys = await caches.keys();
		await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
	};

	event.waitUntil(clearOldCaches());
});

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const respond = async () => {
		const url = new URL(event.request.url);
		const cache = await caches.open(CACHE);

		if (ASSETS.includes(url.pathname)) {
			const cached = await cache.match(url.pathname);
			if (cached) return cached;
		}

		try {
			const response = await fetch(event.request);
			if (!(response instanceof Response)) {
				throw new Error('Invalid response');
			}
			if (response.status === 200) {
				cache.put(event.request, response.clone());
			}
			return response;
		} catch (error) {
			const cached = await cache.match(event.request);
			if (cached) return cached;
			throw error;
		}
	};

	event.respondWith(respond());
});

sw.addEventListener('push', (event) => {
	let payload: Record<string, unknown> = {};
	try {
		payload = event.data ? (event.data.json() as Record<string, unknown>) : {};
	} catch {
		payload = {};
	}
	const title = typeof payload.title === 'string' ? payload.title : 'サブスク通知';
	const options: NotificationOptions = {
		body: typeof payload.body === 'string' ? payload.body : undefined,
		icon: typeof payload.icon === 'string' ? payload.icon : '/favicon.png',
		tag: typeof payload.tag === 'string' ? payload.tag : undefined,
		data:
			typeof payload.data === 'object' && payload.data
				? payload.data
				: { url: '/subscriptions' }
	};

	event.waitUntil(sw.registration.showNotification(title, options));
});

sw.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const rawUrl =
		(event.notification.data as { url?: string } | undefined)?.url ?? '/subscriptions';
	const targetUrl = new URL(rawUrl, sw.location.origin).toString();
	const targetPath = new URL(targetUrl).pathname;

	event.waitUntil(
		sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
			for (const client of clients) {
				if ('focus' in client) {
					const clientUrl = new URL(client.url);
					if (clientUrl.pathname === targetPath) {
						return client.focus();
					}
				}
			}
			return sw.clients.openWindow(targetUrl);
		})
	);
});
