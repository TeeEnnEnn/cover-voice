import type { PageServerLoad, Actions } from './$types';
import { requireUser } from '$lib/server/auth';
import { createApiClient } from '@/api/client';
import { fail } from '@sveltejs/kit';
import type { components } from '@/api/schema.js';

type Block = components['schemas']['Block'];
type Variable = components['schemas']['Variable'];
type Letter = components['schemas']['Letter'];
type BlockUsage = components['schemas']['BlockUsage'];
type VariableUsage = components['schemas']['VariableUsage'];

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

/**
 * Fails an action with the backend's message when available (e.g. duplicate
 * names surface as 409 "already exists" instead of a generic failure).
 */
function failWithApiError(action: string, err: unknown, fallback: string) {
	const message = apiMessage(err) ?? fallback;
	const status = /already exists/i.test(message) ? 409 : 400;
	return fail(status, { action, message });
}

export const load: PageServerLoad = async ({ fetch, request }) => {
	const cookie = request.headers.get('cookie');
	const user = await requireUser(fetch, cookie);

	const api = createApiClient(fetch, cookie);

	const [blockResult, variableResult, letterResult] = await Promise.all([
		api.GET('/api/blocks'),
		api.GET('/api/variables'),
		api.GET('/api/letters')
	]);
	const { data: blockData, error: blockError } = blockResult;
	const { data: variableData, error: variableError } = variableResult;
	const { data: letterData, error: letterError } = letterResult;

	const blockUsages: Record<string, BlockUsage> = {};
	const variableUsages: Record<string, VariableUsage> = {};
	await Promise.all([
		...(blockData?.blocks ?? []).map(async (block) => {
			const { data } = await api.GET('/api/blocks/{id}/usage', {
				params: { path: { id: block.id } }
			});
			if (data) blockUsages[block.id] = data;
		}),
		...(variableData?.variables ?? []).map(async (variable) => {
			const { data } = await api.GET('/api/variables/{id}/usage', {
				params: { path: { id: variable.id } }
			});
			if (data) variableUsages[variable.id] = data;
		})
	]);

	return {
		user: user,
		blocks: blockData,
		blockError: blockError,
		variables: variableData,
		variableError: variableError,
		letters: letterData,
		letterError: letterError,
		blockUsages,
		variableUsages
	};
};

