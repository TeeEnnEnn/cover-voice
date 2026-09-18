import type { PageServerLoad } from './$types';
import { requireNoUser } from '$lib/server/auth.js';

export const load: PageServerLoad = async ({ fetch, request }) => {
  console.log(request.headers.get('cookie'));
	await requireNoUser(fetch, request.headers.get('cookie')); // if there is a user redirect them to /me
};
