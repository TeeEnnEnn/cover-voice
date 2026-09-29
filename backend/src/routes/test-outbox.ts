import { Router } from 'express';
import { emailOutbox } from '../services/email.js';

// Test-only outbox reader: lets e2e follow verification/reset links without
// a real inbox. Mounted ONLY when ALLOW_TEST_OUTBOX=true (CI/e2e servers).
// Never enable in production: it discloses who was emailed and their links.
const router = Router();

router.get('/test/outbox', async (req, res) => {
	const to = typeof req.query.to === 'string' ? req.query.to : null;
	const emails = (to ? emailOutbox.filter((email) => email.to === to) : emailOutbox).map(
		(email) => ({ to: email.to, subject: email.subject, html: email.html })
	);
	res.json({ emails });
});

router.delete('/test/outbox', async (_req, res) => {
	emailOutbox.length = 0;
	res.status(204).send();
});

export default router;
