import type { PageServerLoad } from './$types';

// Origin of the current request, used for absolute SEO URLs (canonical,
// Open Graph). Keeps deploys on any domain correct without configuration.
export const load: PageServerLoad = async ({ url }) => {
	return { origin: url.origin };
};
