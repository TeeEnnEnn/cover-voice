import z from 'zod';
import { registry } from '../openapi/registry.js';

export const letterVariableOverrideSchema = registry.register(
	'LetterVariableOverride',
	z.object({
		letterId: z.string().openapi({ example: 'abc123' }),
		variableId: z.string().openapi({ example: 'abc123' }),
		variableName: z.string().openapi({ example: 'company' }),
		value: z.string().openapi({ example: 'Acme Inc' })
	})
);

export const letterVariableOverrideListSchema = registry.register(
	'LetterVariableOverrideList',
	z.object({
		overrides: z.array(letterVariableOverrideSchema)
	})
);

export const upsertLetterVariableOverrideSchema = registry.register(
	'UpsertLetterVariableOverrideBody',
	z.object({
		value: z.string().trim().min(1).max(20000).openapi({ example: 'Acme Inc' })
	})
);

export type LetterVariableOverride = z.infer<typeof letterVariableOverrideSchema>;
export type LetterVariableOverrideList = z.infer<typeof letterVariableOverrideListSchema>;
export type UpsertLetterVariableOverrideInput = z.infer<typeof upsertLetterVariableOverrideSchema>;
