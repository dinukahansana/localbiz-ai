import Session from '../models/Session.js';
import User from '../models/User.js';
import { readToken, hashToken, clearSessionCookie } from '../lib/sessions.js';

export default async function requireAuth(request, response, next) {
  response.set('Cache-Control', 'no-store');
  const token = readToken(request);
  const session =
    token &&
    (await Session.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } }).lean());
  const user = session && (await User.findById(session.user).select('name email').lean());
  if (!user) {
    clearSessionCookie(response);
    return response
      .status(401)
      .json({ error: 'Please log in to continue.', code: 'UNAUTHENTICATED' });
  }
  request.user = user;
  next();
}
