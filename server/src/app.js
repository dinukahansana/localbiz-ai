import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import healthRouter from './routes/health.js';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: env.clientOrigins }));
app.use(express.json({ limit: '100kb' }));

app.use('/api/health', healthRouter);

app.use((request, response) => {
  response.status(404).json({ error: 'Route not found.' });
});

// Keep parser errors readable without leaking server internals.
app.use((error, request, response, next) => {
  if (response.headersSent) return next(error);
  const status = error.status === 400 || error.status === 413 ? error.status : 500;
  const message =
    status === 400
      ? 'Invalid JSON body.'
      : status === 413
        ? 'Request body too large.'
        : 'Internal server error.';
  response.status(status).json({ error: message });
});

export default app;
