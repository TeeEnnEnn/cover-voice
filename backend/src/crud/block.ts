import { db } from '../db/index.js';
import { blockTable } from '../db/schema.js';
import { desc, eq, and } from 'drizzle-orm';
import type { CreateBlockInput, UpdateBlockInput } from '../schemas/blocks.js';
import { resyncUserLetters, syncBlockVariables } from '../services/usage-sync.js';
import { stripUndefined } from './helpers.js';

export async function getBlocks(userId: string, pagination?: { limit: number; offset: number }) {
	const rows = await db
		.select()
		.from(blockTable)
		.where(eq(blockTable.userId, userId))
		.orderBy(desc(blockTable.updatedAt))
		.limit(pagination?.limit ?? 100)
		.offset(pagination?.offset ?? 0);
	return {
		blocks: rows
	};
}

export async function createBlock(userId: string, data: CreateBlockInput) {
	return db.transaction(async (tx) => {
		const inserted = (
			await tx
				.insert(blockTable)
				.values({
					userId,
					name: data.name,
					value: data.value
				})
				.returning()
		)[0];
		await syncBlockVariables(tx, userId, inserted.id, inserted.value);
		// A new block name may resolve previously-dangling {% %} refs in letters.
		await resyncUserLetters(tx, userId);
		return inserted;
	});
}

export async function updateBlock(userId: string, id: string, data: UpdateBlockInput) {
	return db.transaction(async (tx) => {
		const updated = (
			await tx
				.update(blockTable)
				.set(stripUndefined({ name: data.name, value: data.value }))
				.where(and(eq(blockTable.userId, userId), eq(blockTable.id, id)))
				.returning()
		)[0];
		if (!updated) return updated;
		await syncBlockVariables(tx, userId, updated.id, updated.value);
		// A name change alters {% %} resolution and a value change alters the
		// variables pulled in via expansion for every letter using this block.
		await resyncUserLetters(tx, userId);
		return updated;
	});
}

export async function deleteBlock(userId: string, id: string) {
	const result = await db
		.delete(blockTable)
		.where(and(eq(blockTable.userId, userId), eq(blockTable.id, id)))
		.returning();
	return result[0];
}
