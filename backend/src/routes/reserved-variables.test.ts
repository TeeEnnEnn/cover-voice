import { describe, it, expect } from 'vitest';
import { signUpVerified, testAgent, TRUSTED_ORIGIN } from '../../tests/helpers.js';
import { getReservedVariableValues } from '../services/reserved-variables.js';

const generation = (bodyText: string) => ({
	config: {
		font: 'Courier',
		fontSize: 16,
		fontColor: '#000000',
		backgroundColor: '#ffffff',
		lineHeight: 1.5,
		pageSize: 'A4',
		marginLeft: 10,
		marginRight: 10,
		marginTop: 10,
		marginBottom: 10
	},
	sections: {
		header: { text: null, align: 'left' },
		body: { text: bodyText, align: 'left' },
		footer: { text: null, align: 'left' }
	}
});

describe('reserved variables', () => {
	it('generates the current date values and links no variables', async () => {
		const agent = testAgent();
		await signUpVerified(agent, 'reserved-generate@example.com');
		const letter = await agent
			.post('/api/letters')
			.set('Origin', TRUSTED_ORIGIN)
			.send({ title: 'App', description: 'desc' });
		expect(letter.status).toBe(201);
		const letterId = letter.body.id as string;

		const generated = await agent
			.post(`/api/letters/${letterId}/generate`)
			.set('Origin', TRUSTED_ORIGIN)
			.send(generation('{{day_word}}, {{month_word}} {{day_num}}, {{year}} ({{month_num}})'));
		expect(generated.status).toBe(200);

		const expected = getReservedVariableValues();
		const fetched = await agent.get(`/api/letters/${letterId}`);
		expect(fetched.status).toBe(200);
		expect(fetched.body.generatedContent.sections.body.text).toBe(
			`${expected.get('day_word')}, ${expected.get('month_word')} ${expected.get('day_num')}, ${expected.get('year')} (${expected.get('month_num')})`
		);

		const usage = await agent.get(`/api/letters/${letterId}/usage`);
		expect(usage.status).toBe(200);
		expect(usage.body.variableCount).toBe(0);
		expect(usage.body.variables).toEqual([]);
	});

	it('mixes reserved and user variables, tracking only the latter', async () => {
		const agent = testAgent();
		await signUpVerified(agent, 'reserved-mixed@example.com');
		const variable = await agent
			.post('/api/variables')
			.set('Origin', TRUSTED_ORIGIN)
			.send({ name: 'company', value: 'Acme' });
		expect(variable.status).toBe(201);
		const block = await agent
			.post('/api/blocks')
			.set('Origin', TRUSTED_ORIGIN)
			.send({ name: 'intro', value: 'Hello {{company}} on {{day_word}}' });
		expect(block.status).toBe(201);
		const letter = await agent
			.post('/api/letters')
			.set('Origin', TRUSTED_ORIGIN)
			.send({ title: 'App', description: 'desc' });
		expect(letter.status).toBe(201);
		const letterId = letter.body.id as string;

		const generated = await agent
			.post(`/api/letters/${letterId}/generate`)
			.set('Origin', TRUSTED_ORIGIN)
			.send(generation('{% intro %} {{year}}'));
		expect(generated.status).toBe(200);

		const expected = getReservedVariableValues();
		const fetched = await agent.get(`/api/letters/${letterId}`);
		expect(fetched.body.generatedContent.sections.body.text).toBe(
			`Hello Acme on ${expected.get('day_word')} ${expected.get('year')}`
		);

		const usage = await agent.get(`/api/letters/${letterId}/usage`);
		expect(usage.body.variableCount).toBe(1);
		expect(usage.body.variables).toMatchObject([{ name: 'company' }]);
	});

	it('rejects user variables named like reserved variables', async () => {
		const agent = testAgent();
		await signUpVerified(agent, 'reserved-names@example.com');
		for (const name of ['year', 'month_word', 'month_num', 'day_word', 'day_num']) {
			const res = await agent
				.post('/api/variables')
				.set('Origin', TRUSTED_ORIGIN)
				.send({ name, value: 'whatever' });
			expect(res.status).toBe(400);
		}
		const variable = await agent
			.post('/api/variables')
			.set('Origin', TRUSTED_ORIGIN)
			.send({ name: 'company', value: 'Acme' });
		expect(variable.status).toBe(201);
		const rename = await agent
			.patch(`/api/variables/${variable.body.id}`)
			.set('Origin', TRUSTED_ORIGIN)
			.send({ name: 'year' });
		expect(rename.status).toBe(400);
		// Non-reserved names still work.
		const yearly = await agent
			.post('/api/variables')
			.set('Origin', TRUSTED_ORIGIN)
			.send({ name: 'yearly', value: 'whatever' });
		expect(yearly.status).toBe(201);
	});
});
