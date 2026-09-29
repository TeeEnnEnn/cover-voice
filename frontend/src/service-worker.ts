/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst, NetworkOnly } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & {
	__WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Documents: network first so redirects and fresh pages work normally;
// the precached offline page is served only when the network fails.
// API traffic is excluded here (it has its own rules below).
registerRoute(
	new NavigationRoute(
		async ({ request }) => {
			try {
				return await fetch(request);
			} catch {
				// The PWA plugin strips `.html` from precached URLs
				// (offline.html is cached as `offline`); ignore the revision
				// query as well.
				const cached = await caches.match('offline', { ignoreSearch: true });
				if (cached) return cached;
				throw new Error('offline and no fallback cached');
			}
		},
		{ denylist: [/^\/api/] }
	)
);

// Never cache file downloads.
registerRoute(({ url }) => url.pathname.endsWith('/export'), new NetworkOnly(), 'GET');

// API reads: fresh when possible, briefly stale when offline. Mutations
// (POST/PATCH/DELETE) never match a GET-only route, so they are never cached.
registerRoute(
	({ request, url }) => request.method === 'GET' && url.pathname.startsWith('/api/'),
	new NetworkFirst({
		cacheName: 'api-get',
		networkTimeoutSeconds: 5,
		plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 5 * 60 })]
	}),
	'GET'
);
