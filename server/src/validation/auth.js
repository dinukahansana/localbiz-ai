export function validateAuth(input, registering) {
  const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const errors = {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (registering && (!name || name.length > 100))
    errors.name = 'Enter your name using 1 to 100 characters.';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = 'Enter a valid email address.';
  if (!password || password.length > 128 || (registering && password.length < 15)) {
    errors.password = registering
      ? 'Use a password with 15 to 128 characters.'
      : 'Enter your password (up to 128 characters).';
  }
  return { data: { name, email, password }, errors };
}
