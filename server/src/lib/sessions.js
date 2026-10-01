import { createHash, randomBytes } from 'node:crypto';
import Session from '../models/Session.js';
import { env } from '../config/env.js';

export const cookieName = 'localbiz_session';
const lifetime = 7 * 24 * 60 * 60 * 1000;
const cookieOptions = { httpOnly: true, secure: env.production, sameSite: 'lax', path: '/api' };
export const hashToken = (token) => createHash('sha256').update(token).digest('hex');

export function readToken(request) {
  const token = request.cookies?.[cookieName];
  return typeof token === 'string' && /^[a-zA-Z\d_-]{43}$/.test(token) ? token : null;
}

export async function createSession(request, response, user) {
  const previous = readToken(request);
  if (previous) await Session.deleteOne({ tokenHash: hashToken(previous) });
  const token = randomBytes(32).toString('base64url');
  await Session.create({
    tokenHash: hashToken(token),
    user: user._id,
    expiresAt: new Date(Date.now() + lifetime),
  });
  response.cookie(cookieName, token, { ...cookieOptions, maxAge: lifetime });
}

export function clearSessionCookie(response) {
  response.clearCookie(cookieName, cookieOptions);
}

export function publicUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email };
}
