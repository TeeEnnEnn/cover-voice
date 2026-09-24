import z from 'zod';
import { registry } from '../openapi/registry.js';
import { db } from '../db/index.js';
import {
	blockTable,
	letterBlockVersionsTable,
	letterTable,
	letterVariableVersionsTable,
	variableTable
} from '../db/schema.js';
import { desc, eq, and } from 'drizzle-orm';

export const letterSchema = registry.register(
	'Letter',
	z.object({
		id: z.string().openapi({ example: 'abc123' }),
		userId: z.string().openapi({ example: 'abc123' }),
		createdAt: z.string().openapi({ format: 'date-time', example: '2026-08-13T00:00:00.000Z' }),
		updatedAt: z.string().openapi({ format: 'date-time', example: '2026-08-13T00:00:00.000Z' }),
		title: z.string().min(1).max(50).openapi({ example: 'Application at Acme' }),
		description: z.string().nullish().openapi({ example: 'Cover letter for Acme' }),
		rawContent: z.record(z.string(), z.unknown()).nullable().openapi({ example: {} }),
		generatedContent: z.record(z.string(), z.unknown()).nullable().openapi({ example: {} })
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
		rawContent: z.record(z.string(), z.unknown()).nullable().optional().openapi({ example: {} }),
		generatedContent: z
			.record(z.string(), z.unknown())
			.nullable()
			.optional()
			.openapi({ example: {} })
	})
);

export const addLetterBlockSchema = registry.register(
	'AddLetterBlockBody',
	z.object({
		blockId: z.string().openapi({ example: 'abc123' })
	})
);

export const addLetterVariableSchema = registry.register(
	'AddLetterVariableBody',
	z.object({
		variableId: z.string().openapi({ example: 'abc123' })
	})
);

export const letterGenerationSchema = registry.register("LetterGenerationSchema", z.object({
  config: z.object({
    font: z.enum(["Courier", "Helvetica", "Times-Roman"]).openapi({ example: 'Courier' }),
    fontSize: z.number().openapi({ example: 16 }).positive(),
    fontColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).openapi({ example: '#000000' }),
    backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).openapi({ example: '#ffffff' }),
    lineHeight: z.number().openapi({ example: 1.5 }),
    textDirection: z.enum(['ltr', 'rtl']).openapi({ example: 'ltr' }),
    pageSize: z.enum(['A4', 'Letter']).openapi({ example: 'A4' }),
    marginLeft: z.number().openapi({ example: 10 }).nonnegative(), // points
    marginRight: z.number().openapi({ example: 10 }).nonnegative(), // points
    marginTop: z.number().openapi({ example: 10 }).nonnegative(), // points
    marginBottom: z.number().openapi({ example: 10 }).nonnegative(), // points
  }),
  sections: z.object({
    header: z.object({
      text: z.string().openapi({ example: 'address' }).nullable(),
      layout: z.enum(['left', 'right', 'center', "full"]).openapi({ example: 'left' }).default("right"),
    }),
    body: z.object({
      text: z.string().openapi({ example: 'main content' }).nullable(),
      layout: z.enum(['left', 'right', 'center', "full"]).openapi({ example: 'left' }).default("left"),
    }),
    footer: z.object({
      text: z.string().openapi({ example: 'signature and sign off' }).nullable(),
      layout: z.enum(['left', 'right', 'center', "full"]).openapi({ example: 'left' }).default("left"),
    }),
  })
}));

export const generateLetterSchema = registry.register('GenerateLetterBody', z.object({
  letterId: z.string().openapi({ example: "abc123" }),
  letterGenerationContent: letterGenerationSchema, // will still have substitution keys at this point
}));

export const letterBlockLinkSchema = registry.register(
	'LetterBlockLink',
	z.object({
		id: z.string().openapi({ example: 'abc123' }),
		letterId: z.string().openapi({ example: 'abc123' }),
		blockId: z.string().openapi({ example: 'abc123' }),
		capturedUpdatedAt: z
			.string()
			.openapi({ format: 'date-time', example: '2026-08-13T00:00:00.000Z' })
	})
);