export const actions = {
	newLetter: async ({ request, fetch }) => {
		const cookie = request.headers.get('cookie');
		await requireUser(fetch, cookie);
		const formData = await request.formData();
		const letterName = formData.get('letterName')?.toString().trim();
		const letterDescription = formData.get('letterDescription')?.toString().trim();

		if (!letterName || !letterDescription) {
			return fail(400, {
				action: 'newLetter',
				message: 'Letter name and description are required.'
			});
		}

		const api = createApiClient(fetch, cookie);
		const { data: letterData, error: letterError } = await api.POST('/api/letters', {
			body: {
				title: letterName,
				description: letterDescription
			}
		});

		if (letterError) {
			return failWithApiError('newLetter', letterError, 'Failed to create letter.');
		}

		return {
			action: 'newLetter' as const,
			success: true,
			letter: letterData as Letter,
			message: ''
		};
	},
	newBlock: async ({ request, fetch }) => {
		const cookie = request.headers.get('cookie');
		await requireUser(fetch, cookie);
		const formData = await request.formData();
		const blockName = formData.get('blockName')?.toString().trim();
		const blockValue = formData.get('blockValue')?.toString().trim();

		if (!blockName || !blockValue) {
			return fail(400, { action: 'newBlock', message: 'Block name and value are required.' });
		}

		const api = createApiClient(fetch, cookie);
		const { data, error: err } = await api.POST('/api/blocks', {
			body: {
				name: blockName,
				value: blockValue
			}
		});

		if (err) {
			return failWithApiError('newBlock', err, 'Failed to create block.');
		}
		return { action: 'newBlock' as const, success: true, newBlock: data as Block, message: '' };
	},
	newVariable: async ({ request, fetch }) => {
		const cookie = request.headers.get('cookie');
		await requireUser(fetch, cookie);
		const formData = await request.formData();
		const variableName = formData.get('variableName')?.toString().trim();
		const variableValue = formData.get('variableValue')?.toString().trim();

		if (!variableName || !variableValue) {
			return fail(400, { action: 'newVariable', message: 'Variable name and value are required.' });
		}

		const api = createApiClient(fetch, cookie);
		const { data, error: err } = await api.POST('/api/variables', {
			body: {
				name: variableName,
				value: variableValue
			}
		});

		if (err) {
			return failWithApiError('newVariable', err, 'Failed to create variable.');
		}
		return {
			action: 'newVariable' as const,
			success: true,
			newVariable: data as Variable,
			message: ''
		};
	},
	updateVariable: async ({ request, fetch }) => {
		const cookie = request.headers.get('cookie');
		await requireUser(fetch, cookie);
		const formData = await request.formData();
		const variableName = formData.get('variableName')?.toString().trim();
		const variableValue = formData.get('variableValue')?.toString().trim();
		const variableId = formData.get('variableId')?.toString().trim();

		if (!variableId) {
			return fail(400, { action: 'updateVariable', message: 'Variable id is required.' });
		}

		if (!variableName || !variableValue) {
			return fail(400, {
				action: 'updateVariable',
				message: 'Variable name and value are required.'
			});
		}

		const api = createApiClient(fetch, cookie);
		const { data, error: err } = await api.PATCH('/api/variables/{id}', {
			params: {
				path: { id: variableId }
			},
			body: {
				name: variableName,
				value: variableValue
			}
		});

		if (err) {
			return failWithApiError('updateVariable', err, 'Failed to update variable.');
		}
		return { success: true, updateVariable: data, message: '' };
	},
	deleteVariable: async ({ request, fetch }) => {
		const cookie = request.headers.get('cookie');
		await requireUser(fetch, cookie);
		const formData = await request.formData();
		const variableId = formData.get('variableId')?.toString().trim();

		if (!variableId) {
			return fail(400, { action: 'deleteVariable', message: 'Variable id is required.' });
		}

		const force = formData.get('force')?.toString() === 'true';
		const api = createApiClient(fetch, cookie);
		const { data, error: err } = await api.DELETE('/api/variables/{id}', {
			params: {
				path: { id: variableId },
				query: force ? { force: 'true' as const } : {}
			}
		});

		if (err) {
			if (typeof err === 'object' && err !== null && 'variableId' in err) {
				const usage = err as VariableUsage;
				return fail(409, {
					action: 'deleteVariable',
					message: `Variable is used in ${usage.blockCount} block(s) and ${usage.letterCount} letter(s). Confirm to delete anyway.`,
					usage
				});
			}
			return fail(400, { action: 'deleteVariable', message: 'Failed to delete variable.' });
		}
		return { success: true, deleteVariable: data, message: '' };
	},
	updateBlock: async ({ request, fetch }) => {
		const cookie = request.headers.get('cookie');
		await requireUser(fetch, cookie);
		const formData = await request.formData();
		const blockName = formData.get('blockName')?.toString().trim();
		const blockValue = formData.get('blockValue')?.toString().trim();
		const blockId = formData.get('blockId')?.toString().trim();

		if (!blockId) {
			return fail(400, { action: 'updateBlock', message: 'Block id is required.' });
		}

		if (!blockName || !blockValue) {
			return fail(400, { action: 'updateBlock', message: 'Block name and value are required.' });
		}

		const api = createApiClient(fetch, cookie);
		const { data, error: err } = await api.PATCH('/api/blocks/{id}', {
			params: {
				path: { id: blockId }
			},
			body: {
				name: blockName,
				value: blockValue
			}
		});

		if (err) {
			return failWithApiError('updateBlock', err, 'Failed to update block.');
		}
		return { success: true, updateBlock: data, message: '' };
	},
	deleteBlock: async ({ request, fetch }) => {
		const cookie = request.headers.get('cookie');
		await requireUser(fetch, cookie);
		const formData = await request.formData();
		const blockId = formData.get('blockId')?.toString().trim();

		if (!blockId) {
			return fail(400, { action: 'deleteBlock', message: 'Block id is required.' });
		}

		const force = formData.get('force')?.toString() === 'true';
		const api = createApiClient(fetch, cookie);
		const { error: err } = await api.DELETE('/api/blocks/{id}', {
			params: {
				path: { id: blockId },
				query: force ? { force: 'true' as const } : {}
			}
		});

		if (err) {
			if (typeof err === 'object' && err !== null && 'blockId' in err) {
				const usage = err as BlockUsage;
				return fail(409, {
					action: 'deleteBlock',
					message: `Block is used in ${usage.letterCount} letter(s) and uses ${usage.variableCount} variable(s). Confirm to delete anyway.`,
					usage
				});
			}
			return fail(400, { action: 'deleteBlock', message: 'Failed to delete block.' });
		}
		return { action: 'deleteBlock' as const, success: true, message: '' };
	},
	updateLetter: async ({ request, fetch }) => {
		const cookie = request.headers.get('cookie');
		await requireUser(fetch, cookie);
		const formData = await request.formData();
		const letterId = formData.get('letterId')?.toString().trim();
		const letterTitle = formData.get('letterTitle')?.toString().trim();
		const letterDescription = formData.get('letterDescription')?.toString().trim() ?? '';

		if (!letterId) {
			return fail(400, { action: 'updateLetter', message: 'Letter id is required.' });
		}

		if (!letterTitle) {
			return fail(400, { action: 'updateLetter', message: 'Letter title is required.' });
		}

		const api = createApiClient(fetch, cookie);
		const { data, error: err } = await api.PATCH('/api/letters/{id}', {
			params: {
				path: { id: letterId }
			},
			body: {
				title: letterTitle,
				description: letterDescription
			}
		});

		if (err) {
			return failWithApiError('updateLetter', err, 'Failed to update letter.');
		}
		return { action: 'updateLetter' as const, success: true, letter: data as Letter, message: '' };
	},
	deleteLetter: async ({ request, fetch }) => {
		const cookie = request.headers.get('cookie');
		await requireUser(fetch, cookie);
		const formData = await request.formData();
		const letterId = formData.get('letterId')?.toString().trim();

		if (!letterId) {
			return fail(400, { action: 'deleteLetter', message: 'Letter id is required.' });
		}

		const api = createApiClient(fetch, cookie);
		const { error: err } = await api.DELETE('/api/letters/{id}', {
			params: {
				path: { id: letterId }
			}
		});

		if (err) {
			return fail(400, { action: 'deleteLetter', message: 'Failed to delete letter.' });
		}
		return { action: 'deleteLetter' as const, success: true, message: '' };
	}
} satisfies Actions;
