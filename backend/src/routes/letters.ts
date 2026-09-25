import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import {
	createLetter,
	createLetterSchema,
	deleteLetter,
	generateLetterSchema,
	getLetterById,
	getLetters,
	updateLetter,
	updateLetterSchema
} from '../crud/letters.js';
import { validate } from '../middleware/validate.js';
import { serializeTimestamps } from '../crud/helpers.js';

const router = Router();

router.get('/letters', requireAuth, async (_req, res) => {
	const userId = res.locals.user!.id;
	const { letters } = await getLetters(userId);
	res.json({ letters: letters.map(serializeTimestamps) });
});

router.post('/letters', requireAuth, validate({ body: createLetterSchema }), async (req, res) => {
	const userId = res.locals.user!.id;
	const insertedLetter = await createLetter(userId, req.body);
	res.status(201).json(serializeTimestamps(insertedLetter));
});

router.get('/letters/:id', requireAuth, async (req, res) => {
	const userId = res.locals.user!.id;
	const letterId = req.params.id as string;
	const letter = await getLetterById(userId, letterId);
	if (!letter) {
		res.status(404).json({ error: { message: 'Letter not found', details: [] } });
		return;
	}
	res.status(200).json(serializeTimestamps(letter));
});

router.delete('/letters/:id', requireAuth, async (req, res) => {
	const userId = res.locals.user!.id;
	const letterId = req.params.id as string;
	const deleted = await deleteLetter(userId, letterId);
	if (!deleted) {
		res.status(404).json({ error: { message: 'Letter not found', details: [] } });
		return;
	}
	res.status(204).send();
});

router.patch(
	'/letters/:id',
	requireAuth,
	validate({ body: updateLetterSchema }),
	async (req, res) => {
		const userId = res.locals.user!.id;
		const letterId = req.params.id as string;
		const updated = await updateLetter(userId, letterId, req.body);
		if (!updated) {
			res.status(404).json({ error: { message: 'Letter not found', details: [] } });
			return;
		}
		res.status(200).json(serializeTimestamps(updated));
	}
);

router.post(
	'/letters/:id/generate',
	requireAuth,
	validate({ body: generateLetterSchema }),
	async (_req, res) => {
		res.status(501).json({ error: { message: 'Letter generation not implemented', details: [] } });
	}
);

export default router;
