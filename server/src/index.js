import app from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';

const server = app.listen(env.port, env.host, () => {
  console.info(`LocalBiz AI API: http://${env.host}:${env.port}/api/health`);
});

server.on('error', (error) => {
  console.error(
    error.code === 'EADDRINUSE'
      ? `Port ${env.port} is already in use. Stop the other server or change PORT.`
      : 'The API could not start. Check HOST and PORT.',
  );
  process.exit(1);
});

connectDatabase().catch(() => {
  // Connection errors can contain credentials, so do not print the raw error.
  console.error(
    'MongoDB could not connect. Check MONGODB_URI and database access. The Phase 1 API will stay available.',
  );
});

function shutdown() {
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
