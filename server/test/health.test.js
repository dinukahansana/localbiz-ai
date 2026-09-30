import test from 'node:test';
import assert from 'node:assert/strict';

// Tests never connect to, or depend on, a developer's real database.
process.env.MONGODB_URI = '';
process.env.CLIENT_URL = 'http://localhost:5173,http://localhost:4173';
const { default: app } = await import('../src/app.js');

test('Phase 1 HTTP contract', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;

  await t.test('health works without MongoDB and returns no secrets', async () => {
    const response = await fetch(`${url}/api/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'localbiz-ai-api');
    assert.equal(body.database, 'not_configured');
    assert.ok(Number.isFinite(Date.parse(body.timestamp)));
    assert.ok(body.uptimeSeconds >= 0);
    assert.deepEqual(Object.keys(body).sort(), [
      'database',
      'service',
      'status',
      'timestamp',
      'uptimeSeconds',
    ]);
  });

  await t.test('allows configured development and preview origins', async () => {
    for (const origin of ['http://localhost:5173', 'http://localhost:4173']) {
      const response = await fetch(`${url}/api/health`, { headers: { Origin: origin } });
      assert.equal(response.headers.get('access-control-allow-origin'), origin);
    }
    const response = await fetch(`${url}/api/health`, {
      headers: { Origin: 'https://unconfigured.example' },
    });
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  });

  await t.test('unknown routes return JSON 404', async () => {
    const response = await fetch(`${url}/api/missing`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'Route not found.' });
  });

  await t.test('invalid JSON returns a readable 400', async () => {
    const response = await fetch(`${url}/api/health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{broken',
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'Invalid JSON body.' });
  });
});
