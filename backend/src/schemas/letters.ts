import z from 'zod';
import { registry } from '../openapi/registry.js';

export const letterConfigSchema = registry.register(
	'LetterConfigSchema',
	z.object({
		font: z.enum(['Courier', 'Helvetica', 'Times-Roman']).openapi({ example: 'Courier' }),
		fontSize: z.number().openapi({ example: 16 }).positive(),
		fontColor: z
			.string()
			.regex(/^#[0-9A-Fa-f]{6}$/)
			.openapi({ example: '#000000' }),
		backgroundColor: z
			.string()
			.regex(/^#[0-9A-Fa-f]{6}$/)
			.openapi({ example: '#ffffff' }),
		lineHeight: z.number().openapi({ example: 1.5 }),
		textDirection: z.enum(['ltr', 'rtl']).openapi({ example: 'ltr' }),
		pageSize: z.enum(['A4', 'LETTER']).openapi({ example: 'A4' }),
		marginLeft: z.number().openapi({ example: 10 }).nonnegative(), // points
		marginRight: z.number().openapi({ example: 10 }).nonnegative(), // points
		marginTop: z.number().openapi({ example: 10 }).nonnegative(), // points
		marginBottom: z.number().openapi({ example: 10 }).nonnegative() // points
	})
);

export const letterSectionSchema = registry.register("LetterSectionSchema", z.object({
				text: z.string().openapi({ example: 'blah blah blah' }).nullable(),
				align: z
					.enum(['left', 'right', 'center', 'justify'])
					.openapi({ example: 'left' })
					.default('left')
			}))

export const letterGenerationSchema = registry.register(
	'LetterGenerationSchema',
	z.object({
		config: letterConfigSchema,
		sections: z.object({
			header: letterSectionSchema,
			body: letterSectionSchema,
			footer: letterSectionSchema,
		})
	})
);

export const letterSchema = registry.register(
	'Letter',
	z.object({
		id: z.string().openapi({ example: 'abc123' }),
		userId: z.string().openapi({ example: 'abc123' }),
		createdAt: z.string().openapi({ format: 'date-time', example: '2026-08-13T00:00:00.000Z' }),
		updatedAt: z.string().openapi({ format: 'date-time', example: '2026-08-13T00:00:00.000Z' }),
		title: z.string().min(1).max(50).openapi({ example: 'Application at Acme' }),
		description: z.string().nullish().openapi({ example: 'Cover letter for Acme' }),
		rawContent: letterGenerationSchema, // will have substitution strings
		generatedContent: letterGenerationSchema // will not have substitution strings
	})
);

export const createLetterSchema = registry.register(
	'CreateLetterBody',
	z.object({
		title: z.string().min(1).max(50).openapi({ example: 'Application at Acme' }),
		description: z.string().nullish().openapi({ example: 'Cover letter for Acme' })
	})
);

export const updateLetterSchema = registry.register(
	'UpdateLetterBody',
	z.object({
		title: z.string().min(1).max(50).optional().openapi({ example: 'Application at Acme' }),
		description: z.string().nullable().optional().openapi({ example: 'Cover letter for Acme' }),
		rawContent: letterGenerationSchema,
		generatedContent: letterGenerationSchema
	})
);

export const generateLetterSchema = registry.register('GenerateLetterBody', letterGenerationSchema);

export const previewLetterSchema = registry.register('PreviewLetterBody', letterGenerationSchema);

export const letterListSchema = registry.register(
	'LetterList',
	z.object({
		letters: z.array(letterSchema)
	})
);

export type LetterConfig = z.infer<typeof letterConfigSchema>;
export type LetterSection = z.infer<typeof letterSectionSchema>
export type LetterGeneration = z.infer<typeof letterGenerationSchema>;
export type Letter = z.infer<typeof letterSchema>;
export type CreateLetterInput = z.infer<typeof createLetterSchema>;
export type UpdateLetterInput = z.infer<typeof updateLetterSchema>;
export type LetterList = z.infer<typeof letterListSchema>;
