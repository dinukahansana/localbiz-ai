import { Router } from 'express';
import { getDatabaseStatus } from '../config/database.js';

const router = Router();

// Liveness only: MongoDB is optional in Phase 1 and reported separately.
router.get('/', (request, response) => {
  response.set('Cache-Control', 'no-store').json({
    status: 'ok',
    service: 'localbiz-ai-api',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: getDatabaseStatus(),
  });
});

export default router;
