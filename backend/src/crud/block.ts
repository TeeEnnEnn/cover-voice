import z from 'zod';
import { registry } from '../openapi/registry.js';
import { db } from '../db/index.js';
import { blockTable } from '../db/schema.js';
import { desc, eq, and } from 'drizzle-orm';

const blockSchema = registry.register(
	'Block',
	z.object({
		id: z.string().openapi({ example: 'abc123' }),
		name: z.string().openapi({ example: 'test' }),
		value: z.string().openapi({ example: 'some value' }),
		userId: z.string().openapi({ example: 'abc123' }),
		createdAt: z.string().openapi({ format: 'date-time', example: '2026-08-13T00:00:00.000Z' }),
		updatedAt: z.string().openapi({ format: 'date-time', example: '2026-08-13T00:00:00.000Z' })
	})
);

export const createBlockSchema = registry.register(
	'CreateBlockBody',
	z.object({
		name: z.string().min(1).openapi({ example: 'greeting' }),
		value: z.string().min(1).openapi({ example: 'Hello my name is ${...' })
	})
);

export const updateBlockSchema = registry.register(
	'UpdateBlockBody',
	z.object({
		name: z.string().min(1).optional().openapi({ example: 'test' }),
		value: z.string().min(1).optional().openapi({ example: 'some value' })
	})
);

export const blockListSchema = registry.register(
	'BlockList',
	z.object({
		blocks: z.array(blockSchema)
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
			content: { 'application/json': { schema: validationError } }
		},
		400: {
			description: 'Invalid body',
			content: { 'application/json': { schema: validationError } }
		}
	}
});

export async function getBlocks(userId: string) {
	const rows = await db
		.select()
		.from(blockTable)
		.where(eq(blockTable.userId, userId))
		.orderBy(desc(blockTable.createdAt));
	return {
		blocks: rows
	};
}

export async function createBlock(userId: string, data: { name: string; value: string }) {
	const result = await db
		.insert(blockTable)
		.values({
			userId,
			name: data.name,
			value: data.value
		})
		.returning();
	return result[0];
}

export async function updateBlock(
	userId: string,
	id: string,
	data: Partial<{ name: string; value: string }>
) {
	const result = await db
		.update(blockTable)
		.set({
			name: data.name,
			value: data.value
		})
		.where(and(eq(blockTable.userId, userId), eq(blockTable.id, id)))
		.returning();
	return result[0];
}

export async function deleteBlock(userId: string, id: string) {
	const result = await db
		.delete(blockTable)
		.where(and(eq(blockTable.userId, userId), eq(blockTable.id, id)))
		.returning();
	return result[0];
}
