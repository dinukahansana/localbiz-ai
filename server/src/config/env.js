import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Resolve from this file so starting from the root or server folder both work.
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

export const env = {
  port,
  host: process.env.HOST || 'localhost',
  clientOrigins: (process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:4173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  mongoUri: process.env.MONGODB_URI?.trim() || '',
};
