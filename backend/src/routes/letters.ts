import { Router } from 'express';
import type { Response } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import {
	createLetter,
	deleteLetter,
	generateLetter,
	getLetterById,
	getLetters,
	resolveAndRender,
	updateLetter
} from '../crud/letters.js';
import {
	deleteLetterOverride,
	getLetterOverrides,
	upsertLetterOverride
} from '../crud/overrides.js';
import type { CollectLetterRefsError } from '../services/replacement.js';
import { getLetterUsage } from '../crud/usage.js';
import {
	letterSchema,
	letterListSchema,
	createLetterSchema,
	updateLetterSchema,
	generateLetterSchema
} from '../schemas/letters.js';
import {
	letterVariableOverrideListSchema,
	letterVariableOverrideSchema,
	upsertLetterVariableOverrideSchema
} from '../schemas/overrides.js';
import { letterUsageSchema } from '../schemas/usage.js';
import { idParamSchema, paginationQuerySchema, validationErrorSchema } from '../schemas/common.js';
import { validate } from '../middleware/validate.js';
import { isUniqueViolation, serializeTimestamps } from '../crud/helpers.js';
import { registry } from '../openapi/registry.js';

const letterOverrideParamsSchema = idParamSchema.extend({
	variableId: idParamSchema.shape.id
});

