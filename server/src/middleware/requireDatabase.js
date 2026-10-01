import mongoose from 'mongoose';

export default function requireDatabase(request, response, next) {
  if (mongoose.connection.readyState !== 1) {
    return response.status(503).json({
      error: 'The database is unavailable. Check the connection and try again.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }
  next();
}
