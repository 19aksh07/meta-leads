import express, { type ErrorRequestHandler } from 'express';
import testLeadsRouter from './routes/testLeads';
import webhookRouter from './routes/webhook';

const app = express();
const handleJsonParseError: ErrorRequestHandler = (error, _req, res, next) => {
	if (
		typeof error === 'object' &&
		error !== null &&
		'type' in error &&
		error.type === 'entity.parse.failed'
	) {
		console.warn('Received malformed JSON webhook payload');
		return res.sendStatus(200);
	}

	return next(error);
};

app.use(express.json());
app.use('/api/test-leads', testLeadsRouter);
app.use('/webhook/leadgen', webhookRouter);
app.use(handleJsonParseError);

export default app;