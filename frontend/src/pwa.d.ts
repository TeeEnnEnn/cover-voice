declare module 'virtual:pwa-register/svelte' {
	import type { Readable } from 'svelte/store';
	export function useRegisterSW(options?: { immediate?: boolean }): {
		needRefresh: Readable<boolean>;
		offlineReady: Readable<boolean>;
		updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
	};
}
