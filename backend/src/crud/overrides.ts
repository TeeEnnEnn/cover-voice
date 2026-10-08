import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { letterTable, letterVariableOverrideTable, variableTable } from '../db/schema.js';
import type { DatabaseOrTransaction } from '../services/usage-sync.js';
import type { VariableOverrides } from '../services/replacement.js';

export type LetterOverrideRow = {
	letterId: string;
	variableId: string;
	variableName: string;
	value: string;
};

async function letterOwned(
	transaction: DatabaseOrTransaction,
	userId: string,
	letterId: string
): Promise<boolean> {
	const rows = await transaction
		.select({ id: letterTable.id })
		.from(letterTable)
		.where(and(eq(letterTable.userId, userId), eq(letterTable.id, letterId)))
		.limit(1);
	return rows.length > 0;
}

async function variableOwned(
	transaction: DatabaseOrTransaction,
	userId: string,
	variableId: string
): Promise<boolean> {
	const rows = await transaction
		.select({ id: variableTable.id })
		.from(variableTable)
		.where(and(eq(variableTable.userId, userId), eq(variableTable.id, variableId)))
		.limit(1);
	return rows.length > 0;
}

export async function getLetterOverrides(
	userId: string,
	letterId: string
): Promise<LetterOverrideRow[] | null> {
	const letter = await db
		.select({ id: letterTable.id })
		.from(letterTable)
		.where(and(eq(letterTable.userId, userId), eq(letterTable.id, letterId)))
		.limit(1);
	if (letter.length === 0) return null;
	const rows = await db
		.select({
			letterId: letterVariableOverrideTable.letterId,
			variableId: letterVariableOverrideTable.variableId,
			variableName: variableTable.name,
			value: letterVariableOverrideTable.value
		})
		.from(letterVariableOverrideTable)
		.innerJoin(variableTable, eq(letterVariableOverrideTable.variableId, variableTable.id))
		.where(
			and(
				eq(letterVariableOverrideTable.userId, userId),
				eq(letterVariableOverrideTable.letterId, letterId)
			)
		);
	return rows;
}

/** Fetches this letter's overrides as a variableId → value map for substitution. */
export async function getLetterOverrideMap(
	transaction: DatabaseOrTransaction,
	userId: string,
	letterId: string
): Promise<VariableOverrides> {
	const rows = await transaction
		.select({
			variableId: letterVariableOverrideTable.variableId,
			value: letterVariableOverrideTable.value
		})
		.from(letterVariableOverrideTable)
		.where(
			and(
				eq(letterVariableOverrideTable.userId, userId),
				eq(letterVariableOverrideTable.letterId, letterId)
			)
		);
	return new Map(rows.map((row) => [row.variableId, row.value]));
}

export async function upsertLetterOverride(
	userId: string,
	letterId: string,
	variableId: string,
	value: string
): Promise<LetterOverrideRow | null> {
	return db.transaction(async (tx) => {
		const [hasLetter, hasVariable] = await Promise.all([
			letterOwned(tx, userId, letterId),
			variableOwned(tx, userId, variableId)
		]);
		if (!hasLetter || !hasVariable) return null;
		const existing = await tx
			.select()
			.from(letterVariableOverrideTable)
			.where(
				and(
					eq(letterVariableOverrideTable.userId, userId),
					eq(letterVariableOverrideTable.letterId, letterId),
					eq(letterVariableOverrideTable.variableId, variableId)
				)
			)
			.limit(1);
		if (existing.length > 0) {
			await tx
				.update(letterVariableOverrideTable)
				.set({ value })
				.where(
					and(
						eq(letterVariableOverrideTable.userId, userId),
						eq(letterVariableOverrideTable.letterId, letterId),
						eq(letterVariableOverrideTable.variableId, variableId)
					)
				);
		} else {
			await tx.insert(letterVariableOverrideTable).values({ letterId, variableId, userId, value });
		}
		const variable = (
			await tx
				.select({ name: variableTable.name })
				.from(variableTable)
				.where(and(eq(variableTable.userId, userId), eq(variableTable.id, variableId)))
				.limit(1)
		)[0];
		return {
			letterId,
			variableId,
			variableName: variable?.name ?? '',
			value
		};
	});
}

/**
 * Deletes a single override. Returns null when the letter or variable
 * doesn't exist (404); otherwise true — idempotent when no override row
 * existed.
 */
export async function deleteLetterOverride(
	userId: string,
	letterId: string,
	variableId: string
): Promise<boolean | null> {
	return db.transaction(async (tx) => {
		const [hasLetter, hasVariable] = await Promise.all([
			letterOwned(tx, userId, letterId),
			variableOwned(tx, userId, variableId)
		]);
		if (!hasLetter || !hasVariable) return null;
		await tx
			.delete(letterVariableOverrideTable)
			.where(
				and(
					eq(letterVariableOverrideTable.userId, userId),
					eq(letterVariableOverrideTable.letterId, letterId),
					eq(letterVariableOverrideTable.variableId, variableId)
				)
			);
		return true;
	});
}
