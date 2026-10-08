import { describe, it, expect } from 'vitest';
import { signUpVerified, testAgent, TRUSTED_ORIGIN } from '../../tests/helpers.js';

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

async function setupLetter(agent: ReturnType<typeof testAgent>, email: string) {
	await signUpVerified(agent, email);
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
	return {
		variableId: variable.body.id as string,
		blockId: block.body.id as string,
		letterId: letter.body.id as string
	};
}

async function generatedBody(agent: ReturnType<typeof testAgent>, letterId: string) {
	const res = await agent.get(`/api/letters/${letterId}`);
	expect(res.status).toBe(200);
	return res.body.generatedContent?.sections?.body?.text as string | null;
}

describe('letter variable overrides', () => {
	it('uses the default value when no override exists', async () => {
		const agent = testAgent();
		const { letterId } = await setupLetter(agent, 'override-default@example.com');
		const generated = await agent
			.post(`/api/letters/${letterId}/generate`)
			.set('Origin', TRUSTED_ORIGIN)
			.send(generation('{% intro %} and {{company}}'));
		expect(generated.status).toBe(200);
		expect(await generatedBody(agent, letterId)).toBe('Hello Acme and Acme');
	});

	it('applies overrides to direct refs and refs inside blocks', async () => {
		const agent = testAgent();
		const { letterId, variableId } = await setupLetter(agent, 'override-applies@example.com');
		const put = await agent
			.put(`/api/letters/${letterId}/overrides/${variableId}`)
			.set('Origin', TRUSTED_ORIGIN)
			.send({ value: 'Globex' });
		expect(put.status).toBe(200);
		expect(put.body).toMatchObject({
			letterId,
			variableId,
			variableName: 'company',
			value: 'Globex'
		});

		const list = await agent.get(`/api/letters/${letterId}/overrides`);
		expect(list.status).toBe(200);
		expect(list.body.overrides).toHaveLength(1);

		const generated = await agent
			.post(`/api/letters/${letterId}/generate`)
			.set('Origin', TRUSTED_ORIGIN)
			.send(generation('{% intro %} and {{company}}'));
		expect(generated.status).toBe(200);
		expect(await generatedBody(agent, letterId)).toBe('Hello Globex and Globex');

		// Preview applies overrides too (PDF magic bytes).
		const preview = await agent
			.post(`/api/letters/${letterId}/preview`)
			.set('Origin', TRUSTED_ORIGIN)
			.send(generation('{{company}}'));
		expect(preview.status).toBe(200);
		expect(preview.headers['content-type']).toContain('application/pdf');
	});

	it('does not affect other letters and reverts on delete', async () => {
		const agent = testAgent();
		const { letterId, variableId } = await setupLetter(agent, 'override-scope@example.com');
		const other = await agent
			.post('/api/letters')
			.set('Origin', TRUSTED_ORIGIN)
			.send({ title: 'Other', description: '' });
		expect(other.status).toBe(201);
		const otherId = other.body.id as string;

		await agent
			.put(`/api/letters/${letterId}/overrides/${variableId}`)
			.set('Origin', TRUSTED_ORIGIN)
			.send({ value: 'Initech' });

		await agent
			.post(`/api/letters/${letterId}/generate`)
			.set('Origin', TRUSTED_ORIGIN)
			.send(generation('{{company}}'));
		await agent
			.post(`/api/letters/${otherId}/generate`)
			.set('Origin', TRUSTED_ORIGIN)
			.send(generation('{{company}}'));
		expect(await generatedBody(agent, letterId)).toBe('Initech');
		expect(await generatedBody(agent, otherId)).toBe('Acme');

		const del = await agent
			.delete(`/api/letters/${letterId}/overrides/${variableId}`)
			.set('Origin', TRUSTED_ORIGIN);
		expect(del.status).toBe(204);
		await agent
			.post(`/api/letters/${letterId}/generate`)
			.set('Origin', TRUSTED_ORIGIN)
			.send(generation('{{company}}'));
		expect(await generatedBody(agent, letterId)).toBe('Acme');
	});

	it('returns 404 for unknown letters or variables', async () => {
		const agent = testAgent();
		const { letterId, variableId } = await setupLetter(agent, 'override-404@example.com');
		expect((await agent.get('/api/letters/nope/overrides')).status).toBe(404);
		expect(
			(
				await agent
					.put(`/api/letters/${letterId}/overrides/nope`)
					.set('Origin', TRUSTED_ORIGIN)
					.send({ value: 'x' })
			).status
		).toBe(404);
		expect(
			(
				await agent
					.delete(`/api/letters/${letterId}/overrides/${variableId}`)
					.set('Origin', TRUSTED_ORIGIN)
			).status
		).toBe(204); // idempotent when no override row exists
		expect(
			(
				await agent
					.delete('/api/letters/nope/overrides/' + variableId)
					.set('Origin', TRUSTED_ORIGIN)
			).status
		).toBe(404);
	});

	it('rejects empty override values', async () => {
		const agent = testAgent();
		const { letterId, variableId } = await setupLetter(agent, 'override-empty@example.com');
		const res = await agent
			.put(`/api/letters/${letterId}/overrides/${variableId}`)
			.set('Origin', TRUSTED_ORIGIN)
			.send({ value: '   ' });
		expect(res.status).toBe(400);
	});

	it('does not leak overrides between users', async () => {
		const first = testAgent();
		const { letterId, variableId } = await setupLetter(first, 'override-owner@example.com');
		await first
			.put(`/api/letters/${letterId}/overrides/${variableId}`)
			.set('Origin', TRUSTED_ORIGIN)
			.send({ value: 'Hooli' });

		const second = testAgent();
		await signUpVerified(second, 'override-other@example.com');
		expect((await second.get(`/api/letters/${letterId}/overrides`)).status).toBe(404);
		expect(
			(
				await second
					.put(`/api/letters/${letterId}/overrides/${variableId}`)
					.set('Origin', TRUSTED_ORIGIN)
					.send({ value: 'Hooli' })
			).status
		).toBe(404);
	});

	it('drops overrides when the variable is force-deleted', async () => {
		const agent = testAgent();
		const { letterId, variableId } = await setupLetter(agent, 'override-cascade@example.com');
		await agent
			.put(`/api/letters/${letterId}/overrides/${variableId}`)
			.set('Origin', TRUSTED_ORIGIN)
			.send({ value: 'Umbrella' });
		const forced = await agent
			.delete(`/api/variables/${variableId}?force=true`)
			.set('Origin', TRUSTED_ORIGIN);
		expect(forced.status).toBe(204);
		const list = await agent.get(`/api/letters/${letterId}/overrides`);
		expect(list.status).toBe(200);
		expect(list.body.overrides).toHaveLength(0);
	});
});
