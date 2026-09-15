import z from 'zod';
import { registry } from '../openapi/registry.js';
import { db } from '../db/index.js';
import { variableTable } from '../db/schema.js';
import { desc, eq, and } from 'drizzle-orm';

const variableSchema = registry.register(
	'Variable',
	z.object({
		id: z.string().openapi({ example: 'abc123' }),
		name: z.string().openapi({ example: 'test' }),
		value: z.string().openapi({ example: 'some value' }),
		userId: z.string().openapi({ example: 'abc123' }),
		createdAt: z.string().openapi({ format: 'date-time', example: '2026-08-13T00:00:00.000Z' }),
		updatedAt: z.string().openapi({ format: 'date-time', example: '2026-08-13T00:00:00.000Z' })
	})
);

export const createVariableSchema = registry.register(
	'CreateVariableBody',
	z.object({
		name: z.string().min(1).openapi({ example: 'linkedin' }),
		value: z.string().min(1).openapi({ example: 'https://linkedin.com/...' })
	})
);

export const updateVariableSchema = registry.register(
	'UpdateVariableBody',
	z.object({
		name: z.string().min(1).optional().openapi({ example: 'company_name' }),
		value: z.string().min(1).optional().openapi({ example: 'New company name' })
	})
);

export const variableListSchema = registry.register(
	'VariableList',
	z.object({
		variables: z.array(variableSchema)
	})
);

const validationError = z.object({
	error: z.object({
		message: z.string(),
		details: z.array(
			z.object({
				path: z.string(),
				message: z.string()
			})
		)
	})
});

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
			content: { 'application/json': { schema: validationError } }
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
			content: { 'application/json': { schema: validationError } }
		},
		400: {
			description: 'Invalid body',
			content: { 'application/json': { schema: validationError } }
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
			content: { 'application/json': { schema: validationError } }
		},
		400: {
			description: 'Invalid body',
			content: { 'application/json': { schema: validationError } }
		}
	}
});

export async function getVariables(userId: string) {
	const rows = await db
		.select()
		.from(variableTable)
		.where(eq(variableTable.userId, userId))
		.orderBy(desc(variableTable.createdAt));
	return {
		variables: rows
	};
}

export async function createVariable(userId: string, data: { name: string; value: string }) {
	const result = await db
		.insert(variableTable)
		.values({
			userId,
			name: data.name,
			value: data.value
		})
		.returning();
	return result[0];
}

export async function updateVariable(
	userId: string,
	id: string,
	data: Partial<{ name: string; value: string }>
) {
	const result = await db
		.update(variableTable)
		.set({
			name: data.name,
			value: data.value
		})
		.where(and(eq(variableTable.userId, userId), eq(variableTable.id, id)))
		.returning();
	return result[0];
}

export async function deleteVariable(userId: string, id: string) {
	const result = await db
		.delete(variableTable)
		.where(and(eq(variableTable.userId, userId), eq(variableTable.id, id)))
		.returning();
	return result[0];
}
