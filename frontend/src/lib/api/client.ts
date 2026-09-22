import createClient from 'openapi-fetch';
import type { paths } from './schema.js';
import { env } from '$env/dynamic/private';

// Factory so server load/actions can inject SvelteKit's `fetch`.
//
// `cookie` must be the incoming request's cookie header. SvelteKit only auto-forwards cookies to
// a backend when its hostname matches the app's, so every server-side call has to forward them
// explicitly — otherwise the backend sees no session and answers 401.
//
// We are overwriting SvelteKit's default functionality here.
//
// Do not use the client to communicate with an external api. They will get our cookies.
export function createApiClient(customFetch?: typeof fetch, cookie?: string | null) {
	return createClient<paths>({
		baseUrl: env.INTERNAL_API_URL ?? 'http://localhost:3001',
		fetch: customFetch ?? fetch,
		credentials: 'include',
		...(cookie ? { headers: { cookie } } : {})
	});
}

export type ApiClient = ReturnType<typeof createApiClient>;

// Default singleton
export const api = createApiClient();

export type { paths };
