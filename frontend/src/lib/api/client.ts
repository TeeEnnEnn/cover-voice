import createClient from 'openapi-fetch';
import type { paths } from './schema.js';

// Factory so server load/actions can inject SvelteKit's `fetch`
export function createApiClient(customFetch?: typeof fetch) {
	return createClient<paths>({
		baseUrl: '',
		fetch: customFetch ?? fetch,
		credentials: 'include'
	});
}

export type ApiClient = ReturnType<typeof createApiClient>;

// Default singleton
export const api = createApiClient();

export type { paths };
