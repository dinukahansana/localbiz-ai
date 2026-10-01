import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase() {
  if (!env.mongoUri) {
    console.info(
      'MongoDB is not configured. Set MONGODB_URI in server/.env to save profiles and products.',
    );
    return;
  }

  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000, socketTimeoutMS: 10000 });
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
