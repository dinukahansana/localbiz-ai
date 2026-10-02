import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { readEnv } from './readEnv.js';

// Resolve from this file so starting from the root or server folder both work.
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

export const env = readEnv(process.env);
