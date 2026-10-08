import type { blockTable, variableTable } from '../db/schema.js';
import { getReservedVariableValues } from './reserved-variables.js';

type Block = typeof blockTable.$inferSelect; // createdAt: Date
type Variable = typeof variableTable.$inferSelect; // createdAt: Date

export type ReplacementError = {
	hint: string;
	type: 'block' | 'variable';
	context: string;
};

type SubstitutionPoint = {
	captureStart: number;
	captureEnd: number;
};

export type ReplacementEntityData = {
	id: string;
	value: string;
	/**
	 * When true the entry still substitutes but its id is excluded from
	 * `blocksUsed` / `variablesUsed` (used for reserved variables, which
	 * have no row to link in the usage junction tables).
	 */
	noTrack?: boolean;
};

export type ReplacementResult = {
	/** ids of blocks used */
	blocksUsed: Array<string>;
	/** ids of variables used */
	variablesUsed: Array<string>;
	replacedText: string;
};

export type ReplaceOutcome =
	| { ok: true; value: ReplacementResult; error: null }
	| { ok: false; value: null; error: ReplacementError };

const BLOCK_START_1 = '{';
const BLOCK_START_2 = '%';

const VARIABLE_START_1 = '{';
const VARIABLE_START_2 = '{';

const VARIABLE_END_1 = '}';
const VARIABLE_END_2 = '}';

const BLOCK_END_1 = '%';
const BLOCK_END_2 = '}';

const CONTEXT_WIDTH = 5;

export type SubstitutionResult =
	| { ok: true; points: Array<SubstitutionPoint>; error: null }
	| { ok: false; points: null; error: ReplacementError };

export type ExtractNamesOutcome =
	| { ok: true; names: Array<string>; error: null }
	| { ok: false; names: null; error: ReplacementError };

/**
 * Extracts the referenced entity names (`{% name %}` for blocks, `{{ name }}`
 * for variables) from a text without resolving them. Used to reconcile
 * junction tables: names that don't match a known entity are simply skipped
 * by the caller, so dangling references never fail a save.
 */
export function extractReferenceNames(
	text: string,
	checkType: 'block' | 'variable'
): ExtractNamesOutcome {
	if (text.length === 0) return { ok: true, names: [], error: null };
	const result = generateSubstitutionPoints(text, checkType);
	if (!result.ok) return { ok: false, names: null, error: result.error };
	const names = new Set<string>();
	for (const sub of result.points) {
		names.add(text.slice(sub.captureStart, sub.captureEnd).trim());
	}
	return { ok: true, names: Array.from(names), error: null };
}

function generateContextString(text: string, curr_pos: number) {
	return text.slice(
		Math.max(curr_pos - CONTEXT_WIDTH, 0),
		Math.min(curr_pos + CONTEXT_WIDTH, text.length)
	);
}

function generateSubstitutionPoints(
	text: string,
	checkType: 'block' | 'variable'
): SubstitutionResult {
	let captureStart: number | null = null; // open if non null
	let cursor = 0;

	const OPEN_1 = checkType === 'block' ? BLOCK_START_1 : VARIABLE_START_1;
	const OPEN_2 = checkType === 'block' ? BLOCK_START_2 : VARIABLE_START_2;
	const CLOSE_1 = checkType === 'block' ? BLOCK_END_1 : VARIABLE_END_1;
	const CLOSE_2 = checkType === 'block' ? BLOCK_END_2 : VARIABLE_END_2;

	let substitution_points = new Array<SubstitutionPoint>();

	while (cursor < text.length) {
		if (text[cursor] === OPEN_1) {
			if (text[cursor + 1] === OPEN_2) {
				if (captureStart !== null) {
					return {
						ok: false,
						points: null,
						error: {
							hint: `'${OPEN_1}${OPEN_2}' found within '${OPEN_1}${OPEN_2}'. Nesting of block expansions is not allowed. Did you forget to close with '${CLOSE_1}${CLOSE_2}'`,
							type: checkType,
							context: generateContextString(text, cursor)
						}
					};
				}
				captureStart = cursor + 2; // skips over both openings
				cursor += 1; // for the other opening
			}
		}

		if (text[cursor] === CLOSE_1) {
			if (text[cursor + 1] === CLOSE_2) {
				if (captureStart === null) {
					return {
						ok: false,
						points: null,
						error: {
							hint: `'${CLOSE_1}${CLOSE_2}' found without matching '${OPEN_1}${OPEN_2}'. Did you forget to open with '${OPEN_1}${OPEN_2}'`,
							type: checkType,
							context: generateContextString(text, cursor)
						}
					};
				}
				substitution_points.push({ captureStart, captureEnd: cursor });
				captureStart = null; // reset open state
				cursor += 1; // for the other closing
			}
		}
		cursor += 1;
	}

	if (captureStart !== null) {
		// dangling open
		return {
			ok: false,
			points: null,
			error: {
				hint: `Missing '${CLOSE_1}${CLOSE_2}' at the end of text. Did you forget to close with '${CLOSE_1}${CLOSE_2}'`,
				type: checkType,
				context: generateContextString(text, captureStart ?? cursor)
			}
		};
	}
	return { error: null, ok: true, points: substitution_points };
}

