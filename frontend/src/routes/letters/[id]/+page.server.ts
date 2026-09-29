import type { components } from '$lib/api/schema';
import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { createApiClient } from '$lib/api/client';
import { requireUser } from '$lib/server/auth';

type Block = components['schemas']['Block'];
type Variable = components['schemas']['Variable'];
type LetterGeneration = components['schemas']['LetterGenerationSchema'];

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

const DEFAULT_CONFIG: LetterGeneration['config'] = {
	font: 'Helvetica',
	fontSize: 12,
	fontColor: '#000000',
	backgroundColor: '#ffffff',
	lineHeight: 1.5,
	textDirection: 'ltr',
	pageSize: 'A4',
	marginLeft: 36,
	marginRight: 36,
	marginTop: 36,
	marginBottom: 36
};

const ALIGNS = ['left', 'right', 'center', 'justify'] as const;
type Align = (typeof ALIGNS)[number];

function parseAlign(value: FormDataEntryValue | null): Align {
	return ALIGNS.includes(value as Align) ? (value as Align) : 'left';
}

function buildContent(formData: FormData): LetterGeneration {
	return {
		config: DEFAULT_CONFIG,
		sections: {
			header: {
				text: formData.get('headerText')?.toString() || null,
				align: parseAlign(formData.get('headerAlign'))
			},
			body: {
				text: formData.get('bodyText')?.toString() || null,
				align: parseAlign(formData.get('bodyAlign'))
			},
			footer: {
				text: formData.get('footerText')?.toString() || null,
				align: parseAlign(formData.get('footerAlign'))
			}
		}
	};
}

export const load: PageServerLoad = async ({ params, fetch, request }) => {
	const cookie = request.headers.get('cookie');
	const user = await requireUser(fetch, cookie);
	const api = createApiClient(fetch, cookie);
	const letterId = params.id;

	const [letterResult, blockResult, variableResult] = await Promise.all([
		api.GET('/api/letters/{id}', { params: { path: { id: letterId } } }),
		api.GET('/api/blocks'),
		api.GET('/api/variables')
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
		variableError: variableResult.error ? 'Failed to load variables' : null
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
	},
	saveSections: async ({ request, fetch, params }) => {
		const cookie = request.headers.get('cookie');
		await requireUser(fetch, cookie);
		const formData = await request.formData();
		const content = buildContent(formData);

		const api = createApiClient(fetch, cookie);
		const { error: err } = await api.PATCH('/api/letters/{id}', {
			params: { path: { id: params.id } },
			body: { rawContent: content }
		});

		if (err) {
			return fail(400, { action: 'saveSections', message: 'Failed to save sections.' });
		}
		return { action: 'saveSections' as const, success: true, message: 'Sections saved.' };
	}
} satisfies Actions;
