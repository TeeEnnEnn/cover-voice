import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { createApiClient } from '$lib/api/client';
import { requireUser } from '$lib/server/auth';

/** Extracts the backend's error message ({ error: { message } }) when present. */
function apiMessage(err: unknown): string | null {
	if (typeof err === 'object' && err !== null && 'error' in err) {
		const nested = (err as { error?: { message?: unknown } }).error;
		if (nested && typeof nested.message === 'string' && nested.message.length > 0) {
			return nested.message;
		}
	}
	return null;
}

function failWithApiError(action: string, err: unknown, fallback: string) {
	const message = apiMessage(err) ?? fallback;
	const status = /already exists/i.test(message) ? 409 : 400;
	return fail(status, { action, message });
}

export const load: PageServerLoad = async ({ params, fetch, request }) => {
	const cookie = request.headers.get('cookie');
	const user = await requireUser(fetch, cookie);
	const api = createApiClient(fetch, cookie);
	const letterId = params.id;

	const [letterResult, blockResult, variableResult, overrideResult] = await Promise.all([
		api.GET('/api/letters/{id}', { params: { path: { id: letterId } } }),
		api.GET('/api/blocks'),
		api.GET('/api/variables'),
		api.GET('/api/letters/{id}/overrides', { params: { path: { id: letterId } } })
	]);

	if (letterResult.error) {
		throw error(404, 'Letter not found');
	}

	return {
		user,
		letter: letterResult.data,
		blocks: blockResult.data?.blocks ?? [],
		blockError: blockResult.error ? 'Failed to load blocks' : null,
		variables: variableResult.data?.variables ?? [],
		variableError: variableResult.error ? 'Failed to load variables' : null,
		overrides: overrideResult.data?.overrides ?? [],
		overrideError: overrideResult.error ? 'Failed to load per-letter values' : null
	};
};

export const actions = {
	newBlock: async ({ request, fetch }) => {
		await requireUser(fetch, request.headers.get('cookie'));
		const formData = await request.formData();
		const blockName = formData.get('blockName')?.toString().trim();
		const blockValue = formData.get('blockValue')?.toString().trim();

		if (!blockName || !blockValue) {
			return fail(400, { action: 'newBlock', message: 'Block name and value are required.' });
		}

		const api = createApiClient(fetch, request.headers.get('cookie'));
		const { data, error: err } = await api.POST('/api/blocks', {
			body: {
				name: blockName,
				value: blockValue
			}
		});

		if (err) {
			return failWithApiError('newBlock', err, 'Failed to create block.');
		}
		return { action: 'newBlock' as const, success: true, newBlock: data, message: '' };
	},
	newVariable: async ({ request, fetch }) => {
		await requireUser(fetch, request.headers.get('cookie'));
		const formData = await request.formData();
		const variableName = formData.get('variableName')?.toString().trim();
		const variableValue = formData.get('variableValue')?.toString().trim();

		if (!variableName || !variableValue) {
			return fail(400, { action: 'newVariable', message: 'Variable name and value are required.' });
		}

		const api = createApiClient(fetch, request.headers.get('cookie'));
		const { data, error: err } = await api.POST('/api/variables', {
			body: {
				name: variableName,
				value: variableValue
			}
		});

		if (err) {
			return failWithApiError('newVariable', err, 'Failed to create variable.');
		}
		return { action: 'newVariable' as const, success: true, newVariable: data, message: '' };
	}
} satisfies Actions;
