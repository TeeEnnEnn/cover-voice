import type { blockTable, variableTable } from '../db/schema.js';

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
	entries: Map<string, string>,
	checkType: 'block' | 'variable'
): string | ReplacementError {
	if (text.length === 0) return text;
	const result = generateSubstitutionPoints(text, checkType);

	if (!result.ok) {
		return result.error;
	}

	let newString = '';
	let lastInsertAt = 0;
	for (let sub of result.points) {
		const target = text.slice(sub.captureStart, sub.captureEnd).trim();
		const replaced = entries.get(target);
		if (replaced === undefined) {
			return {
				hint: `Could not find ${checkType} with name: '${target}'. Did you forget to create the ${checkType}?`,
				type: checkType,
				context: generateContextString(text, sub.captureStart)
			};
		}
		newString += text.slice(lastInsertAt, sub.captureStart - 2) + replaced; // -2 for the two openings --- we do not include them in the final output
		lastInsertAt = sub.captureEnd + 2; // +2 for the two closing --- we do not include them in the final output
	}

	return newString + text.slice(lastInsertAt);
}

/**
 * Replaces blocks in the text with their corresponding values from the database.
 *
 * @param text The text to replace blocks in.
 * @param blocks The blocks that can be used in replacements.
 * @returns The text with blocks replaced, or a `ReplacementError` if an error occurred.
 */
export function replaceBlocks(
	text: string,
	blocks: Map<string, string>
): string | ReplacementError {
	return replaceDelimitedText(text, blocks, 'block');
}

export function replaceVariables(
	text: string,
	variables: Map<string, string>
): string | ReplacementError {
	return replaceDelimitedText(text, variables, 'variable');
}

export function replaceText(
	text: string,
	blocks: Block[],
	variables: Variable[]
): string | ReplacementError {
	const blockMap = new Map<string, string>();
	const variableMap = new Map<string, string>();

	for (let block of blocks) {
		blockMap.set(block.name, block.value);
	}

	for (let variable of variables) {
		variableMap.set(variable.name, variable.value);
	}

	const blocksReplaced = replaceBlocks(text, blockMap);
	if (typeof blocksReplaced === 'object') return blocksReplaced;
	return replaceVariables(blocksReplaced, variableMap);
}
