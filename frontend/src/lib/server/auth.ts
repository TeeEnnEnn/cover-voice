import { redirect } from '@sveltejs/kit';
import { createApiClient } from '$lib/api/client';

/**
 * Server-side auth guard. Call at the top of `load` or `actions` to
 * redirect anonymous users to sign-in.
 *
 * Uses the backend `/api/me` endpoint via SvelteKit's `fetch` so cookies
 * are forwarded correctly during SSR.
 */
export async function requireUser(svelteFetch: typeof fetch, loginPath = '/signin') {
	const api = createApiClient(svelteFetch);
	const { data, error } = await api.GET('/api/me');

	if (error || !data?.user) {
		throw redirect(303, loginPath);
	}

	return data.user;
}
