import z from 'zod';

export const validationErrorSchema = z.object({
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

export type ValidationError = z.infer<typeof validationErrorSchema>;

export const idParamSchema = z.object({
	id: z.string().min(1).openapi({ example: 'abc123' })
});

export const paginationQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(500).default(100).openapi({ example: 100 }),
	offset: z.coerce.number().int().min(0).default(0).openapi({ example: 0 })
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