function replaceDelimitedText(
	text: string,
	entries: Map<string, ReplacementEntityData>,
	checkType: 'block' | 'variable'
): ReplaceOutcome {
	if (text.length === 0)
		return {
			ok: true,
			value: { blocksUsed: [], variablesUsed: [], replacedText: '' },
			error: null
		};
	const result = generateSubstitutionPoints(text, checkType);

	if (!result.ok) {
		return { ok: false, value: null, error: result.error };
	}

	const entitiesUsed: Set<string> = new Set();

	let newString = '';
	let lastInsertAt = 0;
	for (const sub of result.points) {
		const target = text.slice(sub.captureStart, sub.captureEnd).trim();
		const replaced = entries.get(target);
		if (replaced === undefined) {
			return {
				ok: false,
				value: null,
				error: {
					hint: `Could not find ${checkType} with name: '${target}'. Did you forget to create the ${checkType}?`,
					type: checkType,
					context: generateContextString(text, sub.captureStart)
				}
			};
		}
		if (!replaced.noTrack) entitiesUsed.add(replaced.id);
		newString += text.slice(lastInsertAt, sub.captureStart - 2) + replaced.value; // -2 for the two openings --- we do not include them in the final output
		lastInsertAt = sub.captureEnd + 2; // +2 for the two closing --- we do not include them in the final output
	}

	const replacedText = newString + text.slice(lastInsertAt);
	return checkType === 'block'
		? {
				ok: true,
				value: { blocksUsed: Array.from(entitiesUsed.values()), variablesUsed: [], replacedText },
				error: null
			}
		: {
				ok: true,
				value: { variablesUsed: Array.from(entitiesUsed.values()), blocksUsed: [], replacedText },
				error: null
			};
}

/**
 * Replaces blocks in the text with their corresponding values from the database.
 *
 * @param text The text to replace blocks in.
 * @param blocks Map of block name to its id and value.
 * @returns Discriminated outcome with used block ids and replaced text, or a `ReplacementError`.
 */
export function replaceBlocks(
	text: string,
	blocks: Map<string, ReplacementEntityData>
): ReplaceOutcome {
	return replaceDelimitedText(text, blocks, 'block');
}

export function replaceVariables(
	text: string,
	variables: Map<string, ReplacementEntityData>
): ReplaceOutcome {
	return replaceDelimitedText(text, variables, 'variable');
}

export function replaceText(
	text: string,
	blocks: Block[],
	variables: Variable[],
	now: Date = new Date()
): ReplaceOutcome {
	/** entity_name: { entity_id, entity_value } */
	const blockMap = new Map<string, ReplacementEntityData>();
	/** entity_name: { entity_id, entity_value } */
	const variableMap = new Map<string, ReplacementEntityData>();

	for (const block of blocks) {
		blockMap.set(block.name, { id: block.id, value: block.value });
	}

	for (const variable of variables) {
		variableMap.set(variable.name, { id: variable.id, value: variable.value });
	}

	// resolved variables evaluate to generation time based values.
	// and are not stored in the db
	for (const [name, value] of getReservedVariableValues(now)) {
		variableMap.set(name, { id: `reserved:${name}`, value, noTrack: true });
	}

	const blocksReplaced = replaceBlocks(text, blockMap);
	if (!blocksReplaced.ok) return blocksReplaced;
	const variablesReplaced = replaceVariables(blocksReplaced.value.replacedText, variableMap);
	if (!variablesReplaced.ok) return variablesReplaced;
	return {
		ok: true,
		value: {
			blocksUsed: blocksReplaced.value.blocksUsed,
			variablesUsed: variablesReplaced.value.variablesUsed,
			replacedText: variablesReplaced.value.replacedText
		},
		error: null
	};
}

export const LETTER_SECTION_KEYS = ['header', 'body', 'footer'] as const;
export type LetterSectionKey = (typeof LETTER_SECTION_KEYS)[number];

export type LetterSectionTexts = Record<LetterSectionKey, string | null>;

export type CollectLetterRefsError = ReplacementError & { section: LetterSectionKey };

export type CollectLetterRefsOutcome =
	| {
			ok: true;
			value: {
				blockIds: Array<string>;
				variableIds: Array<string>;
				replacedText: LetterSectionTexts;
			};
			error: null;
	  }
	| { ok: false; value: null; error: CollectLetterRefsError };

/**
 * Runs {@link replaceText} over each letter section and unions the used ids.
 * Fails fast with the offending section name on the first reference error —
 * callers that must abort on bad refs (letter generation) use this directly,
 * while best-effort callers fall back to zero rows. Reserved variables
 * substitute normally but contribute no ids, so junction rows are unaffected.
 */
export function collectLetterRefs(
	sections: Record<LetterSectionKey, { text: string | null }>,
	blocks: Block[],
	variables: Variable[],
	now: Date = new Date()
): CollectLetterRefsOutcome {
	const blockIds = new Set<string>();
	const variableIds = new Set<string>();
	const replacedText = {} as LetterSectionTexts;
	for (const key of LETTER_SECTION_KEYS) {
		const text = sections[key].text;
		if (text === null) {
			replacedText[key] = null;
			continue;
		}
		const outcome = replaceText(text, blocks, variables, now);
		if (!outcome.ok) return { ok: false, value: null, error: { ...outcome.error, section: key } };
		for (const id of outcome.value.blocksUsed) blockIds.add(id);
		for (const id of outcome.value.variablesUsed) variableIds.add(id);
		replacedText[key] = outcome.value.replacedText;
	}
	return {
		ok: true,
		value: { blockIds: Array.from(blockIds), variableIds: Array.from(variableIds), replacedText },
		error: null
	};
}
