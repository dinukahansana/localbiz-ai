import { env } from '../config/env.js';

export default function protectWrites(request, response, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next();
  // A custom header prevents cross-site forms; browsers preflight cross-origin requests.
  const origin = request.get('origin');
  if (
    request.get('X-LocalBiz-Request') !== '1' ||
    (origin && !env.clientOrigins.includes(origin))
  ) {
    return response.status(403).json({ error: 'Request origin could not be verified.' });
  }
  next();
}
