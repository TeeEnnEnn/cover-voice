import { db } from '../db/index.js';
import { variableTable } from '../db/schema.js';
import { desc, eq, and } from 'drizzle-orm';
import type { CreateVariableInput, UpdateVariableInput } from '../schemas/variables.js';
import { resyncUserUsage } from '../services/usage-sync.js';

export async function getVariables(userId: string) {
	const rows = await db
		.select()
		.from(variableTable)
		.where(eq(variableTable.userId, userId))
		.orderBy(desc(variableTable.updatedAt));
	return {
		variables: rows
	};
}

export async function createVariable(userId: string, data: CreateVariableInput) {
	return db.transaction(async (tx) => {
		const inserted = (
			await tx
				.insert(variableTable)
				.values({
					userId,
					name: data.name,
					value: data.value
				})
				.returning()
		)[0];
		// A new variable name may resolve previously-dangling {{ }} refs in
		// blocks and letters.
		await resyncUserUsage(tx, userId);
		return inserted;
	});
}

export async function updateVariable(userId: string, id: string, data: UpdateVariableInput) {
	return db.transaction(async (tx) => {
		const current = (
			await tx
				.select()
				.from(variableTable)
				.where(and(eq(variableTable.userId, userId), eq(variableTable.id, id)))
		)[0];
		if (!current) return current;
		const updated = (
			await tx
				.update(variableTable)
				.set({
					name: data.name,
					value: data.value
				})
				.where(and(eq(variableTable.userId, userId), eq(variableTable.id, id)))
				.returning()
		)[0];
		// Only a rename changes {{ }} resolution; values carry no references.
		if (data.name !== undefined && data.name !== current.name) {
			await resyncUserUsage(tx, userId);
		}
		return updated;
	});
}

export async function deleteVariable(userId: string, id: string) {
	const result = await db
		.delete(variableTable)
		.where(and(eq(variableTable.userId, userId), eq(variableTable.id, id)))
		.returning();
	return result[0];
}
