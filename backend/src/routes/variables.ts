import { Router } from 'express';
import z from 'zod';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import { serializeTimestamps } from '../crud/helpers.js';
import { createVariable, deleteVariable, getVariables, updateVariable } from '../crud/variable.js';
import {
	variableSchema,
	variableListSchema,
	createVariableSchema,
	updateVariableSchema
} from '../schemas/variables.js';
import { validationErrorSchema } from '../schemas/common.js';
import { registry } from '../openapi/registry.js';

registry.registerPath({
	method: 'get',
	path: '/api/variables',
	summary: "List the current user's variables",
	tags: ['variables'],
	security: [{ cookieAuth: [] }],
	responses: {
		200: {
			description: "The current user's variables",
			content: { 'application/json': { schema: variableListSchema } }
		},
		401: {
			description: 'Not authenticated',
			content: { 'application/json': { schema: z.object({ message: z.string() }) } }
		}
	}
});

registry.registerPath({
	method: 'post',
	path: '/api/variables',
	summary: 'Create a variable for the current user',
	tags: ['variables'],
	security: [{ cookieAuth: [] }],
	request: {
		body: {
			content: { 'application/json': { schema: createVariableSchema } }
		}
	},
	responses: {
		201: {
			description: 'The created variable',
			content: { 'application/json': { schema: variableSchema } }
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
	path: '/api/variables/:id',
	summary: 'delete a variable for the current user',
	tags: ['variables'],
	security: [{ cookieAuth: [] }],
	request: {
		params: z.object({ id: z.string().openapi({ example: 'abc123' }) })
	},
	responses: {
		204: {
			description: 'Deleted successfully'
		},
		404: {
			description: 'variable does not exist',
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
	path: '/api/variables/:id',
	summary: 'Update a variable for the current user.',
	tags: ['variables'],
	security: [{ cookieAuth: [] }],
	request: {
		body: {
			content: { 'application/json': { schema: updateVariableSchema } }
		},
		params: z.object({ id: z.string().openapi({ example: 'abc123' }) })
	},
	responses: {
		200: {
			description: 'The created variable',
			content: { 'application/json': { schema: variableSchema } }
		},
		404: {
			description: 'variable does not exist',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		400: {
			description: 'Invalid body',
			content: { 'application/json': { schema: validationErrorSchema } }
		}
	}
});

const router = Router();

router.get('/variables', requireAuth, async (_req, res) => {
	const userId = res.locals.user!.id;
	const { variables } = await getVariables(userId);
	res.json({ variables: variables.map(serializeTimestamps) });
});

router.post(
	'/variables',
	requireAuth,
	validate({ body: createVariableSchema }),
	async (req, res) => {
		const userId = res.locals.user!.id;
		const insertedVariable = await createVariable(userId, req.body);
		res.status(201).json(serializeTimestamps(insertedVariable));
	}
);

router.delete('/variables/:id', requireAuth, async (req, res) => {
	const userId = res.locals.user!.id;
	const variableId = req.params.id as string;
	const updated = await deleteVariable(userId, variableId);
	if (!updated) {
		res.status(404).json({ error: { message: 'variable not found', details: [] } });
		return;
	}
	res.status(204).send();
});

router.patch(
	'/variables/:id',
	requireAuth,
	validate({ body: updateVariableSchema }),
	async (req, res) => {
		const userId = res.locals.user!.id;
		const variableId = req.params.id as string;
		const updated = await updateVariable(userId, variableId, req.body);
		if (!updated) {
			res.status(404).json({ error: { message: 'variable not found', details: [] } });
			return;
		}
		res.status(200).json(serializeTimestamps(updated));
	}
);

export default router;
