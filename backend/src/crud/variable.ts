import { db } from '../db/index.js';
import {
	blockVariableTable,
	letterVariableOverrideTable,
	letterVariableTable,
	variableTable
} from '../db/schema.js';
import { desc, eq, and } from 'drizzle-orm';
import type { CreateVariableInput, UpdateVariableInput } from '../schemas/variables.js';
import { resyncUserUsage } from '../services/usage-sync.js';
import { stripUndefined } from './helpers.js';

export async function getVariables(userId: string, pagination?: { limit: number; offset: number }) {
	const rows = await db
		.select()
		.from(variableTable)
		.where(eq(variableTable.userId, userId))
		.orderBy(desc(variableTable.updatedAt))
		.limit(pagination?.limit ?? 100)
		.offset(pagination?.offset ?? 0);
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
				.set(stripUndefined({ name: data.name, value: data.value }))
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
	return db.transaction(async (tx) => {
		const existing = (
			await tx
				.select({ id: variableTable.id })
				.from(variableTable)
				.where(and(eq(variableTable.userId, userId), eq(variableTable.id, id)))
		)[0];
		if (!existing) return undefined;
		// FKs are restrict: clear junction rows explicitly, then resync so no
		// dangling references linger in other blocks' or letters' links.
		// Overrides cascade in the DB; delete explicitly too for the same reason.
		await tx.delete(blockVariableTable).where(eq(blockVariableTable.variableId, id));
		await tx.delete(letterVariableTable).where(eq(letterVariableTable.variableId, id));
		await tx
			.delete(letterVariableOverrideTable)
			.where(eq(letterVariableOverrideTable.variableId, id));
		const deleted = (
			await tx
				.delete(variableTable)
				.where(and(eq(variableTable.userId, userId), eq(variableTable.id, id)))
				.returning()
		)[0];
		await resyncUserUsage(tx, userId);
		return deleted;
	});
}
