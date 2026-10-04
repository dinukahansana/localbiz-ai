export function readEnv(values) {
  const deapiMaxPrice = Number(values.DEAPI_MAX_PRICE || 0.05);
  const deapiDailyLimit = Number(values.DEAPI_DAILY_LIMIT || 20);
  if (!Number.isFinite(deapiMaxPrice) || deapiMaxPrice <= 0 || deapiMaxPrice > 1)
    throw new Error('DEAPI_MAX_PRICE must be greater than 0 and at most 1 credit.');
  if (!Number.isInteger(deapiDailyLimit) || deapiDailyLimit < 1 || deapiDailyLimit > 100)
    throw new Error('DEAPI_DAILY_LIMIT must be an integer between 1 and 100.');
  const production = values.NODE_ENV === 'production';
  const port = Number(values.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  const geminiModel = values.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite';
  if (!/^[a-z0-9][a-z0-9._-]{0,79}$/.test(geminiModel)) {
    throw new Error('GEMINI_MODEL must be a valid model name, not a URL.');
  }
  const clientOrigins = (
    values.CLIENT_URL || (production ? '' : 'http://localhost:5173,http://localhost:4173')
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (!clientOrigins.length) throw new Error('Set CLIENT_URL to your public website origin.');
  for (const origin of clientOrigins) {
    let url;
    try {
      url = new URL(origin);
    } catch {
      throw new Error('CLIENT_URL must contain valid origins, without paths.');
    }
    if (
      url.origin !== origin ||
      !['http:', 'https:'].includes(url.protocol) ||
      (production && url.protocol !== 'https:')
    ) {
      throw new Error('CLIENT_URL must contain exact origins; production requires HTTPS.');
    }
  }
  // Trust only the nearest hosting proxy. Arbitrary forwarded chains permit spoofing.
  const trustProxyHops = Number(values.TRUST_PROXY_HOPS ?? (production ? 1 : 0));
  if (![0, 1].includes(trustProxyHops)) {
    throw new Error(
      'TRUST_PROXY_HOPS must be 0 for a direct server or 1 for the nearest hosting proxy.',
    );
  }
  return {
    production,
    port,
    host: values.HOST?.trim() || (production ? '0.0.0.0' : 'localhost'),
    clientOrigins,
    trustProxyHops,
    mongoUri: values.MONGODB_URI?.trim() || '',
    geminiKey: values.GEMINI_API_KEY?.trim() || '',
    geminiModel,
    deapiKey: values.DEAPI_API_KEY?.trim() || '',
    deapiMaxPrice,
    deapiDailyLimit,
  };
}
