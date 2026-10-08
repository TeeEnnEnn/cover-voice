import z from 'zod';
import { registry } from '../openapi/registry.js';
import { isReservedVariableName } from '../services/reserved-variables.js';

const reservedNameMessage =
	"The following names are reserved: 'year', 'month_word', 'month_num', 'day_word', 'day_num'";

const variableNameSchema = z
	.string()
	.trim()
	.min(1)
	.max(100)
	.refine((name) => !isReservedVariableName(name), { message: reservedNameMessage });

export const variableSchema = registry.register(
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
		name: variableNameSchema.openapi({ example: 'linkedin' }),
		value: z.string().min(1).max(20000).openapi({ example: 'https://linkedin.com/...' })
	})
);

export const updateVariableSchema = registry.register(
	'UpdateVariableBody',
	z
		.object({
			name: variableNameSchema.optional().openapi({ example: 'company_name' }),
			value: z.string().min(1).max(20000).optional().openapi({ example: 'New company name' })
		})
		.refine((body) => Object.keys(body).length > 0, { message: 'Nothing to update' })
);

export const variableListSchema = registry.register(
	'VariableList',
	z.object({
		variables: z.array(variableSchema)
	})
);

export type Variable = z.infer<typeof variableSchema>;
export type CreateVariableInput = z.infer<typeof createVariableSchema>;
export type UpdateVariableInput = z.infer<typeof updateVariableSchema>;
export type VariableList = z.infer<typeof variableListSchema>;
