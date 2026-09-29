import type { LayoutServerLoad } from './$types';
import { getCurrentUser } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ fetch, request }) => {
	const { user, backendDown } = await getCurrentUser(fetch, request.headers.get('cookie'));
	return { user, backendDown };
};
