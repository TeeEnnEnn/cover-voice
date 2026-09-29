import { Router } from 'express';
import z from 'zod';
import { requireAuth } from '../middleware/require-auth.js';
import {
	createLetter,
	deleteLetter,
	generateLetter,
	getLetterById,
	getLetters,
	updateLetter
} from '../crud/letters.js';
import { getLetterUsage } from '../crud/usage.js';
import {
	letterSchema,
	letterListSchema,
	createLetterSchema,
	updateLetterSchema,
	generateLetterSchema,
	letterGenerationSchema
} from '../schemas/letters.js';
import { letterUsageSchema } from '../schemas/usage.js';
import { renderLetterPdf } from '../services/pdf.js';
import { validationErrorSchema } from '../schemas/common.js';
import { validate } from '../middleware/validate.js';
import { serializeTimestamps } from '../crud/helpers.js';
import { registry } from '../openapi/registry.js';

registry.registerPath({
	method: 'get',
	path: '/api/letters',
	summary: "List the current user's letters",
	tags: ['letters'],
	security: [{ cookieAuth: [] }],
	responses: {
		200: {
			description: "The current user's letters",
			content: { 'application/json': { schema: letterListSchema } }
		},
		401: {
			description: 'Not authenticated',
			content: { 'application/json': { schema: z.object({ message: z.string() }) } }
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
		401: {
			description: 'Not authenticated',
			content: { 'application/json': { schema: z.object({ message: z.string() }) } }
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
		params: z.object({ id: z.string().openapi({ example: 'abc123' }) })
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
		params: z.object({ id: z.string().openapi({ example: 'abc123' }) })
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
		params: z.object({ id: z.string().openapi({ example: 'abc123' }) })
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
			content: { 'application/json': { schema: z.object({ message: z.string() }) } }
		}
	}
});

registry.registerPath({
	method: 'post',
	path: '/api/letters/{id}/generate',
	summary: 'Generate letter content from pinned blocks/variables.',
	tags: ['letters'],
	security: [{ cookieAuth: [] }],
	request: {
		params: z.object({ id: z.string().openapi({ example: 'abc123' }) }),
		body: {
			content: { 'application/json': { schema: generateLetterSchema } }
		}
	},
	responses: {
		200: {
			description: 'The generated letter',
			content: { 'application/json': { schema: letterSchema } }
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
			content: { 'application/json': { schema: z.object({ message: z.string() }) } }
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
		params: z.object({ id: z.string().openapi({ example: 'abc123' }) })
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
			content: { 'application/json': { schema: z.object({ message: z.string() }) } }
		}
	}
});

registry.registerPath({
	method: 'get',
	path: '/api/letters/{id}/export',
	summary: 'Download the generated letter as PDF.',
	tags: ['letters'],
	security: [{ cookieAuth: [] }],
	request: {
		params: z.object({ id: z.string().openapi({ example: 'abc123' }) })
	},
	responses: {
		200: {
			description: 'The generated letter as PDF',
			content: {
				'application/pdf': {
					schema: { type: 'string', format: 'binary' }
				}
			}
		},
		404: {
			description: 'Letter does not exist',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		409: {
			description: 'Letter has not been generated yet',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		401: {
			description: 'Not authenticated',
			content: { 'application/json': { schema: z.object({ message: z.string() }) } }
		}
	}
});

const router = Router();

router.get('/letters', requireAuth, async (_req, res) => {
	const userId = res.locals.user!.id;
	const { letters } = await getLetters(userId);
	res.json({ letters: letters.map(serializeTimestamps) });
});

router.post('/letters', requireAuth, validate({ body: createLetterSchema }), async (req, res) => {
	const userId = res.locals.user!.id;
	const insertedLetter = await createLetter(userId, req.body);
	res.status(201).json(serializeTimestamps(insertedLetter));
});

router.get('/letters/:id', requireAuth, async (req, res) => {
	const userId = res.locals.user!.id;
	const letterId = req.params.id as string;
	const letter = await getLetterById(userId, letterId);
	if (!letter) {
		res.status(404).json({ error: { message: 'Letter not found', details: [] } });
		return;
	}
	res.status(200).json(serializeTimestamps(letter));
});

router.get('/letters/:id/usage', requireAuth, async (req, res) => {
	const userId = res.locals.user!.id;
	const letterId = req.params.id as string;
	const usage = await getLetterUsage(userId, letterId);
	if (!usage) {
		res.status(404).json({ error: { message: 'Letter not found', details: [] } });
		return;
	}
	res.json(usage);
});

router.get('/letters/:id/export', requireAuth, async (req, res) => {
	const userId = res.locals.user!.id;
	const letterId = req.params.id as string;
	const letter = await getLetterById(userId, letterId);
	if (!letter) {
		res.status(404).json({ error: { message: 'Letter not found', details: [] } });
		return;
	}
	const parsed = letterGenerationSchema.safeParse(letter.generatedContent);
	if (!parsed.success) {
		res.status(409).json({
			error: {
				message: 'Letter has not been generated yet. Generate it before exporting.',
				details: []
			}
		});
		return;
	}
	const pdf = await renderLetterPdf(parsed.data);
	const filename = `${letter.title.replace(/[^a-z0-9-_]+/gi, '-').slice(0, 50) || 'letter'}.pdf`;
	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
	res.setHeader('Content-Length', pdf.length);
	res.status(200).send(pdf);
});

router.delete('/letters/:id', requireAuth, async (req, res) => {
	const userId = res.locals.user!.id;
	const letterId = req.params.id as string;
	const deleted = await deleteLetter(userId, letterId);
	if (!deleted) {
		res.status(404).json({ error: { message: 'Letter not found', details: [] } });
		return;
	}
	res.status(204).send();
});

router.patch(
	'/letters/:id',
	requireAuth,
	validate({ body: updateLetterSchema }),
	async (req, res) => {
		const userId = res.locals.user!.id;
		const letterId = req.params.id as string;
		const updated = await updateLetter(userId, letterId, req.body);
		if (!updated) {
			res.status(404).json({ error: { message: 'Letter not found', details: [] } });
			return;
		}
		res.status(200).json(serializeTimestamps(updated));
	}
);

router.post(
	'/letters/:id/generate',
	requireAuth,
	validate({ body: generateLetterSchema }),
	async (req, res) => {
		const userId = res.locals.user!.id;
		const letterId = req.params.id as string;
		const result = await generateLetter(userId, letterId, req.body);
		if (result === null) {
			res.status(404).json({ error: { message: 'Letter not found', details: [] } });
			return;
		}
		if (!result.ok) {
			res.status(422).json({
				error: {
					message: result.error.hint,
					details: [{ path: `sections.${result.error.section}`, message: result.error.hint }]
				}
			});
			return;
		}
		res.status(200).json(serializeTimestamps(result.letter));
	}
);

export default router;
