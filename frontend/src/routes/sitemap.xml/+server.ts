import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const body =
		`<?xml version="1.0" encoding="UTF-8"?>\n` +
		`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
		`  <url><loc>${url.origin}/</loc></url>\n` +
		`</urlset>\n`;
	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'public, max-age=86400'
		}
	});
};
