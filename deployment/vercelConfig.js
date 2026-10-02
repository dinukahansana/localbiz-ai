export function createVercelConfig(backendOrigin) {
  let url;
  try {
    url = new URL(backendOrigin);
  } catch {
    throw new Error('Set LOCALBIZ_API_ORIGIN in Vercel to the HTTPS Render service origin.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new Error(
      'LOCALBIZ_API_ORIGIN must be an HTTPS origin without a path, query, or credentials.',
    );
  }
  return {
    framework: 'vite',
    installCommand: 'npm ci --include=dev',
    buildCommand: 'npm run build:production',
    outputDirectory: 'client/dist',
    rewrites: [
      { source: '/api/:path*', destination: `${url.origin}/api/:path*` },
      { source: '/(.*)', destination: '/index.html' },
    ],
    headers: [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'CDN-Cache-Control', value: 'no-store' },
          { key: 'x-vercel-enable-rewrite-caching', value: '0' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ],
  };
}
