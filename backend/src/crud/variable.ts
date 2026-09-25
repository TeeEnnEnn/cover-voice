import { db } from '../db/index.js';
import { variableTable } from '../db/schema.js';
import { desc, eq, and } from 'drizzle-orm';
import type { CreateVariableInput, UpdateVariableInput } from '../schemas/variables.js';

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
	const result = await db
		.insert(variableTable)
		.values({
			userId,
			name: data.name,
			value: data.value
		})
		.returning();
	return result[0];
}

export async function updateVariable(userId: string, id: string, data: UpdateVariableInput) {
	const result = await db
		.update(variableTable)
		.set({
			name: data.name,
			value: data.value
		})
		.where(and(eq(variableTable.userId, userId), eq(variableTable.id, id)))
		.returning();
	return result[0];
}

export async function deleteVariable(userId: string, id: string) {
	const result = await db
		.delete(variableTable)
		.where(and(eq(variableTable.userId, userId), eq(variableTable.id, id)))
		.returning();
	return result[0];
}
