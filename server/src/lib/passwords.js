import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const deriveKey = promisify(scrypt);
// OWASP's scrypt configuration: 32 MiB memory and three parallel passes.
const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await deriveKey(password, salt, 64, options);
  return `scrypt:${salt}:${key.toString('hex')}`;
}

export async function verifyPassword(password, storedHash) {
  const [algorithm, salt, encodedKey] = storedHash.split(':');
  if (algorithm !== 'scrypt' || !/^[a-f\d]{32}$/.test(salt) || !/^[a-f\d]{128}$/.test(encodedKey))
    return false;
  const expected = Buffer.from(encodedKey, 'hex');
  const actual = await deriveKey(password, salt, expected.length, options);
  return timingSafeEqual(actual, expected);
}
