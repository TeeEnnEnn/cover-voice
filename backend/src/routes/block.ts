import { Router } from 'express';
import z from 'zod';
import { requireAuth } from '../middleware/require-auth.js';
import { getBlocks, createBlock, deleteBlock, updateBlock } from '../crud/block.js';
import { getBlockUsage } from '../crud/usage.js';
import {
	blockSchema,
	blockListSchema,
	createBlockSchema,
	updateBlockSchema
} from '../schemas/blocks.js';
import { blockUsageSchema, forceQuerySchema } from '../schemas/usage.js';
import { idParamSchema, paginationQuerySchema, validationErrorSchema } from '../schemas/common.js';
import { validate } from '../middleware/validate.js';
import { isUniqueViolation, serializeTimestamps } from '../crud/helpers.js';
import { registry } from '../openapi/registry.js';

registry.registerPath({
	method: 'get',
	path: '/api/blocks',
	summary: "List the current user's blocks",
	tags: ['blocks'],
	security: [{ cookieAuth: [] }],
	request: {
		query: paginationQuerySchema
	},
	responses: {
		200: {
			description: "The current user's blocks",
			content: { 'application/json': { schema: blockListSchema } }
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
	path: '/api/blocks',
	summary: 'Create a block for the current user',
	tags: ['blocks'],
	security: [{ cookieAuth: [] }],
	request: {
		body: {
			content: { 'application/json': { schema: createBlockSchema } }
		}
	},
	responses: {
		201: {
			description: 'The created block',
			content: { 'application/json': { schema: blockSchema } }
		},
		400: {
			description: 'Invalid body',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		409: {
			description: 'Block name already exists',
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
	path: '/api/blocks/{id}',
	summary: 'delete a block for the current user',
	tags: ['blocks'],
	security: [{ cookieAuth: [] }],
	request: {
		params: idParamSchema,
		query: forceQuerySchema
	},
	responses: {
		204: {
			description: 'Deleted successfully'
		},
		404: {
			description: 'Block does not exist',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		400: {
			description: 'Invalid body',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		409: {
			description: 'Block is still referenced; usage is returned so the client can confirm',
			content: { 'application/json': { schema: blockUsageSchema } }
		}
	}
});

registry.registerPath({
	method: 'get',
	path: '/api/blocks/{id}/usage',
	summary: 'Get usage counts for a block (letters using it, variables it uses)',
	tags: ['blocks'],
	security: [{ cookieAuth: [] }],
	request: {
		params: idParamSchema
	},
	responses: {
		200: {
			description: 'Usage counts for the block',
			content: { 'application/json': { schema: blockUsageSchema } }
		},
		404: {
			description: 'Block does not exist',
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
	method: 'patch',
	path: '/api/blocks/{id}',
	summary: 'Update a block for the current user.',
	tags: ['blocks'],
	security: [{ cookieAuth: [] }],
	request: {
		body: {
			content: { 'application/json': { schema: updateBlockSchema } }
		},
		params: idParamSchema
	},
	responses: {
		200: {
			description: 'The created block',
			content: { 'application/json': { schema: blockSchema } }
		},
		404: {
			description: 'Block does not exist',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		400: {
			description: 'Invalid body',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		409: {
			description: 'Block name already exists',
			content: { 'application/json': { schema: validationErrorSchema } }
		}
	}
});

const router = Router();

router.get('/blocks', requireAuth, validate({ query: paginationQuerySchema }), async (req, res) => {
	const userId = res.locals.user!.id;
	const { blocks } = await getBlocks(
		userId,
		req.query as unknown as { limit: number; offset: number }
	);
	res.json({ blocks: blocks.map(serializeTimestamps) });
});

router.post('/blocks', requireAuth, validate({ body: createBlockSchema }), async (req, res) => {
	const userId = res.locals.user!.id;
	try {
		const insertedBlock = await createBlock(userId, req.body);
		res.status(201).json(serializeTimestamps(insertedBlock));
	} catch (err) {
		if (isUniqueViolation(err)) {
			res.status(409).json({ error: { message: 'Block name already exists', details: [] } });
			return;
		}
		throw err;
	}
});

router.delete(
	'/blocks/:id',
	requireAuth,
	validate({ params: idParamSchema, query: forceQuerySchema }),
	async (req, res) => {
		const userId = res.locals.user!.id;
		const blockId = req.params.id as string;
		const force = req.query.force === 'true';
		if (!force) {
			const usage = await getBlockUsage(userId, blockId);
			if (!usage) {
				res.status(404).json({ error: { message: 'Block not found', details: [] } });
				return;
			}
			if (usage.letterCount > 0 || usage.variableCount > 0) {
				res.status(409).json(usage);
				return;
			}
		}
		const updated = await deleteBlock(userId, blockId);
		if (!updated) {
			res.status(404).json({ error: { message: 'Block not found', details: [] } });
			return;
		}
		res.status(204).send();
	}
);

router.get(
	'/blocks/:id/usage',
	requireAuth,
	validate({ params: idParamSchema }),
	async (req, res) => {
		const userId = res.locals.user!.id;
		const blockId = req.params.id as string;
		const usage = await getBlockUsage(userId, blockId);
		if (!usage) {
			res.status(404).json({ error: { message: 'Block not found', details: [] } });
			return;
		}
		res.json(usage);
	}
);

router.patch(
	'/blocks/:id',
	requireAuth,
	validate({ params: idParamSchema, body: updateBlockSchema }),
	async (req, res) => {
		const userId = res.locals.user!.id;
		const blockId = req.params.id as string;
		try {
			const updated = await updateBlock(userId, blockId, req.body);
			if (!updated) {
				res.status(404).json({ error: { message: 'Block not found', details: [] } });
				return;
			}
			res.status(200).json(serializeTimestamps(updated));
		} catch (err) {
			if (isUniqueViolation(err)) {
				res.status(409).json({ error: { message: 'Block name already exists', details: [] } });
				return;
			}
			throw err;
		}
	}
);

export default router;
