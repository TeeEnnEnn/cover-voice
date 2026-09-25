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
