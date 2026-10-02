import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import { readEnv } from '../src/config/readEnv.js';
import { createVercelConfig } from '../../deployment/vercelConfig.js';

test('production configuration rejects broken origins and unsafe proxy trust', () => {
  assert.equal(readEnv({}).host, 'localhost');
  assert.equal(readEnv({}).trustProxyHops, 0);
  assert.throws(() => readEnv({ NODE_ENV: 'production' }), /CLIENT_URL/);
  for (const CLIENT_URL of [
    'http://example.test',
    'https://example.test/path',
    '*',
    'https://example.test/',
  ]) {
    assert.throws(() => readEnv({ NODE_ENV: 'production', CLIENT_URL }), /CLIENT_URL/);
  }
  for (const TRUST_PROXY_HOPS of ['true', '2', '-1', 'invalid']) {
    assert.throws(() => readEnv({ TRUST_PROXY_HOPS }), /TRUST_PROXY_HOPS/);
  }
  const env = readEnv({
    NODE_ENV: 'production',
    CLIENT_URL: 'https://localbiz.example.test',
    PORT: '10000',
  });
  assert.equal(env.host, '0.0.0.0');
  assert.equal(env.port, 10000);
  assert.equal(env.trustProxyHops, 1);
  assert.equal(env.mongoUri, '');
});

test('deployment proxy needs a public HTTPS origin without credentials or a path', () => {
  for (const origin of [
    undefined,
    '',
    'http://api.example.test',
    'https://api.example.test/api',
    'https://user:dummy@api.example.test',
    'https://api.example.test?query=1',
    'https://api.example.test#fragment',
  ]) {
    assert.throws(() => createVercelConfig(origin), /LOCALBIZ_API_ORIGIN/);
  }
  const config = createVercelConfig('https://api.example.test/');
  assert.equal(config.rewrites[0].destination, 'https://api.example.test/api/:path*');
});

process.env.NODE_ENV = 'production';
process.env.CLIENT_URL = 'https://localbiz.example.test';
process.env.TRUST_PROXY_HOPS = '1';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/deployment-test-placeholder';
process.env.GEMINI_API_KEY = '';
const { default: app } = await import('../src/app.js');

test('production API behind a hosting proxy', async (t) => {
  const mongo = await MongoMemoryServer.create({
    binary: {
      downloadDir: fileURLToPath(
        new URL('../../node_modules/.cache/mongodb-binaries', import.meta.url),
      ),
    },
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongo.stop();
  });
  const headers = {
    'Content-Type': 'application/json',
    'X-LocalBiz-Request': '1',
    Origin: 'https://localbiz.example.test',
  };
  let cookie;
  await t.test(
    'readiness fails before the database is connected, while liveness stays public',
    async () => {
      const ready = await fetch(`${base}/ready`);
      assert.equal(ready.status, 503);
      assert.deepEqual(await ready.json(), {
        status: 'not_ready',
        service: 'localbiz-ai-api',
        database: 'disconnected',
      });
      assert.equal((await fetch(`${base}/health`)).status, 200);
      await mongoose.connect(mongo.getUri('deployment_contract_test'));
      const connected = await fetch(`${base}/ready`);
      assert.equal(connected.status, 200);
      assert.equal((await connected.json()).status, 'ready');
    },
  );
  await t.test(
    'public website origin can register; the cookie stays private and HTTPS-only',
    async () => {
      const response = await fetch(`${base}/auth/register`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: 'Release Tester',
          email: 'release@example.test',
          password: 'release-test-password-123',
        }),
      });
      assert.equal(response.status, 201);
      const setCookie = response.headers.get('set-cookie');
      for (const pattern of [/HttpOnly/, /Secure/, /SameSite=Lax/, /Path=\/api/])
        assert.match(setCookie, pattern);
      assert.doesNotMatch(setCookie, /Domain=/);
      cookie = setCookie.split(';')[0];
      const session = await fetch(`${base}/auth/me`, { headers: { Cookie: cookie } });
      assert.equal(session.status, 200);
      assert.equal((await session.json()).user.email, 'release@example.test');
    },
  );
  await t.test(
    'other preview origins cannot write and all private/error replies forbid CDN caching',
    async () => {
      const blocked = await fetch(`${base}/products`, {
        method: 'POST',
        headers: { ...headers, Cookie: cookie, Origin: 'https://preview.example.test' },
        body: JSON.stringify({ name: 'Forbidden', price: '10.00', currency: 'LKR' }),
      });
      assert.equal(blocked.status, 403);
      for (const path of ['/products', '/campaigns', '/schedules', '/unknown']) {
        const response = await fetch(`${base}${path}`, { headers: { Cookie: cookie } });
        assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.equal(response.headers.get('cdn-cache-control'), 'no-store');
        assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      }
    },
  );
  await t.test('only the nearest proxy is trusted when forwarded chains are supplied', async () => {
    const probe = express();
    probe.set('trust proxy', app.get('trust proxy'));
    probe.get('/', (request, response) => response.json({ ip: request.ip }));
    const probeServer = probe.listen(0, '127.0.0.1');
    await new Promise((resolve) => probeServer.once('listening', resolve));
    try {
      const response = await fetch(`http://127.0.0.1:${probeServer.address().port}`, {
        headers: { 'X-Forwarded-For': '203.0.113.10, 198.51.100.20' },
      });
      assert.equal((await response.json()).ip, '198.51.100.20');
    } finally {
      await new Promise((resolve) => probeServer.close(resolve));
    }
  });
  await t.test('logout revokes the session and clears the same secure cookie', async () => {
    const response = await fetch(`${base}/auth/logout`, {
      method: 'POST',
      headers: { ...headers, Cookie: cookie },
    });
    assert.equal(response.status, 204);
    assert.match(response.headers.get('set-cookie'), /Secure/);
    assert.match(response.headers.get('set-cookie'), /Path=\/api/);
    assert.equal((await fetch(`${base}/auth/me`, { headers: { Cookie: cookie } })).status, 401);
  });
});
