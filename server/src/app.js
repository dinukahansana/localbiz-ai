import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import healthRouter, { readiness } from './routes/health.js';
import businessProfileRouter from './routes/businessProfile.js';
import productsRouter from './routes/products.js';
import requireDatabase from './middleware/requireDatabase.js';
import requireAuth from './middleware/requireAuth.js';
import protectWrites from './middleware/protectWrites.js';
import authRouter from './routes/auth.js';
import createCampaignRouter from './routes/campaigns.js';
import createPosterRouter from './routes/campaignPosters.js';
import createScheduleRouter from './routes/schedules.js';
import createGenerationRouter from './routes/posterGenerations.js';

export function createApp({ generateCampaign, imageProvider } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.trustProxyHops);
  app.use('/api', (request, response, next) => {
    response.set({
      'Cache-Control': 'no-store',
      'CDN-Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    next();
  });
  app.use(cors({ origin: env.clientOrigins, credentials: true }));
  app.use(cookieParser());
  app.use(
    '/api/poster-generations',
    requireDatabase,
    protectWrites,
    requireAuth,
    express.json({ limit: '9mb' }),
    createGenerationRouter(imageProvider),
  );
  // Only authenticated poster uploads need the larger body limit.
  app.use(
    '/api/campaign-posters',
    requireDatabase,
    protectWrites,
    requireAuth,
    express.json({ limit: '9mb' }),
    createPosterRouter(),
  );
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/health', healthRouter);
  app.get('/api/ready', readiness);
  app.use('/api/auth', requireDatabase, protectWrites, authRouter);
  app.use(
    '/api/business-profile',
    requireDatabase,
    protectWrites,
    requireAuth,
    businessProfileRouter,
  );
  app.use('/api/products', requireDatabase, protectWrites, requireAuth, productsRouter);
  app.use('/api/schedules', requireDatabase, protectWrites, requireAuth, createScheduleRouter());
  app.use(
    '/api/campaigns',
    requireDatabase,
    protectWrites,
    requireAuth,
    createCampaignRouter(generateCampaign),
  );

  app.use((request, response) => {
    response.status(404).json({ error: 'Route not found.' });
  });

  // Keep parser errors readable without leaking server internals.
  app.use((error, request, response, next) => {
    if (response.headersSent) return next(error);
    if (error.name === 'ValidationError') {
      return response
        .status(400)
        .json({ error: 'Some values are invalid. Please check your form.' });
    }
    if (
      [
        'MongoNetworkError',
        'MongoServerSelectionError',
        'MongooseServerSelectionError',
        'MongoNotConnectedError',
      ].includes(error.name)
    ) {
      return response.status(503).json({
        error: 'The database connection was interrupted. Please try again.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    const status = error.status === 400 || error.status === 413 ? error.status : 500;
    const message =
      status === 400
        ? 'Invalid JSON body.'
        : status === 413
          ? 'Request body too large.'
          : 'Internal server error.';
    response.status(status).json({ error: message });
  });

  return app;
}

export default createApp();
