import z from 'zod';
import { registry } from '../openapi/registry.js';

const namedRef = (kind: 'block' | 'variable' | 'letter') =>
	z.object({
		id: z.string().openapi({ example: 'abc123' }),
		name: z.string().openapi({ example: kind === 'letter' ? 'Application at Acme' : 'greeting' })
	});

export const blockUsageSchema = registry.register(
	'BlockUsage',
	z.object({
		blockId: z.string().openapi({ example: 'abc123' }),
		letterCount: z.number().int().nonnegative().openapi({ example: 2 }),
		letters: z.array(namedRef('letter')),
		variableCount: z.number().int().nonnegative().openapi({ example: 1 }),
		variables: z.array(namedRef('variable'))
	})
);

export const variableUsageSchema = registry.register(
	'VariableUsage',
	z.object({
		variableId: z.string().openapi({ example: 'abc123' }),
		blockCount: z.number().int().nonnegative().openapi({ example: 1 }),
		blocks: z.array(namedRef('block')),
		letterCount: z.number().int().nonnegative().openapi({ example: 2 }),
		letters: z.array(namedRef('letter'))
	})
);

export const letterUsageSchema = registry.register(
	'LetterUsage',
	z.object({
		letterId: z.string().openapi({ example: 'abc123' }),
		blockCount: z.number().int().nonnegative().openapi({ example: 2 }),
		blocks: z.array(namedRef('block')),
		variableCount: z.number().int().nonnegative().openapi({ example: 1 }),
		variables: z.array(namedRef('variable'))
	})
);

export const forceQuerySchema = z.object({
	force: z.enum(['true', 'false']).optional().openapi({ example: 'true' })
});

export type BlockUsage = z.infer<typeof blockUsageSchema>;
export type VariableUsage = z.infer<typeof variableUsageSchema>;
export type LetterUsage = z.infer<typeof letterUsageSchema>;
