import { db } from '../db/index.js';
import {
	blockTable,
	letterBlockTable,
	letterTable,
	letterVariableTable,
	variableTable
} from '../db/schema.js';
import { desc, eq, and } from 'drizzle-orm';
import type { CreateLetterInput, LetterGeneration } from '../schemas/letters.js';
import { collectLetterRefs } from '../services/replacement.js';
import type { CollectLetterRefsError } from '../services/replacement.js';
import { renderLetterPdf } from '../services/pdf.js';
import {
	syncLetterFromSections,
	syncLetterLinks,
	toLetterSections
} from '../services/usage-sync.js';
import { stripUndefined } from './helpers.js';

export async function getLetters(userId: string, pagination?: { limit: number; offset: number }) {
	const rows = await db
		.select()
		.from(letterTable)
		.where(eq(letterTable.userId, userId))
		.orderBy(desc(letterTable.updatedAt))
		.limit(pagination?.limit ?? 100)
		.offset(pagination?.offset ?? 0);
	return {
		letters: rows
	};
}

export async function createLetter(userId: string, data: CreateLetterInput) {
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
	return db.transaction(async (tx) => {
		const updated = (
			await tx
				.update(letterTable)
				.set(
					stripUndefined({
						title: data.title,
						description: data.description,
						rawContent: data.rawContent,
						generatedContent: data.generatedContent
					})
				)
				.where(and(eq(letterTable.userId, userId), eq(letterTable.id, id)))
				.returning()
		)[0];
		if (!updated || data.rawContent === undefined) return updated ?? null;
		// Best-effort: unparseable content yields zero links, but the save succeeds.
		const sections = toLetterSections(data.rawContent);
		if (sections === null) {
			await syncLetterLinks(tx, userId, id, [], []);
			return updated;
		}
		const [blocks, variables] = await Promise.all([
			tx.select().from(blockTable).where(eq(blockTable.userId, userId)),
			tx.select().from(variableTable).where(eq(variableTable.userId, userId))
		]);
		await syncLetterFromSections(tx, userId, id, sections, blocks, variables);
		return updated;
	});
}

export async function deleteLetter(userId: string, id: string) {
	return db.transaction(async (tx) => {
		const existing = (
			await tx
				.select({ id: letterTable.id })
				.from(letterTable)
				.where(and(eq(letterTable.userId, userId), eq(letterTable.id, id)))
		)[0];
		if (!existing) return null;
		// FKs are restrict: clear this letter's junction rows first.
		await tx.delete(letterBlockTable).where(eq(letterBlockTable.letterId, id));
		await tx.delete(letterVariableTable).where(eq(letterVariableTable.letterId, id));
		const deleted = await tx
			.delete(letterTable)
			.where(and(eq(letterTable.userId, userId), eq(letterTable.id, id)))
			.returning();
		return deleted.length === 0 ? null : deleted[0];
	});
}

export async function getLetterById(userId: string, id: string) {
	const result = await db
		.select()
		.from(letterTable)
		.where(and(eq(letterTable.userId, userId), eq(letterTable.id, id)));

	return result.length === 0 ? null : result[0];
}

export type GenerateLetterResult =
	| { ok: true; letter: typeof letterTable.$inferSelect; pdf: Buffer; error: null }
	| { ok: false; letter: null; error: CollectLetterRefsError };

export type ResolveAndRenderResult =
	| {
			ok: true;
			value: {
				blockIds: Array<string>;
				variableIds: Array<string>;
				generated: LetterGeneration;
				pdf: Buffer;
			};
			error: null;
	  }
	| { ok: false; value: null; error: CollectLetterRefsError };

/**
 * Shared resolve → render pipeline behind both letter endpoints: resolves
 * section references against the user's blocks/variables and renders the
 * result to PDF. Pure read path — writes nothing to the database.
 */
export async function resolveAndRender(
	userId: string,
	letterGenerationContent: LetterGeneration
): Promise<ResolveAndRenderResult> {
	const [blocks, variables] = await Promise.all([
		db.select().from(blockTable).where(eq(blockTable.userId, userId)),
		db.select().from(variableTable).where(eq(variableTable.userId, userId))
	]);

	const collected = collectLetterRefs(letterGenerationContent.sections, blocks, variables);
	if (!collected.ok) {
		return { ok: false, value: null, error: collected.error };
	}

	const generated: LetterGeneration = {
		config: letterGenerationContent.config,
		sections: {
			header: {
				text: collected.value.replacedText.header,
				align: letterGenerationContent.sections.header.align
			},
			body: {
				text: collected.value.replacedText.body,
				align: letterGenerationContent.sections.body.align
			},
			footer: {
				text: collected.value.replacedText.footer,
				align: letterGenerationContent.sections.footer.align
			}
		}
	};
	const pdf = await renderLetterPdf(generated);
	return {
		ok: true,
		value: {
			blockIds: collected.value.blockIds,
			variableIds: collected.value.variableIds,
			generated,
			pdf
		},
		error: null
	};
}

/**
 * Renders a letter's sections and reconciles its junction rows. Returns null
 * when the letter doesn't exist. On a reference error nothing is written —
 * neither content nor junction rows — so the tables keep reflecting the last
 * successful generation. The returned pdf renders the persisted content.
 */
export async function generateLetter(
	userId: string,
	letterId: string,
	letterGenerationContent: LetterGeneration
): Promise<GenerateLetterResult | null> {
	const letter = await db
		.select()
		.from(letterTable)
		.where(and(eq(letterTable.userId, userId), eq(letterTable.id, letterId)));

	if (letter.length === 0) {
		return null;
	}

	const resolved = await resolveAndRender(userId, letterGenerationContent);
	if (!resolved.ok) {
		return { ok: false, letter: null, error: resolved.error };
	}

	const updated = await db.transaction(async (tx) => {
		// Delete-all existing links first, then insert the fresh set, so the
		// junction tables always reflect the true usage of this generation.
		await syncLetterLinks(
			tx,
			userId,
			letterId,
			resolved.value.blockIds,
			resolved.value.variableIds
		);

		const rows = await tx
			.update(letterTable)
			.set({
				rawContent: letterGenerationContent,
				generatedContent: resolved.value.generated
			})
			.where(and(eq(letterTable.userId, userId), eq(letterTable.id, letterId)))
			.returning();
		return rows.length === 0 ? null : rows[0];
	});
	if (!updated) return null;
	return { ok: true, letter: updated, error: null, pdf: resolved.value.pdf };
}
