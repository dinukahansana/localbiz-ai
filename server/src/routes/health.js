import { Router } from 'express';
import { getDatabaseStatus } from '../config/database.js';

const router = Router();

// Hosting distinguishes a running process from one ready to save account data.
export function readiness(request, response) {
  const database = getDatabaseStatus();
  const ready = database === 'connected';
  response.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    service: 'localbiz-ai-api',
    database,
  });
}

// API liveness only: database readiness is reported separately.
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
