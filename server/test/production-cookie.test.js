import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server-core';

process.env.NODE_ENV = 'production';
process.env.CLIENT_URL = 'https://localbiz.example.test';
process.env.TRUST_PROXY_HOPS = '1';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/production-cookie-test';
const { default: app } = await import('../src/app.js');

test('production authentication cookies require HTTPS', async (t) => {
  const mongo = await MongoMemoryServer.create({
    binary: {
      downloadDir: fileURLToPath(
        new URL('../../node_modules/.cache/mongodb-binaries', import.meta.url),
      ),
    },
  });
  await mongoose.connect(mongo.getUri('secure_cookie_test'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongo.stop();
  });
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-LocalBiz-Request': '1' },
    body: JSON.stringify({
      name: 'HTTPS Tester',
      email: 'https@example.test',
      password: 'secure-cookie-test-password',
    }),
  });
  assert.equal(response.status, 201);
  assert.match(response.headers.get('set-cookie'), /; Secure/);
  assert.match(response.headers.get('set-cookie'), /; HttpOnly/);
});
