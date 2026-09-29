import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { pino } from 'pino';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth.js';
import { buildOpenApiDocument } from './openapi/document.js';
import healthRouter from './routes/health.js';
import meRouter from './routes/me.js';
import blockRouter from './routes/block.js';
import variableRouter from './routes/variables.js';
import letterRouter from './routes/letters.js';
import testOutboxRouter from './routes/test-outbox.js';

const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
	.split(',')
	.map((origin) => origin.trim())
	.filter(Boolean);

const docsEnabled = process.env.DOCS_ENABLED === 'true' || process.env.NODE_ENV !== 'production';

const httpLogger = pinoHttp({
	logger: pino({
		level: process.env.NODE_ENV === 'test' ? 'silent' : (process.env.LOG_LEVEL ?? 'info')
	}),
	autoLogging: {
		ignore: (req) => req.url === '/api/health'
	}
});

export function createApp() {
	const app = express();

	// Behind Caddy (or any TLS-terminating proxy) so secure cookies and
	// client IPs resolve correctly. Trust only the first proxy hop.
	app.set('trust proxy', 1);

	app.use(httpLogger);
	if (allowedOrigins.length === 0) {
		// Fail closed: reflecting arbitrary origins with credentials would let
		// any site make authenticated requests on a user's behalf. Set
		// CORS_ORIGINS explicitly; same-origin traffic (e.g. via Caddy) is
		// unaffected. Without this, an empty CORS_ORIGINS previously reflected
		// any origin.
		app.use(
			cors({
				origin: false,
				methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
				credentials: true
			})
		);
	} else {
		app.use(
			cors({
				origin: allowedOrigins,
				methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
				credentials: true
			})
		);
	}
	// Content-Security-Policy is disabled because Swagger UI serves inline
	// scripts; re-enable it if you remove or self-host the docs UI.
	app.use(helmet({ contentSecurityPolicy: false }));

	// Better Auth must be mounted before the json body parser.
	app.all('/api/auth/{*any}', toNodeHandler(auth));

	app.use(express.json({ limit: '1mb' }));

	// Generous per-IP throttle for the API (auth endpoints have their own
	// stricter better-auth limits). Health stays unthrottled for load
	// balancers and deploy checks.
	const apiLimiter = rateLimit({
		windowMs: 15 * 60 * 1000,
		limit: 1000,
		standardHeaders: 'draft-8',
		legacyHeaders: false,
		message: { error: { message: 'Too many requests, please slow down.', details: [] } }
	});

	app.use('/api', healthRouter);
	app.use('/api', apiLimiter);
	if (process.env.ALLOW_TEST_OUTBOX === 'true') {
		app.use('/api', testOutboxRouter);
	}
	app.use('/api', meRouter);
	app.use('/api', blockRouter);
	app.use('/api', variableRouter);
	app.use('/api', letterRouter);

	if (docsEnabled) {
		// Swagger UI with the spec generated from the route registry.
		const spec = buildOpenApiDocument();
		app.get('/api/openapi.json', (_req, res) => {
			res.json(spec);
		});
		app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
	}

	// 404 for unknown API routes.
	app.use('/api', (_req, res) => {
		res.status(404).json({ error: { message: 'Not found' } });
	});

	// Error handler.
	app.use(
		(err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
			req.log.error({ err }, 'Unhandled error');
			res.status(500).json({ error: { message: 'Internal server error' } });
		}
	);

	return app;
}