registry.registerPath({
	method: 'get',
	path: '/api/letters',
	summary: "List the current user's letters",
	tags: ['letters'],
	security: [{ cookieAuth: [] }],
	request: {
		query: paginationQuerySchema
	},
	responses: {
		200: {
			description: "The current user's letters",
			content: { 'application/json': { schema: letterListSchema } }
		},
		401: {
			description: 'Not authenticated',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		403: {
			description: 'Email not verified',
			content: { 'application/json': { schema: validationErrorSchema } }
		}
	}
});

registry.registerPath({
	method: 'post',
	path: '/api/letters',
	summary: 'Create a letter for the current user',
	tags: ['letters'],
	security: [{ cookieAuth: [] }],
	request: {
		body: {
			content: { 'application/json': { schema: createLetterSchema } }
		}
	},
	responses: {
		201: {
			description: 'The created letter',
			content: { 'application/json': { schema: letterSchema } }
		},
		400: {
			description: 'Invalid body',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		409: {
			description: 'Letter title already exists',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		401: {
			description: 'Not authenticated',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		403: {
			description: 'Email not verified',
			content: { 'application/json': { schema: validationErrorSchema } }
		}
	}
});

registry.registerPath({
	method: 'delete',
	path: '/api/letters/{id}',
	summary: 'delete a letter for the current user',
	tags: ['letters'],
	security: [{ cookieAuth: [] }],
	request: {
		params: idParamSchema
	},
	responses: {
		204: {
			description: 'Deleted successfully'
		},
		404: {
			description: 'Letter does not exist',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		400: {
			description: 'Invalid body',
			content: { 'application/json': { schema: validationErrorSchema } }
		}
	}
});

registry.registerPath({
	method: 'patch',
	path: '/api/letters/{id}',
	summary: 'Update a letter for the current user.',
	tags: ['letters'],
	security: [{ cookieAuth: [] }],
	request: {
		body: {
			content: { 'application/json': { schema: updateLetterSchema } }
		},
		params: idParamSchema
	},
	responses: {
		200: {
			description: 'The updated letter',
			content: { 'application/json': { schema: letterSchema } }
		},
		404: {
			description: 'Letter does not exist',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		400: {
			description: 'Invalid body',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		409: {
			description: 'Letter title already exists',
			content: { 'application/json': { schema: validationErrorSchema } }
		}
	}
});

registry.registerPath({
	method: 'get',
	path: '/api/letters/{id}',
	summary: 'Get a single letter for the current user.',
	tags: ['letters'],
	security: [{ cookieAuth: [] }],
	request: {
		params: idParamSchema
	},
	responses: {
		200: {
			description: 'The requested letter',
			content: { 'application/json': { schema: letterSchema } }
		},
		404: {
			description: 'Letter does not exist',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		401: {
			description: 'Not authenticated',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		403: {
			description: 'Email not verified',
			content: { 'application/json': { schema: validationErrorSchema } }
		}
	}
});

registry.registerPath({
	method: 'post',
	path: '/api/letters/{id}/generate',
	summary: 'Generate letter content, persist it, and return the rendered PDF.',
	tags: ['letters'],
	security: [{ cookieAuth: [] }],
	request: {
		params: idParamSchema,
		body: {
			content: { 'application/json': { schema: generateLetterSchema } }
		}
	},
	responses: {
		200: {
			description: 'The rendered PDF (also persisted as generatedContent)',
			content: {
				'application/pdf': {
					schema: { type: 'string', format: 'binary' }
				}
			}
		},
		422: {
			description: 'Unknown block/variable reference in a section; nothing was written',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		404: {
			description: 'Letter does not exist',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		401: {
			description: 'Not authenticated',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		403: {
			description: 'Email not verified',
			content: { 'application/json': { schema: validationErrorSchema } }
		}
	}
});

registry.registerPath({
	method: 'post',
	path: '/api/letters/{id}/preview',
	summary: 'Render editor content to PDF without persisting anything.',
	tags: ['letters'],
	security: [{ cookieAuth: [] }],
	request: {
		params: idParamSchema,
		body: {
			content: { 'application/json': { schema: generateLetterSchema } }
		}
	},
	responses: {
		200: {
			description: 'The rendered PDF (ephemeral: nothing is written)',
			content: {
				'application/pdf': {
					schema: { type: 'string', format: 'binary' }
				}
			}
		},
		422: {
			description: 'Unknown block/variable reference in a section',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		404: {
			description: 'Letter does not exist',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		401: {
			description: 'Not authenticated',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		403: {
			description: 'Email not verified',
			content: { 'application/json': { schema: validationErrorSchema } }
		}
	}
});

registry.registerPath({
	method: 'get',
	path: '/api/letters/{id}/usage',
	summary: 'Get usage counts for a letter (blocks and variables it uses)',
	tags: ['letters'],
	security: [{ cookieAuth: [] }],
	request: {
		params: idParamSchema
	},
	responses: {
		200: {
			description: 'Usage counts for the letter',
			content: { 'application/json': { schema: letterUsageSchema } }
		},
		404: {
			description: 'Letter does not exist',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		401: {
			description: 'Not authenticated',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		403: {
			description: 'Email not verified',
			content: { 'application/json': { schema: validationErrorSchema } }
		}
	}
});

registry.registerPath({
	method: 'get',
	path: '/api/letters/{id}/overrides',
	summary: "List a letter's per-variable value overrides",
	tags: ['letters'],
	security: [{ cookieAuth: [] }],
	request: {
		params: idParamSchema
	},
	responses: {
		200: {
			description: "The letter's variable overrides",
			content: { 'application/json': { schema: letterVariableOverrideListSchema } }
		},
		404: {
			description: 'Letter does not exist',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		401: {
			description: 'Not authenticated',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		403: {
			description: 'Email not verified',
			content: { 'application/json': { schema: validationErrorSchema } }
		}
	}
});

registry.registerPath({
	method: 'put',
	path: '/api/letters/{id}/overrides/{variableId}',
	summary: 'Create or update a per-letter variable override',
	tags: ['letters'],
	security: [{ cookieAuth: [] }],
	request: {
		params: letterOverrideParamsSchema,
		body: {
			content: { 'application/json': { schema: upsertLetterVariableOverrideSchema } }
		}
	},
	responses: {
		200: {
			description: 'The upserted override',
			content: { 'application/json': { schema: letterVariableOverrideSchema } }
		},
		400: {
			description: 'Invalid body',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		404: {
			description: 'Letter or variable does not exist',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		401: {
			description: 'Not authenticated',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		403: {
			description: 'Email not verified',
			content: { 'application/json': { schema: validationErrorSchema } }
		}
	}
});

registry.registerPath({
	method: 'delete',
	path: '/api/letters/{id}/overrides/{variableId}',
	summary: 'Delete a per-letter variable override (reverts to the default value)',
	tags: ['letters'],
	security: [{ cookieAuth: [] }],
	request: {
		params: letterOverrideParamsSchema
	},
	responses: {
		204: {
			description: 'Deleted successfully (or no override existed)'
		},
		404: {
			description: 'Letter or variable does not exist',
			content: { 'application/json': { schema: validationErrorSchema } }
		}
	}
});

const router = Router();

router.get(
	'/letters',
	requireAuth,
	validate({ query: paginationQuerySchema }),
	async (req, res) => {
		const userId = res.locals.user!.id;
		const { letters } = await getLetters(
			userId,
			req.query as unknown as { limit: number; offset: number }
		);
		res.json({ letters: letters.map(serializeTimestamps) });
	}
);

router.post('/letters', requireAuth, validate({ body: createLetterSchema }), async (req, res) => {
	const userId = res.locals.user!.id;
	try {
		const insertedLetter = await createLetter(userId, req.body);
		res.status(201).json(serializeTimestamps(insertedLetter));
	} catch (err) {
		if (isUniqueViolation(err)) {
			res.status(409).json({ error: { message: 'Letter title already exists', details: [] } });
			return;
		}
		throw err;
	}
});

router.get('/letters/:id', requireAuth, validate({ params: idParamSchema }), async (req, res) => {
	const userId = res.locals.user!.id;
	const letterId = req.params.id as string;
	const letter = await getLetterById(userId, letterId);
	if (!letter) {
		res.status(404).json({ error: { message: 'Letter not found', details: [] } });
		return;
	}
	res.status(200).json(serializeTimestamps(letter));
});

router.get(
	'/letters/:id/usage',
	requireAuth,
	validate({ params: idParamSchema }),
	async (req, res) => {
		const userId = res.locals.user!.id;
		const letterId = req.params.id as string;
		const usage = await getLetterUsage(userId, letterId);
		if (!usage) {
			res.status(404).json({ error: { message: 'Letter not found', details: [] } });
			return;
		}
		res.json(usage);
	}
);

router.get(
	'/letters/:id/overrides',
	requireAuth,
	validate({ params: idParamSchema }),
	async (req, res) => {
		const userId = res.locals.user!.id;
		const letterId = req.params.id as string;
		const overrides = await getLetterOverrides(userId, letterId);
		if (!overrides) {
			res.status(404).json({ error: { message: 'Letter not found', details: [] } });
			return;
		}
		res.json({ overrides });
	}
);

router.put(
	'/letters/:id/overrides/:variableId',
	requireAuth,
	validate({ params: letterOverrideParamsSchema, body: upsertLetterVariableOverrideSchema }),
	async (req, res) => {
		const userId = res.locals.user!.id;
		const letterId = req.params.id as string;
		const variableId = (req.params as unknown as { variableId: string }).variableId;
		const override = await upsertLetterOverride(userId, letterId, variableId, req.body.value);
		if (!override) {
			res.status(404).json({ error: { message: 'Letter or variable not found', details: [] } });
			return;
		}
		res.status(200).json(override);
	}
);

router.delete(
	'/letters/:id/overrides/:variableId',
	requireAuth,
	validate({ params: letterOverrideParamsSchema }),
	async (req, res) => {
		const userId = res.locals.user!.id;
		const letterId = req.params.id as string;
		const variableId = (req.params as unknown as { variableId: string }).variableId;
		const deleted = await deleteLetterOverride(userId, letterId, variableId);
		if (deleted === null) {
			res.status(404).json({ error: { message: 'Letter or variable not found', details: [] } });
			return;
		}
		res.status(204).send();
	}
);

function pdfFilename(title: string): string {
	return `${title.replace(/[^a-z0-9-_]+/gi, '-').slice(0, 50) || 'letter'}.pdf`;
}

function sendPdf(
	res: Response,
	pdf: Buffer,
	filename: string,
	disposition: 'inline' | 'attachment'
): void {
	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
	res.setHeader('Content-Length', pdf.length);
	res.status(200).send(pdf);
}

function referenceError(res: Response, error: CollectLetterRefsError): void {
	res.status(422).json({
		error: {
			message: error.hint,
			details: [{ path: `sections.${error.section}`, message: error.hint }]
		}
	});
}

router.delete(
	'/letters/:id',
	requireAuth,
	validate({ params: idParamSchema }),
	async (req, res) => {
		const userId = res.locals.user!.id;
		const letterId = req.params.id as string;
		const deleted = await deleteLetter(userId, letterId);
		if (!deleted) {
			res.status(404).json({ error: { message: 'Letter not found', details: [] } });
			return;
		}
		res.status(204).send();
	}
);

router.patch(
	'/letters/:id',
	requireAuth,
	validate({ params: idParamSchema, body: updateLetterSchema }),
	async (req, res) => {
		const userId = res.locals.user!.id;
		const letterId = req.params.id as string;
		try {
			const updated = await updateLetter(userId, letterId, req.body);
			if (!updated) {
				res.status(404).json({ error: { message: 'Letter not found', details: [] } });
				return;
			}
			res.status(200).json(serializeTimestamps(updated));
		} catch (err) {
			if (isUniqueViolation(err)) {
				res.status(409).json({ error: { message: 'Letter title already exists', details: [] } });
				return;
			}
			throw err;
		}
	}
);

router.post(
	'/letters/:id/generate',
	requireAuth,
	validate({ params: idParamSchema, body: generateLetterSchema }),
	async (req, res) => {
		const userId = res.locals.user!.id;
		const letterId = req.params.id as string;
		const result = await generateLetter(userId, letterId, req.body);
		if (result === null) {
			res.status(404).json({ error: { message: 'Letter not found', details: [] } });
			return;
		}
		if (!result.ok) {
			referenceError(res, result.error);
			return;
		}
		sendPdf(res, result.pdf, pdfFilename(result.letter.title), 'attachment');
	}
);

router.post(
	'/letters/:id/preview',
	requireAuth,
	validate({ params: idParamSchema, body: generateLetterSchema }),
	async (req, res) => {
		const userId = res.locals.user!.id;
		const letterId = req.params.id as string;
		const letter = await getLetterById(userId, letterId);
		if (!letter) {
			res.status(404).json({ error: { message: 'Letter not found', details: [] } });
			return;
		}
		// Ephemeral: resolves and renders without touching rawContent,
		// generatedContent, or the junction tables.
		// Overrides are still applied so the preview matches the download.
		const resolved = await resolveAndRender(userId, letterId, req.body);
		if (!resolved.ok) {
			referenceError(res, resolved.error);
			return;
		}
		sendPdf(res, resolved.value.pdf, pdfFilename(letter.title), 'inline');
	}
);

export default router;
