import { describe, it, expect } from 'vitest';
import { signUp, testAgent, TRUSTED_ORIGIN } from '../../tests/helpers.js';

const generation = (bodyText: string) => ({
	config: {
		font: 'Courier',
		fontSize: 16,
		fontColor: '#000000',
		backgroundColor: '#ffffff',
		lineHeight: 1.5,
		textDirection: 'ltr',
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

async function setupUsage(agent: ReturnType<typeof testAgent>, email: string) {
	await signUp(agent, email);
	const variable = await agent
		.post('/api/variables')
		.set('Origin', TRUSTED_ORIGIN)
		.send({ name: 'company', value: 'Acme' });
	expect(variable.status).toBe(201);
	const block = await agent
		.post('/api/blocks')
		.set('Origin', TRUSTED_ORIGIN)
		.send({ name: 'intro', value: 'Hello {{company}}' });
	expect(block.status).toBe(201);
	const letter = await agent
		.post('/api/letters')
		.set('Origin', TRUSTED_ORIGIN)
		.send({ title: 'App', description: 'desc' });
	expect(letter.status).toBe(201);
	const generated = await agent
		.post(`/api/letters/${letter.body.id}/generate`)
		.set('Origin', TRUSTED_ORIGIN)
		.send(generation('{% intro %}'));
	expect(generated.status).toBe(200);
	return {
		variableId: variable.body.id as string,
		blockId: block.body.id as string,
		letterId: letter.body.id as string
	};
}

describe('usage', () => {
	it('reports block usage after generation', async () => {
		const agent = testAgent();
		const { blockId } = await setupUsage(agent, 'usage-block@example.com');
		const res = await agent.get(`/api/blocks/${blockId}/usage`);
		expect(res.status).toBe(200);
		expect(res.body.letterCount).toBe(1);
		expect(res.body.variableCount).toBe(1);
		expect(res.body.letters).toHaveLength(1);
		expect(res.body.variables).toHaveLength(1);
	});

	it('reports variable usage across blocks and letters', async () => {
		const agent = testAgent();
		const { variableId } = await setupUsage(agent, 'usage-variable@example.com');
		const res = await agent.get(`/api/variables/${variableId}/usage`);
		expect(res.status).toBe(200);
		expect(res.body.blockCount).toBe(1);
		expect(res.body.letterCount).toBe(1);
	});

	it('reports letter usage', async () => {
		const agent = testAgent();
		const { letterId } = await setupUsage(agent, 'usage-letter@example.com');
		const res = await agent.get(`/api/letters/${letterId}/usage`);
		expect(res.status).toBe(200);
		expect(res.body.blockCount).toBe(1);
		expect(res.body.variableCount).toBe(1);
	});

	it('blocks delete with 409 unless forced', async () => {
		const agent = testAgent();
		const { blockId } = await setupUsage(agent, 'usage-409@example.com');
		const conflict = await agent.delete(`/api/blocks/${blockId}`).set('Origin', TRUSTED_ORIGIN);
		expect(conflict.status).toBe(409);
		expect(conflict.body.letterCount).toBe(1);
		const forced = await agent
			.delete(`/api/blocks/${blockId}?force=true`)
			.set('Origin', TRUSTED_ORIGIN);
		expect(forced.status).toBe(204);
	});

	it('blocks variable delete with 409 unless forced', async () => {
		const agent = testAgent();
		const { variableId } = await setupUsage(agent, 'usage-409-var@example.com');
		const conflict = await agent
			.delete(`/api/variables/${variableId}`)
			.set('Origin', TRUSTED_ORIGIN);
		expect(conflict.status).toBe(409);
		expect(conflict.body.blockCount).toBe(1);
		const forced = await agent
			.delete(`/api/variables/${variableId}?force=true`)
			.set('Origin', TRUSTED_ORIGIN);
		expect(forced.status).toBe(204);
	});

	it('deletes unused entities without force', async () => {
		const agent = testAgent();
		await signUp(agent, 'usage-unused@example.com');
		const block = await agent
			.post('/api/blocks')
			.set('Origin', TRUSTED_ORIGIN)
			.send({ name: 'lonely', value: 'no refs here' });
		const res = await agent.delete(`/api/blocks/${block.body.id}`).set('Origin', TRUSTED_ORIGIN);
		expect(res.status).toBe(204);
	});

	it('does not leak usage between users', async () => {
		const first = testAgent();
		const { blockId } = await setupUsage(first, 'usage-owner@example.com');
		const second = testAgent();
		await signUp(second, 'usage-other@example.com');
		const res = await second.get(`/api/blocks/${blockId}/usage`);
		expect(res.status).toBe(404);
	});

	it('returns 404 usage for unknown ids', async () => {
		const agent = testAgent();
		await signUp(agent, 'usage-404@example.com');
		expect((await agent.get('/api/blocks/nope/usage')).status).toBe(404);
		expect((await agent.get('/api/variables/nope/usage')).status).toBe(404);
		expect((await agent.get('/api/letters/nope/usage')).status).toBe(404);
	});
});
