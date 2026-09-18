import { redirect } from '@sveltejs/kit';
import { createApiClient } from '$lib/api/client';

/**
 * Server-side auth guard. Call at the top of `load` or `actions` to
 * redirect anonymous users to sign-in.
 *
 * Uses the backend `/api/me` endpoint. Pass the incoming request's cookie
 * header — SvelteKit does not reliably forward cookies to the backend on its
 * own (cross-origin hostnames like `backend:3001` get no cookies), so without
 * it the backend always answers 401 and this always redirects.
 */
export async function requireUser(
	svelteFetch: typeof fetch,
	cookie?: string | null,
	loginPath = '/signin'
) {
	const api = createApiClient(svelteFetch, cookie);
	const { data, error } = await api.GET('/api/me');

	if (error || !data?.user) {
		throw redirect(303, loginPath);
	}

	return data.user;
}

/**
 * Ensure that the user is not logged in. If they are redirect them to loggedInPath
 * @param svelteFetch the svelte fetch function from server functions
 * @param cookie the incoming request's cookie header (`request.headers.get('cookie')`)
 * @param loggedInPath the path to redirect the user to if they are already logged in
 */
export async function requireNoUser(
	svelteFetch: typeof fetch,
	cookie?: string | null,
	loggedInPath = '/me'
): Promise<void> {
	const api = createApiClient(svelteFetch, cookie);
	const { data } = await api.GET('/api/me');
	if (data?.user) {
		throw redirect(302, loggedInPath);
	}
}

export async function getCurrentUser(svelteFetch: typeof fetch, cookie?: string | null) {
	const api = createApiClient(svelteFetch, cookie);
	const { data } = await api.GET('/api/me');
	return data?.user ?? null;
}
