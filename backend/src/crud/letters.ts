import { db } from '../db/index.js';
import { blockTable, letterTable, variableTable } from '../db/schema.js';
import { desc, eq, and } from 'drizzle-orm';
import type { CreateLetterInput, LetterGeneration } from '../schemas/letters.js';

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

export async function generateLetter(
	userId: string,
	letterId: string,
	letterGenerationContent: LetterGeneration
) {
	const letter = await db
		.select()
		.from(letterTable)
		.where(and(eq(letterTable.userId, userId), eq(letterTable.id, letterId)));

	if (letter.length === 0) {
		return null;
	}

  const blocks = await db.select().from(blockTable).where(eq(blockTable.userId, userId));
  const variables = await db.select().from(variableTable).where(eq(variableTable.userId, userId));

  // remove all existing links for blocks and variables
  // for block<->variable in  block<->variable[]: delete block<->variable
  // for block<->letter in block<->letter[]: delete block<->letter
  // for variable<->letter in variable<->letter[]: delete variable<->letter


	void letterGenerationContent;
}
