import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
	blockTable,
	blockVariableTable,
	letterBlockTable,
	letterTable,
	letterVariableTable,
	variableTable
} from '../db/schema.js';
import { collectLetterRefs, extractReferenceNames } from './replacement.js';
import type { LetterGeneration } from '../schemas/letters.js';

type BlockRow = typeof blockTable.$inferSelect;
type VariableRow = typeof variableTable.$inferSelect;

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DatabaseOrTransaction = typeof db | Transaction;

function resolveIds(
	names: Array<string>,
	rows: Array<{ name: string; id: string }>
): Array<string> {
	const byName = new Map(rows.map((row) => [row.name, row.id]));
	const ids = new Set<string>();
	for (const name of names) {
		const id = byName.get(name);
		if (id !== undefined) ids.add(id);
	}
	return Array.from(ids);
}

async function userBlocks(
	transaction: DatabaseOrTransaction,
	userId: string
): Promise<Array<BlockRow>> {
	return transaction.select().from(blockTable).where(eq(blockTable.userId, userId));
}

async function userVariables(
	transaction: DatabaseOrTransaction,
	userId: string
): Promise<Array<VariableRow>> {
	return transaction.select().from(variableTable).where(eq(variableTable.userId, userId));
}

/**
 * Reconciles the `block_variable` rows for a single block: deletes all
 * existing rows, then inserts rows for the `{{variables}}` referenced by the
 * block value. Best-effort: an unparseable value yields zero rows and unknown
 * names are skipped, so dangling references never fail a save.
 *
 * @returns The variable ids now linked to the block.
 */
export async function syncBlockVariables(
	transaction: DatabaseOrTransaction,
	userId: string,
	blockId: string,
	blockValue: string,
	variables?: Array<VariableRow>
): Promise<Array<string>> {
	const vars = variables ?? (await userVariables(transaction, userId));
	const parsed = extractReferenceNames(blockValue, 'variable');
	const ids = parsed.ok ? resolveIds(parsed.names, vars) : [];
	await transaction.delete(blockVariableTable).where(eq(blockVariableTable.blockId, blockId));
	if (ids.length > 0) {
		await transaction
			.insert(blockVariableTable)
			.values(ids.map((variableId) => ({ blockId, variableId, userId })));
	}
	return ids;
}

/**
 * Reconciles the `letter_block` / `letter_variable` rows for a letter:
 * deletes all existing rows, then inserts the given ids. Empty sets delete
 * everything, which is the correct "true zero" state.
 */
export async function syncLetterLinks(
	transaction: DatabaseOrTransaction,
	userId: string,
	letterId: string,
	blockIds: Array<string>,
	variableIds: Array<string>
): Promise<void> {
	await transaction.delete(letterBlockTable).where(eq(letterBlockTable.letterId, letterId));
	await transaction.delete(letterVariableTable).where(eq(letterVariableTable.letterId, letterId));
	const uniqueBlockIds = Array.from(new Set(blockIds));
	const uniqueVariableIds = Array.from(new Set(variableIds));
	if (uniqueBlockIds.length > 0) {
		await transaction
			.insert(letterBlockTable)
			.values(uniqueBlockIds.map((blockId) => ({ letterId, blockId, userId })));
	}
	if (uniqueVariableIds.length > 0) {
		await transaction
			.insert(letterVariableTable)
			.values(uniqueVariableIds.map((variableId) => ({ letterId, variableId, userId })));
	}
}

/**
 * Extracts the section texts ({@link LetterGeneration} `rawContent` shape)
 * from a stored jsonb value. Returns null when the value is missing or not
 * section-shaped, which the callers treat as "no references".
 */
export function toLetterSections(value: unknown): LetterGeneration['sections'] | null {
	if (typeof value !== 'object' || value === null) return null;
	const sections = (value as { sections?: unknown }).sections;
	if (typeof sections !== 'object' || sections === null) return null;
	const { header, body, footer } = sections as Record<string, { text?: unknown } | undefined>;
	for (const section of [header, body, footer]) {
		if (typeof section !== 'object' || section === null) return null;
		if (section.text !== null && typeof section.text !== 'string') return null;
	}
	return sections as LetterGeneration['sections'];
}

/**
 * Reconciles one letter's links from section texts. Unparseable sections and
 * unknown names yield zero rows for that letter (best-effort, never throws
 * for reference errors). Use {@link collectLetterRefs} directly when a
 * reference error must abort the operation instead (letter generation).
 */
export async function syncLetterFromSections(
	transaction: DatabaseOrTransaction,
	userId: string,
	letterId: string,
	sections: LetterGeneration['sections'],
	blocks: Array<BlockRow>,
	variables: Array<VariableRow>
): Promise<void> {
	const collected = collectLetterRefs(sections, blocks, variables);
	if (!collected.ok) {
		await syncLetterLinks(transaction, userId, letterId, [], []);
		return;
	}
	await syncLetterLinks(
		transaction,
		userId,
		letterId,
		collected.value.blockIds,
		collected.value.variableIds
	);
}

/**
 * Reconciles every `letter_block` / `letter_variable` row of a user from the
 * stored `rawContent` of each letter. Run after anything that can change name
 * resolution across letters: block create/update (name or value) and variable
 * create/rename.
 */
export async function resyncUserLetters(
	transaction: DatabaseOrTransaction,
	userId: string,
	blocks?: Array<BlockRow>,
	variables?: Array<VariableRow>
): Promise<void> {
	const allBlocks = blocks ?? (await userBlocks(transaction, userId));
	const allVariables = variables ?? (await userVariables(transaction, userId));
	const letters = await transaction
		.select()
		.from(letterTable)
		.where(eq(letterTable.userId, userId));
	for (const letter of letters) {
		const sections = toLetterSections(letter.rawContent);
		if (sections === null) {
			await syncLetterLinks(transaction, userId, letter.id, [], []);
			continue;
		}
		await syncLetterFromSections(transaction, userId, letter.id, sections, allBlocks, allVariables);
	}
}

/**
 * Full reconcile of a user's derived usage data: every block's
 * `block_variable` rows plus every letter's links. Run after variable
 * create/rename, which can change resolution everywhere.
 */
export async function resyncUserUsage(
	transaction: DatabaseOrTransaction,
	userId: string
): Promise<void> {
	const [blocks, variables] = await Promise.all([
		userBlocks(transaction, userId),
		userVariables(transaction, userId)
	]);
	for (const block of blocks) {
		await syncBlockVariables(transaction, userId, block.id, block.value, variables);
	}
	await resyncUserLetters(transaction, userId, blocks, variables);
}
