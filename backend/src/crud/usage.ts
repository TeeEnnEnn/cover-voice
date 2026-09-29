import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
	blockTable,
	blockVariableTable,
	letterBlockTable,
	letterTable,
	letterVariableTable,
	variableTable
} from '../db/schema.js';
import type { BlockUsage, LetterUsage, VariableUsage } from '../schemas/usage.js';

async function entityExists(
	table: typeof blockTable | typeof variableTable | typeof letterTable,
	userId: string,
	id: string
): Promise<boolean> {
	const rows = await db
		.select({ id: table.id })
		.from(table)
		.where(and(eq(table.userId, userId), eq(table.id, id)))
		.limit(1);
	return rows.length > 0;
}

export async function getBlockUsage(userId: string, blockId: string): Promise<BlockUsage | null> {
	if (!(await entityExists(blockTable, userId, blockId))) return null;
	const [letterLinks, variableLinks] = await Promise.all([
		db
			.select({ letterId: letterBlockTable.letterId, title: letterTable.title })
			.from(letterBlockTable)
			.innerJoin(letterTable, eq(letterBlockTable.letterId, letterTable.id))
			.where(and(eq(letterBlockTable.userId, userId), eq(letterBlockTable.blockId, blockId))),
		db
			.select({ variableId: blockVariableTable.variableId, name: variableTable.name })
			.from(blockVariableTable)
			.innerJoin(variableTable, eq(blockVariableTable.variableId, variableTable.id))
			.where(and(eq(blockVariableTable.userId, userId), eq(blockVariableTable.blockId, blockId)))
	]);
	return {
		blockId,
		letterCount: letterLinks.length,
		letters: letterLinks.map((row) => ({ id: row.letterId, name: row.title })),
		variableCount: variableLinks.length,
		variables: variableLinks.map((row) => ({ id: row.variableId, name: row.name }))
	};
}

export async function getVariableUsage(
	userId: string,
	variableId: string
): Promise<VariableUsage | null> {
	if (!(await entityExists(variableTable, userId, variableId))) return null;
	const [blockLinks, letterLinks] = await Promise.all([
		db
			.select({ blockId: blockVariableTable.blockId, name: blockTable.name })
			.from(blockVariableTable)
			.innerJoin(blockTable, eq(blockVariableTable.blockId, blockTable.id))
			.where(
				and(eq(blockVariableTable.userId, userId), eq(blockVariableTable.variableId, variableId))
			),
		db
			.select({ letterId: letterVariableTable.letterId, title: letterTable.title })
			.from(letterVariableTable)
			.innerJoin(letterTable, eq(letterVariableTable.letterId, letterTable.id))
			.where(
				and(eq(letterVariableTable.userId, userId), eq(letterVariableTable.variableId, variableId))
			)
	]);
	return {
		variableId,
		blockCount: blockLinks.length,
		blocks: blockLinks.map((row) => ({ id: row.blockId, name: row.name })),
		letterCount: letterLinks.length,
		letters: letterLinks.map((row) => ({ id: row.letterId, name: row.title }))
	};
}

export async function getLetterUsage(
	userId: string,
	letterId: string
): Promise<LetterUsage | null> {
	if (!(await entityExists(letterTable, userId, letterId))) return null;
	const [blockLinks, variableLinks] = await Promise.all([
		db
			.select({ blockId: letterBlockTable.blockId, name: blockTable.name })
			.from(letterBlockTable)
			.innerJoin(blockTable, eq(letterBlockTable.blockId, blockTable.id))
			.where(and(eq(letterBlockTable.userId, userId), eq(letterBlockTable.letterId, letterId))),
		db
			.select({ variableId: letterVariableTable.variableId, name: variableTable.name })
			.from(letterVariableTable)
			.innerJoin(variableTable, eq(letterVariableTable.variableId, variableTable.id))
			.where(
				and(eq(letterVariableTable.userId, userId), eq(letterVariableTable.letterId, letterId))
			)
	]);
	return {
		letterId,
		blockCount: blockLinks.length,
		blocks: blockLinks.map((row) => ({ id: row.blockId, name: row.name })),
		variableCount: variableLinks.length,
		variables: variableLinks.map((row) => ({ id: row.variableId, name: row.name }))
	};
}
