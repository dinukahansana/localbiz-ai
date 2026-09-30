import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase() {
  if (!env.mongoUri) {
    console.info('MongoDB is not configured. Running the Phase 1 shell without a database.');
    return;
  }

  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.info('MongoDB connected.');
}

export function getDatabaseStatus() {
  if (!env.mongoUri) return 'not_configured';

  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] || 'unknown';
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
