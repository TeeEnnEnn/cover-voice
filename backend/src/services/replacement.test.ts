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
