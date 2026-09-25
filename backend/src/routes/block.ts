import { Router } from 'express';
import z from 'zod';
import { requireAuth } from '../middleware/require-auth.js';
import { getBlocks, createBlock, deleteBlock, updateBlock } from '../crud/block.js';
import {
	blockSchema,
	blockListSchema,
	createBlockSchema,
	updateBlockSchema
} from '../schemas/blocks.js';
import { validationErrorSchema } from '../schemas/common.js';
import { validate } from '../middleware/validate.js';
import { serializeTimestamps } from '../crud/helpers.js';
import { registry } from '../openapi/registry.js';

registry.registerPath({
	method: 'get',
	path: '/api/blocks',
	summary: "List the current user's blocks",
	tags: ['blocks'],
	security: [{ cookieAuth: [] }],
	responses: {
		200: {
			description: "The current user's blocks",
			content: { 'application/json': { schema: blockListSchema } }
		},
		401: {
			description: 'Not authenticated',
			content: { 'application/json': { schema: z.object({ message: z.string() }) } }
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
		401: {
			description: 'Not authenticated',
			content: { 'application/json': { schema: z.object({ message: z.string() }) } }
		}
	}
});

registry.registerPath({
	method: 'delete',
	path: '/api/blocks/:id',
	summary: 'delete a block for the current user',
	tags: ['blocks'],
	security: [{ cookieAuth: [] }],
	request: {
		params: z.object({ id: z.string().openapi({ example: 'abc123' }) })
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
		}
	}
});

registry.registerPath({
	method: 'patch',
	path: '/api/blocks/:id',
	summary: 'Update a block for the current user.',
	tags: ['blocks'],
	security: [{ cookieAuth: [] }],
	request: {
		body: {
			content: { 'application/json': { schema: updateBlockSchema } }
		},
		params: z.object({ id: z.string().openapi({ example: 'abc123' }) })
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
		}
	}
});

const router = Router();

router.get('/blocks', requireAuth, async (_req, res) => {
	const userId = res.locals.user!.id;
	const { blocks } = await getBlocks(userId);
	res.json({ blocks: blocks.map(serializeTimestamps) });
});

router.post('/blocks', requireAuth, validate({ body: createBlockSchema }), async (req, res) => {
	const userId = res.locals.user!.id;
	const insertedBlock = await createBlock(userId, req.body);
	res.status(201).json(serializeTimestamps(insertedBlock));
});

router.delete('/blocks/:id', requireAuth, async (req, res) => {
	const userId = res.locals.user!.id;
	const blockId = req.params.id as string;
	const updated = await deleteBlock(userId, blockId);
	if (!updated) {
		res.status(404).json({ error: { message: 'Block not found', details: [] } });
		return;
	}
	res.status(204).send();
});

router.patch(
	'/blocks/:id',
	requireAuth,
	validate({ body: updateBlockSchema }),
	async (req, res) => {
		const userId = res.locals.user!.id;
		const blockId = req.params.id as string;
		const updated = await updateBlock(userId, blockId, req.body);
		if (!updated) {
			res.status(404).json({ error: { message: 'Block not found', details: [] } });
			return;
		}
		res.status(200).json(serializeTimestamps(updated));
	}
);

export default router;
