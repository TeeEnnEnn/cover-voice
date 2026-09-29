import { describe, it, expect } from 'vitest';
import { signUpVerified, testAgent, testApp, TRUSTED_ORIGIN } from '../../tests/helpers.js';

describe('blocks', () => {
	it('rejects unauthenticated requests', async () => {
		const res = await testApp().get('/api/blocks');
		expect(res.status).toBe(401);
	});

	it('lists blocks for the signed-in user', async () => {
		const agent = testAgent();
		await signUpVerified(agent, 'blocks@example.com');
		const res = await agent.get('/api/blocks');
		expect(res.status).toBe(200);
	});

	it('creates and lists blocks for the signed-in user', async () => {
		const agent = testAgent();
		await signUpVerified(agent, 'blocks@example.com');

		const create = await agent
			.post('/api/blocks')
			.set('Origin', TRUSTED_ORIGIN)
			.send({ name: 'generic-intro', value: 'Hello I am a test bot' });
		expect(create.status).toBe(201);
		expect(create.body).toMatchObject({ name: 'generic-intro', value: 'Hello I am a test bot' });
		expect(create.body.id).toBeTruthy();
		expect(create.body.createdAt).toBeTruthy();

		const list = await agent.get('/api/blocks');
		expect(list.status).toBe(200);
		expect(list.body.blocks).toHaveLength(1);
		expect(list.body.blocks[0]).toMatchObject({ name: 'generic-intro' });
	});

	it('rejects an empty block name', async () => {
		const agent = testAgent();
		await signUpVerified(agent, 'blocks2@example.com');

		const res = await agent
			.post('/api/blocks')
			.set('Origin', TRUSTED_ORIGIN)
			.send({ name: '', value: 'some value' });
		expect(res.status).toBe(400);
	});

	it('rejects a missing block value', async () => {
		const agent = testAgent();
		await signUpVerified(agent, 'blocks3@example.com');

		const res = await agent
			.post('/api/blocks')
			.set('Origin', TRUSTED_ORIGIN)
			.send({ name: 'No value' });
		expect(res.status).toBe(400);
	});

	it('does not leak blocks between users', async () => {
		const first = testAgent();
		await signUpVerified(first, 'owner@example.com');
		await first
			.post('/api/blocks')
			.set('Origin', TRUSTED_ORIGIN)
			.send({ name: 'Mine', value: 'My content' });
		const own = await first.get('/api/blocks');
		expect(own.body.blocks).toHaveLength(1);

		const second = testAgent();
		await signUpVerified(second, 'other@example.com');
		const list = await second.get('/api/blocks');
		expect(list.status).toBe(200);
		expect(list.body.blocks).toHaveLength(0);
	});
});
