import z from 'zod';
import { registry } from '../openapi/registry.js';

export const blockSchema = registry.register(
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
		name: z.string().trim().min(1).max(100).openapi({ example: 'greeting' }),
		value: z.string().min(1).max(20000).openapi({ example: 'Hello my name is ${...' })
	})
);

export const updateBlockSchema = registry.register(
	'UpdateBlockBody',
	z
		.object({
			name: z.string().trim().min(1).max(100).optional().openapi({ example: 'test' }),
			value: z.string().min(1).max(20000).optional().openapi({ example: 'some value' })
		})
		.refine((body) => Object.keys(body).length > 0, { message: 'Nothing to update' })
);

export const blockListSchema = registry.register(
	'BlockList',
	z.object({
		blocks: z.array(blockSchema)
	})
);

export type Block = z.infer<typeof blockSchema>;
export type CreateBlockInput = z.infer<typeof createBlockSchema>;
export type UpdateBlockInput = z.infer<typeof updateBlockSchema>;
export type BlockList = z.infer<typeof blockListSchema>;
