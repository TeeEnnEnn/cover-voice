import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import { serializeTimestamps } from '../crud/helpers.js';
import {
	createVariable,
	createVariableSchema,
	deleteVariable,
	getVariables,
	updateVariable,
	updateVariableSchema
} from '../crud/variable.js';

const router = Router();

router.get('/variables', requireAuth, async (_req, res) => {
	const userId = res.locals.user!.id;
	const { variables } = await getVariables(userId);
	res.json({ variables: variables.map(serializeTimestamps) });
});

router.post(
	'/variables',
	requireAuth,
	validate({ body: createVariableSchema }),
	async (req, res) => {
		const userId = res.locals.user!.id;
		const insertedVariable = await createVariable(userId, req.body);
		res.status(201).json(serializeTimestamps(insertedVariable));
	}
);

router.delete('/variables/:id', requireAuth, async (req, res) => {
	const userId = res.locals.user!.id;
	const variableId = req.params.id as string;
	const updated = await deleteVariable(userId, variableId);
	if (!updated) {
		res.status(404).json({ error: { message: 'variable not found', details: [] } });
		return;
	}
	res.status(204).send();
});

router.patch(
	'/variables/:id',
	requireAuth,
	validate({ body: updateVariableSchema }),
	async (req, res) => {
		const userId = res.locals.user!.id;
		const variableId = req.params.id as string;
		const updated = await updateVariable(userId, variableId, req.body);
		if (!updated) {
			res.status(404).json({ error: { message: 'variable not found', details: [] } });
			return;
		}
		res.status(200).json(serializeTimestamps(updated));
	}
);

export default router;
