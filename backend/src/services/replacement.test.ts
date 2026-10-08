import { describe, it, expect } from 'vitest';
import {
	replaceText,
	replaceBlocks,
	replaceVariables,
	extractReferenceNames,
	collectLetterRefs
} from './replacement.js';

const blocks = [
	{
		id: 'block-1',
		name: 'intro',
		value: 'Hello',
		userId: 'u1',
		createdAt: new Date(),
		updatedAt: new Date()
	},
	{
		id: 'block-2',
		name: 'outro',
		value: 'Bye {{name}}',
		userId: 'u1',
		createdAt: new Date(),
		updatedAt: new Date()
	}
];

const variables = [
	{
		id: 'var-1',
		name: 'name',
		value: 'Ada',
		userId: 'u1',
		createdAt: new Date(),
		updatedAt: new Date()
	}
];

describe('replaceText', () => {
	it('replaces blocks and variables and tracks used ids', () => {
		const outcome = replaceText('{% intro %}, {{ name }}!', blocks, variables);
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.value.replacedText).toBe('Hello, Ada!');
		expect(outcome.value.blocksUsed).toEqual(['block-1']);
		expect(outcome.value.variablesUsed).toEqual(['var-1']);
	});

	it('resolves variables introduced by block expansion (two passes)', () => {
		const outcome = replaceText('{% outro %}', blocks, variables);
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.value.replacedText).toBe('Bye Ada');
		expect(outcome.value.blocksUsed).toEqual(['block-2']);
		expect(outcome.value.variablesUsed).toEqual(['var-1']);
	});

	it('dedupes repeated references', () => {
		const outcome = replaceText('{% intro %} {% intro %}', blocks, variables);
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.value.replacedText).toBe('Hello Hello');
		expect(outcome.value.blocksUsed).toEqual(['block-1']);
	});

	it('returns ok:false for unknown names', () => {
		const outcome = replaceText('{% missing %}', blocks, variables);
		expect(outcome.ok).toBe(false);
		if (outcome.ok) return;
		expect(outcome.error.type).toBe('block');
		expect(outcome.error.hint).toContain('missing');
	});

	it('returns ok:false for malformed tags', () => {
		const outcome = replaceText('{% intro', blocks, variables);
		expect(outcome.ok).toBe(false);
	});

	it('handles empty text', () => {
		const outcome = replaceText('', blocks, variables);
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.value.replacedText).toBe('');
		expect(outcome.value.blocksUsed).toEqual([]);
		expect(outcome.value.variablesUsed).toEqual([]);
	});
});

describe('replaceBlocks / replaceVariables', () => {
	it('replaceBlocks returns only blocksUsed', () => {
		const outcome = replaceBlocks(
			'{% intro %}',
			new Map([['intro', { id: 'block-1', value: 'Hi' }]])
		);
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.value).toEqual({
			blocksUsed: ['block-1'],
			variablesUsed: [],
			replacedText: 'Hi'
		});
	});

	it('replaceVariables returns only variablesUsed', () => {
		const outcome = replaceVariables(
			'{{ name }}',
			new Map([['name', { id: 'var-1', value: 'Ada' }]])
		);
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.value).toEqual({
			blocksUsed: [],
			variablesUsed: ['var-1'],
			replacedText: 'Ada'
		});
	});
});

describe('extractReferenceNames', () => {
	it('extracts and dedupes names', () => {
		const outcome = extractReferenceNames('Hello {{ name }} and {{name}}!', 'variable');
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.names).toEqual(['name']);
	});

	it('returns empty names when there are no tags', () => {
		const outcome = extractReferenceNames('no tags here', 'block');
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.names).toEqual([]);
	});

	it('keeps unknown names (resolution skips them later)', () => {
		const outcome = extractReferenceNames('{% a %} {% missing %}', 'block');
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.names).toEqual(['a', 'missing']);
	});

	it('returns ok:false for malformed tags', () => {
		const outcome = extractReferenceNames('{% dangling', 'block');
		expect(outcome.ok).toBe(false);
	});
});

