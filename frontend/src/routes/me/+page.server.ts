import type { PageServerLoad, Actions } from './$types';
import { requireUser } from '$lib/server/auth';
import { createApiClient } from '@/api/client';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ fetch, request }) => {
	const cookie = request.headers.get('cookie');
	const user = await requireUser(fetch, cookie);

	const api = createApiClient(fetch, cookie);

	const resultArray = await Promise.all([
		await api.GET('/api/blocks'),
		await api.GET('/api/variables')
	]);
	const { data: blockData, error: blockError } = resultArray[0];
	const { data: variableData, error: variableError } = resultArray[1];

	return {
		user: user,
		blocks: blockData,
		blockError: blockError,
		variables: variableData,
		variableError: variableError
	};
};

export const actions = {
	newLetter: async ({ request, fetch }) => {
		await requireUser(fetch, request.headers.get('cookie'));
		const formData = await request.formData();
		const letterName = formData.get('letterName')?.toString().trim();
		const letterDescription = formData.get('letterDescription')?.toString().trim();
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
			return fail(400, { action: 'newBlock', message: 'Failed to create block.' });
		}
		return { success: true, newBlock: data, message: '' };
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
			return fail(400, { action: 'newVariable', message: 'Failed to create variable.' });
		}
		return { success: true, newVariable: data, message: '' };
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
			return fail(400, { action: 'updateVariable', message: 'Variable name and value are required.' });
		}

		const api = createApiClient(fetch, cookie);
		const { data, error: err } = await api.PATCH('/api/variables/:id', {
			params: {
				path: { id: variableId }
			},
			body: {
				name: variableName,
				value: variableValue
			}
		});

		if (err) {
			return fail(400, { action: 'updateVariable', message: 'Failed to update variable.' });
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

		const api = createApiClient(fetch, cookie);
		const { data, error: err } = await api.DELETE('/api/variables/:id', {
			params: {
				path: { id: variableId }
			}
		});

		if (err) {
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
		const { data, error: err } = await api.PATCH('/api/blocks/:id', {
			params: {
				path: { id: blockId }
			},
			body: {
				name: blockName,
				value: blockValue
			}
		});

		if (err) {
			return fail(400, { action: 'updateBlock', message: 'Failed to update block.' });
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

		const api = createApiClient(fetch, cookie);
		const { error: err } = await api.DELETE('/api/blocks/:id', {
			params: {
				path: { id: blockId }
			}
		});

		if (err) {
			return fail(400, { action: 'deleteBlock', message: 'Failed to delete block.' });
		}
		return { success: true, message: '' };
	}
} satisfies Actions;
