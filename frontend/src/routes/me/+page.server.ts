import type { PageServerLoad, Actions } from './$types';
import { requireUser } from '$lib/server/auth';
import { createApiClient } from '@/api/client';

export const load: PageServerLoad = async ({ fetch, request }) => {
	const user = await requireUser(fetch, request.headers.get('cookie'));

	const api = createApiClient(fetch);

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
	newLetter: async () => {},
	newBlock: async () => {},
	newVariable: async () => {}
} satisfies Actions;