describe('collectLetterRefs', () => {
	const introBlocks = [
		{
			id: 'block-1',
			name: 'intro',
			value: 'Hi {{name}}',
			userId: 'u1',
			createdAt: new Date(),
			updatedAt: new Date()
		}
	];
	const nameVariables = [
		{
			id: 'var-1',
			name: 'name',
			value: 'Ada',
			userId: 'u1',
			createdAt: new Date(),
			updatedAt: new Date()
		}
	];

	it('unions ids and replaced text across sections', () => {
		const outcome = collectLetterRefs(
			{
				header: { text: null },
				body: { text: '{% intro %}!' },
				footer: { text: 'Bye {{name}}' }
			},
			introBlocks,
			nameVariables
		);
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.value.blockIds).toEqual(['block-1']);
		expect(outcome.value.variableIds).toEqual(['var-1']);
		expect(outcome.value.replacedText).toEqual({
			header: null,
			body: 'Hi Ada!',
			footer: 'Bye Ada'
		});
	});

	it('reports the offending section on error', () => {
		const outcome = collectLetterRefs(
			{
				header: { text: '{% nope %}' },
				body: { text: null },
				footer: { text: null }
			},
			introBlocks,
			nameVariables
		);
		expect(outcome.ok).toBe(false);
		if (outcome.ok) return;
		expect(outcome.error.section).toBe('header');
		expect(outcome.error.type).toBe('block');
	});
});

describe('reserved variables', () => {
	// 2026-10-06 is a Tuesday.
	const now = new Date(2026, 9, 6, 12, 0, 0);
	const emptyBlocks: typeof blocks = [];
	const emptyVariables: typeof variables = [];

	it('resolves each reserved name to the current date', () => {
		const outcome = replaceText(
			'{{year}}-{{month_word}}-{{month_num}}-{{day_word}}-{{day_num}}',
			emptyBlocks,
			emptyVariables,
			now
		);
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.value.replacedText).toBe('2026-October-10-Tuesday-06');
	});

	it('zero-pads single-digit month and day numbers', () => {
		// 2026-01-05 is a Monday.
		const outcome = replaceText(
			'{{month_num}}/{{day_num}}/{{year}}',
			emptyBlocks,
			emptyVariables,
			new Date(2026, 0, 5, 12, 0, 0)
		);
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.value.replacedText).toBe('01/05/2026');
	});

	it('resolves reserved names introduced by block expansion', () => {
		const dateBlocks = [
			{
				id: 'block-date',
				name: 'dated',
				value: 'Dated {{day_word}}, {{month_word}} {{day_num}}, {{year}}',
				userId: 'u1',
				createdAt: new Date(),
				updatedAt: new Date()
			}
		];
		const outcome = replaceText('{% dated %}', dateBlocks, emptyVariables, now);
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.value.replacedText).toBe('Dated Tuesday, October 06, 2026');
		expect(outcome.value.blocksUsed).toEqual(['block-date']);
	});

	it('takes precedence over a same-named user variable', () => {
		const legacy = [
			{
				id: 'var-year',
				name: 'year',
				value: '1999',
				userId: 'u1',
				createdAt: new Date(),
				updatedAt: new Date()
			}
		];
		const outcome = replaceText('{{year}}', emptyBlocks, legacy, now);
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.value.replacedText).toBe('2026');
	});

	it('contributes no variable ids so junction rows stay empty', () => {
		const outcome = collectLetterRefs(
			{
				header: { text: null },
				body: { text: '{{year}} {{name}}' },
				footer: { text: null }
			},
			[],
			variables,
			now
		);
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.value.replacedText.body).toBe('2026 Ada');
		expect(outcome.value.variableIds).toEqual(['var-1']);
	});

	it('still errors on genuinely unknown names', () => {
		const outcome = replaceText('{{nope}}', emptyBlocks, emptyVariables, now);
		expect(outcome.ok).toBe(false);
	});
});
