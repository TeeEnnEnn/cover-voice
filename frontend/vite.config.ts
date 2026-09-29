import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			alias: {
				'@/*': './src/lib'
			},
			csrf: {
				trustedOrigins: ['http://localhost', 'http://localhost:3000', 'http://localhost:5173']
			}
		}),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			includeAssets: ['offline.html'],
			manifest: {
				name: 'Cover Voice',
				short_name: 'Cover Voice',
				description: 'Cover letters in your own voice',
				id: '/',
				start_url: '/',
				scope: '/',
				display: 'standalone',
				background_color: '#ffffff',
				theme_color: '#ffffff',
				icons: [
					{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
					{
						src: 'icons/icon-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable'
					}
				]
			},
			workbox: {
				// Offline navigations fall back to a static page; API traffic is
				// never served stale and mutations are never cached.
				navigateFallback: 'offline.html',
				navigateFallbackDenylist: [/^\/api/],
				runtimeCaching: [
					{
						// Never cache file downloads.
						urlPattern: ({ url }) => url.pathname.endsWith('/export'),
						handler: 'NetworkOnly'
					},
					{
						urlPattern: ({ request, url }) =>
							request.method === 'GET' && url.pathname.startsWith('/api/'),
						handler: 'NetworkFirst',
						options: {
							cacheName: 'api-get',
							expiration: { maxEntries: 100, maxAgeSeconds: 5 * 60 },
							networkTimeoutSeconds: 5
						}
					}
				]
			},
			devOptions: {
				enabled: false
			}
		})
	],
	server: {
		proxy: {
			'/api': 'http://localhost:3001'
		}
	},
	preview: {
		proxy: {
			// The preview server does not inherit `server.proxy`; keep it in sync so
			// `vite preview` (used by e2e tests) can reach the backend too.
			'/api': 'http://localhost:3001'
		}
	}
});
