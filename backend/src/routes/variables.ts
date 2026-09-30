import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import { isUniqueViolation, serializeTimestamps } from '../crud/helpers.js';
import { createVariable, deleteVariable, getVariables, updateVariable } from '../crud/variable.js';
import { getVariableUsage } from '../crud/usage.js';
import {
	variableSchema,
	variableListSchema,
	createVariableSchema,
	updateVariableSchema
} from '../schemas/variables.js';
import { forceQuerySchema, variableUsageSchema } from '../schemas/usage.js';
import { idParamSchema, paginationQuerySchema, validationErrorSchema } from '../schemas/common.js';
import { registry } from '../openapi/registry.js';

registry.registerPath({
	method: 'get',
	path: '/api/variables',
	summary: "List the current user's variables",
	tags: ['variables'],
	security: [{ cookieAuth: [] }],
	request: {
		query: paginationQuerySchema
	},
	responses: {
		200: {
			description: "The current user's variables",
			content: { 'application/json': { schema: variableListSchema } }
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
		409: {
			description: 'Variable name already exists',
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
	path: '/api/variables/{id}',
	summary: 'delete a variable for the current user',
	tags: ['variables'],
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
			description: 'variable does not exist',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		400: {
			description: 'Invalid body',
			content: { 'application/json': { schema: validationErrorSchema } }
		},
		409: {
			description: 'Variable is still referenced; usage is returned so the client can confirm',
			content: { 'application/json': { schema: variableUsageSchema } }
		}
	}
});

registry.registerPath({
	method: 'get',
	path: '/api/variables/{id}/usage',
	summary: 'Get usage counts for a variable (blocks and letters using it)',
	tags: ['variables'],
	security: [{ cookieAuth: [] }],
	request: {
		params: idParamSchema
	},
	responses: {
		200: {
			description: 'Usage counts for the variable',
			content: { 'application/json': { schema: variableUsageSchema } }
		},
		404: {
			description: 'variable does not exist',
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
	path: '/api/variables/{id}',
	summary: 'Update a variable for the current user.',
	tags: ['variables'],
	security: [{ cookieAuth: [] }],
	request: {
		body: {
			content: { 'application/json': { schema: updateVariableSchema } }
		},
		params: idParamSchema
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
		},
		409: {
			description: 'Variable name already exists',
			content: { 'application/json': { schema: validationErrorSchema } }
		}
	}
});

const router = Router();

router.get(
	'/variables',
	requireAuth,
	validate({ query: paginationQuerySchema }),
	async (req, res) => {
		const userId = res.locals.user!.id;
		const { variables } = await getVariables(
			userId,
			req.query as unknown as { limit: number; offset: number }
		);
		res.json({ variables: variables.map(serializeTimestamps) });
	}
);

router.post(
	'/variables',
	requireAuth,
	validate({ body: createVariableSchema }),
	async (req, res) => {
		const userId = res.locals.user!.id;
		try {
			const insertedVariable = await createVariable(userId, req.body);
			res.status(201).json(serializeTimestamps(insertedVariable));
		} catch (err) {
			if (isUniqueViolation(err)) {
				res.status(409).json({ error: { message: 'Variable name already exists', details: [] } });
				return;
			}
			throw err;
		}
	}
);

router.get(
	'/variables/:id/usage',
	requireAuth,
	validate({ params: idParamSchema }),
	async (req, res) => {
		const userId = res.locals.user!.id;
		const variableId = req.params.id as string;
		const usage = await getVariableUsage(userId, variableId);
		if (!usage) {
			res.status(404).json({ error: { message: 'variable not found', details: [] } });
			return;
		}
		res.json(usage);
	}
);

router.delete(
	'/variables/:id',
	requireAuth,
	validate({ params: idParamSchema, query: forceQuerySchema }),
	async (req, res) => {
		const userId = res.locals.user!.id;
		const variableId = req.params.id as string;
		const force = req.query.force === 'true';
		if (!force) {
			const usage = await getVariableUsage(userId, variableId);
			if (!usage) {
				res.status(404).json({ error: { message: 'variable not found', details: [] } });
				return;
			}
			if (usage.blockCount > 0 || usage.letterCount > 0) {
				res.status(409).json(usage);
				return;
			}
		}
		const updated = await deleteVariable(userId, variableId);
		if (!updated) {
			res.status(404).json({ error: { message: 'variable not found', details: [] } });
			return;
		}
		res.status(204).send();
	}
);

router.patch(
	'/variables/:id',
	requireAuth,
	validate({ params: idParamSchema, body: updateVariableSchema }),
	async (req, res) => {
		const userId = res.locals.user!.id;
		const variableId = req.params.id as string;
		try {
			const updated = await updateVariable(userId, variableId, req.body);
			if (!updated) {
				res.status(404).json({ error: { message: 'variable not found', details: [] } });
				return;
			}
			res.status(200).json(serializeTimestamps(updated));
		} catch (err) {
			if (isUniqueViolation(err)) {
				res.status(409).json({ error: { message: 'Variable name already exists', details: [] } });
				return;
			}
			throw err;
		}
	}
);

export default router;
