import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import User from '../models/User.js';
import Session from '../models/Session.js';
import requireAuth from '../middleware/requireAuth.js';
import { validateAuth } from '../validation/auth.js';
import { hashPassword, verifyPassword } from '../lib/passwords.js';
import {
  createSession,
  clearSessionCookie,
  hashToken,
  readToken,
  publicUser,
} from '../lib/sessions.js';

const router = Router();
const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
});
const dummyHash = hashPassword('unused-dummy-password-for-timing');

router.use((request, response, next) => {
  response.set('Cache-Control', 'no-store');
  next();
});

router.post('/register', authLimit, async (request, response) => {
  const { data, errors } = validateAuth(request.body, true);
  if (Object.keys(errors).length)
    return response
      .status(400)
      .json({ error: 'Please check the highlighted fields.', fields: errors });
  // Await the unique email index before accepting registrations, including concurrent requests.
  await User.init();
  let user;
  try {
    user = await User.create({
      name: data.name,
      email: data.email,
      passwordHash: await hashPassword(data.password),
    });
  } catch (error) {
    if (error.code === 11000)
      return response.status(409).json({
        error: 'An account with that email already exists. Please log in.',
        fields: { email: 'This email is already registered.' },
      });
    throw error;
  }
  await createSession(request, response, user);
  response.status(201).json({ user: publicUser(user) });
});

router.post('/login', authLimit, async (request, response) => {
  const { data, errors } = validateAuth(request.body, false);
  if (Object.keys(errors).length)
    return response
      .status(400)
      .json({ error: 'Please check the highlighted fields.', fields: errors });
  const user = await User.findOne({ email: data.email }).select('+passwordHash');
  const matches = await verifyPassword(data.password, user?.passwordHash || (await dummyHash));
  if (!user || !matches)
    return response.status(401).json({ error: 'Email or password is incorrect.' });
  await createSession(request, response, user);
  response.json({ user: publicUser(user) });
});

router.get('/me', requireAuth, (request, response) =>
  response.json({ user: publicUser(request.user) }),
);

router.post('/logout', async (request, response) => {
  const token = readToken(request);
  if (token) await Session.deleteOne({ tokenHash: hashToken(token) });
  clearSessionCookie(response);
  response.status(204).end();
});

export default router;
