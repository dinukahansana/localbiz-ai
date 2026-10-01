import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Resolve from this file so starting from the root or server folder both work.
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

const geminiModel = process.env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite';
if (!/^[a-z0-9][a-z0-9._-]{0,79}$/.test(geminiModel)) {
  throw new Error('GEMINI_MODEL must be a valid model name, not a URL.');
}

export const env = {
  production: process.env.NODE_ENV === 'production',
  port,
  host: process.env.HOST || 'localhost',
  clientOrigins: (process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:4173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  mongoUri: process.env.MONGODB_URI?.trim() || '',
  geminiKey: process.env.GEMINI_API_KEY?.trim() || '',
  geminiModel,
};
