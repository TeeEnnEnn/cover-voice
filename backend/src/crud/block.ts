import { db } from '../db/index.js';
import { blockTable } from '../db/schema.js';
import { desc, eq, and } from 'drizzle-orm';
import type { CreateBlockInput, UpdateBlockInput } from '../schemas/blocks.js';

export async function getBlocks(userId: string) {
	const rows = await db
		.select()
		.from(blockTable)
		.where(eq(blockTable.userId, userId))
		.orderBy(desc(blockTable.updatedAt));
	return {
		blocks: rows
	};
}

export async function createBlock(userId: string, data: CreateBlockInput) {
	const result = await db
		.insert(blockTable)
		.values({
			userId,
			name: data.name,
			value: data.value
		})
		.returning();
	return result[0];
}

export async function updateBlock(userId: string, id: string, data: UpdateBlockInput) {
	const result = await db
		.update(blockTable)
		.set({
			name: data.name,
			value: data.value
		})
		.where(and(eq(blockTable.userId, userId), eq(blockTable.id, id)))
		.returning();
	return result[0];
}

export async function deleteBlock(userId: string, id: string) {
	const result = await db
		.delete(blockTable)
		.where(and(eq(blockTable.userId, userId), eq(blockTable.id, id)))
		.returning();
	return result[0];
}
