import type { components } from '$lib/api/schema';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { createApiClient } from '$lib/api/client';
import { requireUser } from '$lib/server/auth';

type Block = components['schemas']['Block'];
type Variable = components['schemas']['Variable'];

export const load: PageServerLoad = async ({ fetch, request }) => {
	const cookie = request.headers.get('cookie');
	const user = await requireUser(fetch, cookie);
	const api = createApiClient(fetch, cookie);

	let variableErrorMessage = '';
	let blockErrorMessage = '';

	async function loadVariables(): Promise<Variable[] | null> {
		const { data, error: err } = await api.GET("/api/variables")
		if (err) {
			variableErrorMessage = 'Failed to load variables';
			return null;
		}
		return data.variables;
	}

	async function loadBlocks(): Promise<Block[] | null> {
		const { data, error: err } = await api.GET('/api/blocks');
		if (err) {
			blockErrorMessage = 'Failed to load blocks';
			return null;
		}
		return data.blocks;
	}

	const results = await Promise.all([loadVariables(), loadBlocks()]);

	return {
		user,
		variables: results[0] ?? variableErrorMessage,
		variableErrorMessage: variableErrorMessage,
		blocks: results[1] ?? blockErrorMessage,
		blockErrorMessage: blockErrorMessage
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
			return fail(400, { action: 'newBlock', message: 'Failed to create block.' });
		}
		return { success: true, newBlock: data, message: '' };
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
			return fail(400, { action: 'newVariable', message: 'Failed to create variable.' });
		}
		return { success: true, newVariable: data, message: '' };
	}
} satisfies Actions;