export const letterVariableLinkSchema = registry.register(
	'LetterVariableLink',
	z.object({
		id: z.string().openapi({ example: 'abc123' }),
		letterId: z.string().openapi({ example: 'abc123' }),
		variableId: z.string().openapi({ example: 'abc123' }),
		capturedUpdatedAt: z
			.string()
			.openapi({ format: 'date-time', example: '2026-08-13T00:00:00.000Z' })
	})
);

export const letterListSchema = registry.register(
	'LetterList',
	z.object({
		letters: z.array(letterSchema)
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
	path: '/api/letters',
	summary: "List the current user's letters",
	tags: ['letters'],
	security: [{ cookieAuth: [] }],
	responses: {
		200: {
			description: "The current user's letters",
			content: { 'application/json': { schema: letterListSchema } }
		},
		401: {
			description: 'Not authenticated',
			content: { 'application/json': { schema: z.object({ message: z.string() }) } }
		}
	}
});

registry.registerPath({
	method: 'post',
	path: '/api/letters',
	summary: 'Create a letter for the current user',
	tags: ['letters'],
	security: [{ cookieAuth: [] }],
	request: {
		body: {
			content: { 'application/json': { schema: createLetterSchema } }
		}
	},
	responses: {
		201: {
			description: 'The created letter',
			content: { 'application/json': { schema: letterSchema } }
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
	path: '/api/letters/:id',
	summary: 'delete a letter for the current user',
	tags: ['letters'],
	security: [{ cookieAuth: [] }],
	request: {
		params: z.object({ id: z.string().openapi({ example: 'abc123' }) })
	},
	responses: {
		204: {
			description: 'Deleted successfully'
		},
		404: {
			description: 'Letter does not exist',
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
	path: '/api/letters/:id',
	summary: 'Update a letter for the current user.',
	tags: ['letters'],
	security: [{ cookieAuth: [] }],
	request: {
		body: {
			content: { 'application/json': { schema: updateLetterSchema } }
		},
		params: z.object({ id: z.string().openapi({ example: 'abc123' }) })
	},
	responses: {
		200: {
			description: 'The updated letter',
			content: { 'application/json': { schema: letterSchema } }
		},
		404: {
			description: 'Letter does not exist',
			content: { 'application/json': { schema: validationError } }
		},
		400: {
			description: 'Invalid body',
			content: { 'application/json': { schema: validationError } }
		}
	}
});

registry.registerPath({
	method: 'get',
	path: '/api/letters/:id',
	summary: 'Get a single letter for the current user.',
	tags: ['letters'],
	security: [{ cookieAuth: [] }],
	request: {
		params: z.object({ id: z.string().openapi({ example: 'abc123' }) })
	},
	responses: {
		200: {
			description: 'The requested letter',
			content: { 'application/json': { schema: letterSchema } }
		},
		404: {
			description: 'Letter does not exist',
			content: { 'application/json': { schema: validationError } }
		},
		401: {
			description: 'Not authenticated',
			content: { 'application/json': { schema: z.object({ message: z.string() }) } }
		}
	}
});

registry.registerPath({
	method: 'post',
	path: '/api/letters/:id/blocks',
	summary: 'Pin a block to a letter (stub: records the block version).',
	tags: ['letters'],
	security: [{ cookieAuth: [] }],
	request: {
		params: z.object({ id: z.string().openapi({ example: 'abc123' }) }),
		body: {
			content: { 'application/json': { schema: addLetterBlockSchema } }
		}
	},
	responses: {
		201: {
			description: 'The pinned block link',
			content: { 'application/json': { schema: letterBlockLinkSchema } }
		},
		400: {
			description: 'Invalid body',
			content: { 'application/json': { schema: validationError } }
		},
		404: {
			description: 'Letter or block does not exist',
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
	path: '/api/letters/:id/blocks/:blockId',
	summary: 'Unpin a block from a letter (stub).',
	tags: ['letters'],
	security: [{ cookieAuth: [] }],
	request: {
		params: z.object({
			id: z.string().openapi({ example: 'abc123' }),
			blockId: z.string().openapi({ example: 'abc123' })
		})
	},
	responses: {
		204: {
			description: 'Unpinned successfully'
		},
		404: {
			description: 'Letter or pinned block does not exist',
			content: { 'application/json': { schema: validationError } }
		},
		401: {
			description: 'Not authenticated',
			content: { 'application/json': { schema: z.object({ message: z.string() }) } }
		}
	}
});

registry.registerPath({
	method: 'post',
	path: '/api/letters/:id/variables',
	summary: 'Pin a variable to a letter (stub: records the variable version).',
	tags: ['letters'],
	security: [{ cookieAuth: [] }],
	request: {
		params: z.object({ id: z.string().openapi({ example: 'abc123' }) }),
		body: {
			content: { 'application/json': { schema: addLetterVariableSchema } }
		}
	},
	responses: {
		201: {
			description: 'The pinned variable link',
			content: { 'application/json': { schema: letterVariableLinkSchema } }
		},
		400: {
			description: 'Invalid body',
			content: { 'application/json': { schema: validationError } }
		},
		404: {
			description: 'Letter or variable does not exist',
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
	path: '/api/letters/:id/variables/:variableId',
	summary: 'Unpin a variable from a letter (stub).',
	tags: ['letters'],
	security: [{ cookieAuth: [] }],
	request: {
		params: z.object({
			id: z.string().openapi({ example: 'abc123' }),
			variableId: z.string().openapi({ example: 'abc123' })
		})
	},
	responses: {
		204: {
			description: 'Unpinned successfully'
		},
		404: {
			description: 'Letter or pinned variable does not exist',
			content: { 'application/json': { schema: validationError } }
		},
		401: {
			description: 'Not authenticated',
			content: { 'application/json': { schema: z.object({ message: z.string() }) } }
		}
	}
});

registry.registerPath({
	method: 'post',
	path: '/api/letters/:id/generate',
	summary: 'Generate letter content from pinned blocks/variables (stub: not implemented).',
	tags: ['letters'],
	security: [{ cookieAuth: [] }],
	request: {
		params: z.object({ id: z.string().openapi({ example: 'abc123' }) }),
		body: {
			content: { 'application/json': { schema: generateLetterSchema } }
		}
	},
	responses: {
		501: {
			description: 'Not implemented',
			content: { 'application/json': { schema: validationError } }
		},
		404: {
			description: 'Letter does not exist',
			content: { 'application/json': { schema: validationError } }
		},
		401: {
			description: 'Not authenticated',
			content: { 'application/json': { schema: z.object({ message: z.string() }) } }
		}
	}
});

export async function getLetters(userId: string) {
	const rows = await db
		.select()
		.from(letterTable)
		.where(eq(letterTable.userId, userId))
		.orderBy(desc(letterTable.updatedAt));
	return {
		letters: rows
	};
}

export async function createLetter(
	userId: string,
	data: { title: string; description?: string | null }
) {
	const result = await db
		.insert(letterTable)
		.values({
			userId,
			title: data.title,
			description: data.description ?? null
		})
		.returning();
	return result[0];
}

export async function updateLetter(
	userId: string,
	id: string,
	data: Partial<{
		title: string;
		description: string | null;
		rawContent: unknown;
		generatedContent: unknown;
	}>
) {
	const result = await db
		.update(letterTable)
		.set({
			title: data.title,
			description: data.description,
			rawContent: data.rawContent,
			generatedContent: data.generatedContent
		})
		.where(and(eq(letterTable.userId, userId), eq(letterTable.id, id)))
		.returning();
	return result.length === 0 ? null : result[0];
}

export async function deleteLetter(userId: string, id: string) {
	const result = await db
		.delete(letterTable)
		.where(and(eq(letterTable.userId, userId), eq(letterTable.id, id)))
		.returning();
	return result.length === 0 ? null : result[0];
}

export async function getLetterById(userId: string, id: string) {
	const result = await db
		.select()
		.from(letterTable)
		.where(and(eq(letterTable.userId, userId), eq(letterTable.id, id)));

	return result.length === 0 ? null : result[0];
}

export async function addLetterBlock(userId: string, letterId: string, blockId: string) {
	const userLetter = await db
		.select()
		.from(letterTable)
		.where(and(eq(letterTable.id, letterId), eq(letterTable.userId, userId)));
	const userBlock = await db
		.select()
		.from(blockTable)
		.where(and(eq(blockTable.id, blockId), eq(blockTable.userId, userId)));
	if (userLetter.length === 0 || userBlock.length === 0) {
		return null;
	}
	const result = await db
		.insert(letterBlockVersionsTable)
		.values({
			letterId: letterId,
			blockId: blockId,
			capturedUpdatedAt: userBlock[0].updatedAt
		})
		.onConflictDoNothing()
		.returning();
	if (result.length > 0) {
		return result[0];
	}
	const existing = await db
		.select()
		.from(letterBlockVersionsTable)
		.where(
			and(
				eq(letterBlockVersionsTable.letterId, letterId),
				eq(letterBlockVersionsTable.blockId, blockId)
			)
		);
	return existing[0] ?? null;
}

export async function removeLetterBlock(userId: string, letterId: string, blockId: string) {
	const letter = await db
		.select()
		.from(letterTable)
		.where(and(eq(letterTable.userId, userId), eq(letterTable.id, letterId)));

	if (letter.length === 0) {
		return null;
	}

	const result = await db
		.delete(letterBlockVersionsTable)
		.where(
			and(
				eq(letterBlockVersionsTable.letterId, letterId),
				eq(letterBlockVersionsTable.blockId, blockId)
			)
		)
		.returning();
	return result.length === 0 ? null : result[0];
}

export async function addLetterVariable(userId: string, letterId: string, variableId: string) {
	const userLetter = await db
		.select()
		.from(letterTable)
		.where(and(eq(letterTable.id, letterId), eq(letterTable.userId, userId)));
	const userVariable = await db
		.select()
		.from(variableTable)
		.where(and(eq(variableTable.id, variableId), eq(variableTable.userId, userId)));
	if (userLetter.length === 0 || userVariable.length === 0) {
		return null;
	}
	const result = await db
		.insert(letterVariableVersionsTable)
		.values({
			letterId: letterId,
			variableId: variableId,
			capturedUpdatedAt: userVariable[0].updatedAt
		})
		.onConflictDoNothing()
		.returning();
	if (result.length > 0) {
		return result[0];
	}
	const existing = await db
		.select()
		.from(letterVariableVersionsTable)
		.where(
			and(
				eq(letterVariableVersionsTable.letterId, letterId),
				eq(letterVariableVersionsTable.variableId, variableId)
			)
		);
	return existing[0] ?? null;
}
export async function removeLetterVariable(userId: string, letterId: string, variableId: string) {
	const letter = await db
		.select()
		.from(letterTable)
		.where(and(eq(letterTable.userId, userId), eq(letterTable.id, letterId)));

	if (letter.length === 0) {
		return null;
	}

	const result = await db
		.delete(letterVariableVersionsTable)
		.where(
			and(
				eq(letterVariableVersionsTable.letterId, letterId),
				eq(letterVariableVersionsTable.variableId, variableId)
			)
		)
		.returning();
	return result.length === 0 ? null : result[0];
}

export async function generateLetter(_userId: string, _letterId: string) {
	throw new Error('Not implemented');
}
