import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import User from '../src/models/User.js';
import Session from '../src/models/Session.js';

process.env.MONGODB_URI = 'mongodb://127.0.0.1/isolated-auth-placeholder';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.NODE_ENV = 'development';
const { default: app } = await import('../src/app.js');
const { hashToken } = await import('../src/lib/sessions.js');

test('authentication and private workspaces', async (t) => {
  const mongo = await MongoMemoryServer.create({
    binary: {
      downloadDir: fileURLToPath(
        new URL('../../node_modules/.cache/mongodb-binaries', import.meta.url),
      ),
    },
  });
  await mongoose.connect(mongo.getUri('auth_test'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongo.stop();
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function request(path, method = 'GET', body, cookie = '', extraHeaders = {}) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-LocalBiz-Request': '1',
        Cookie: cookie,
        ...extraHeaders,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: response.status,
      body: response.status === 204 ? null : await response.json(),
      cookie: response.headers.get('set-cookie')?.split(';')[0] || '',
      headers: response.headers,
    };
  }
  const alice = { name: 'Alice', email: 'alice@example.test', password: 'alice-test-password-123' };
  const bob = { name: 'Bob', email: 'bob@example.test', password: 'bob-test-password-12345' };
  const product = { name: 'Tea', price: '120.00', currency: 'LKR' };
  let aliceCookie, bobCookie, aliceId, bobId, productId;

  await t.test('anonymous requests are rejected and health remains public', async () => {
    for (const path of ['/auth/me', '/products', '/business-profile'])
      assert.equal((await request(path)).status, 401);
    assert.equal((await request('/products', 'POST', product)).status, 401);
    assert.equal((await request('/health')).status, 200);
  });
  await t.test(
    'registration validates fields and creates an HttpOnly session without leaking hashes',
    async () => {
      const invalid = await request('/auth/register', 'POST', {
        name: ' ',
        email: 'bad',
        password: 'short',
      });
      assert.equal(invalid.status, 400);
      assert.ok(invalid.body.fields.password);
      const registered = await request('/auth/register', 'POST', {
        ...alice,
        email: ' ALICE@EXAMPLE.TEST ',
        owner: 'forged',
      });
      assert.equal(registered.status, 201);
      aliceCookie = registered.cookie;
      aliceId = registered.body.user.id;
      assert.deepEqual(Object.keys(registered.body.user).sort(), ['email', 'id', 'name']);
      assert.equal(registered.body.user.email, alice.email);
      const cookieHeader = registered.headers.get('set-cookie');
      assert.match(cookieHeader, /HttpOnly/);
      assert.match(cookieHeader, /SameSite=Lax/);
      assert.match(cookieHeader, /Path=\/api/);
      assert.doesNotMatch(cookieHeader, /Secure/);
      const stored = await User.findById(aliceId).select('+passwordHash').lean();
      assert.notEqual(stored.passwordHash, alice.password);
      assert.match(stored.passwordHash, /^scrypt:/);
      const token = aliceCookie.split('=')[1];
      assert.equal(await Session.countDocuments({ tokenHash: token }), 0);
      assert.equal(
        (await request('/auth/me', 'GET', undefined, aliceCookie)).body.user.id,
        aliceId,
      );
      assert.equal(registered.headers.get('cache-control'), 'no-store');
    },
  );
  await t.test(
    'duplicate and concurrent registrations cannot create duplicate emails',
    async () => {
      assert.equal((await request('/auth/register', 'POST', alice)).status, 409);
      const concurrent = { ...bob, email: 'race@example.test' };
      const outcomes = await Promise.all([
        request('/auth/register', 'POST', concurrent),
        request('/auth/register', 'POST', concurrent),
      ]);
      assert.deepEqual(outcomes.map((result) => result.status).sort(), [201, 409]);
      assert.equal(await User.countDocuments({ email: concurrent.email }), 1);
    },
  );
  await t.test(
    'wrong and unknown credentials have the same error; login rotates the session',
    async () => {
      const wrong = await request('/auth/login', 'POST', { ...alice, password: 'wrong-password' });
      const unknown = await request('/auth/login', 'POST', {
        ...alice,
        email: 'unknown@example.test',
      });
      assert.equal(wrong.status, 401);
      assert.deepEqual(wrong.body, unknown.body);
      const oldCookie = aliceCookie;
      const login = await request('/auth/login', 'POST', alice, oldCookie);
      assert.equal(login.status, 200);
      assert.notEqual(login.cookie, oldCookie);
      aliceCookie = login.cookie;
      assert.equal((await request('/auth/me', 'GET', undefined, oldCookie)).status, 401);
      const second = await request('/auth/register', 'POST', bob);
      assert.equal(second.status, 201);
      bobCookie = second.cookie;
      bobId = second.body.user.id;
    },
  );
  await t.test('legacy shared records stay untouched and hidden from both accounts', async () => {
    await mongoose.connection.collection('businessprofiles').insertOne({
      _id: 'primary',
      name: 'Legacy business',
      category: 'Shop',
      story: '',
      location: '',
    });
    await mongoose.connection
      .collection('products')
      .insertOne({ name: 'Legacy product', priceMinor: 100, currency: 'LKR' });
    for (const cookie of [aliceCookie, bobCookie]) {
      assert.deepEqual((await request('/business-profile', 'GET', undefined, cookie)).body, {
        profile: null,
      });
      assert.deepEqual((await request('/products', 'GET', undefined, cookie)).body, {
        products: [],
        total: 0,
      });
    }
  });
  await t.test(
    'accounts cannot read, change, or delete each other’s profiles and products',
    async () => {
      const profile = await request(
        '/business-profile',
        'PUT',
        { name: 'Alice Shop', category: 'Shop', owner: bobId, _id: bobId },
        aliceCookie,
      );
      assert.equal(profile.status, 200);
      assert.equal(
        (await request('/business-profile', 'GET', undefined, bobCookie)).body.profile,
        null,
      );
      const created = await request('/products', 'POST', { ...product, owner: bobId }, aliceCookie);
      assert.equal(created.status, 201);
      productId = created.body.product.id;
      assert.equal((await request('/products', 'GET', undefined, aliceCookie)).body.total, 1);
      assert.equal((await request('/products', 'GET', undefined, bobCookie)).body.total, 0);
      for (const [method, body] of [['GET'], ['PUT', product], ['DELETE']])
        assert.equal(
          (await request(`/products/${productId}`, method, body, bobCookie)).status,
          404,
        );
      assert.equal(
        (await request(`/products/${productId}`, 'GET', undefined, aliceCookie)).status,
        200,
      );
      const owner = await mongoose.connection
        .collection('products')
        .findOne({ _id: new mongoose.Types.ObjectId(productId) });
      assert.equal(owner.owner.toString(), aliceId);
    },
  );
  await t.test('cross-site writes and missing request markers are rejected', async () => {
    assert.equal(
      (
        await request('/products', 'POST', product, aliceCookie, {
          Origin: 'https://other.example',
        })
      ).status,
      403,
    );
    assert.equal(
      (await request('/auth/logout', 'POST', undefined, aliceCookie, { 'X-LocalBiz-Request': '' }))
        .status,
      403,
    );
    assert.equal(
      (
        await request('/products', 'POST', product, aliceCookie, {
          Origin: 'http://localhost:5173',
        })
      ).status,
      201,
    );
  });
  await t.test(
    'expired or forged sessions are rejected; logout revokes a valid session',
    async () => {
      assert.equal(
        (await request('/auth/me', 'GET', undefined, 'localbiz_session=forged')).status,
        401,
      );
      await Session.updateMany({ user: bobId }, { expiresAt: new Date(Date.now() - 1000) });
      assert.equal((await request('/auth/me', 'GET', undefined, bobCookie)).status, 401);
      const logout = await request('/auth/logout', 'POST', undefined, aliceCookie);
      assert.equal(logout.status, 204);
      assert.match(logout.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/);
      assert.equal((await request('/auth/me', 'GET', undefined, aliceCookie)).status, 401);
    },
  );
  await t.test('login attempts are rate-limited', async () => {
    let limited = false;
    for (let attempt = 0; attempt < 21; attempt++) {
      const response = await request('/auth/login', 'POST', { email: 'bad', password: '' });
      if (response.status === 429) {
        limited = true;
        assert.ok(response.headers.get('retry-after'));
        break;
      }
    }
    assert.equal(limited, true);
  });
  await t.test('sessions survive API reconnect and database failure is readable', async () => {
    assert.ok(await mongoose.connection.collection('businessprofiles').findOne({ _id: 'primary' }));
    const persistentToken = 'c'.repeat(43);
    await Session.create({
      tokenHash: hashToken(persistentToken),
      user: aliceId,
      expiresAt: new Date(Date.now() + 60000),
    });
    await mongoose.disconnect();
    await mongoose.connect(mongo.getUri('auth_test'));
    assert.equal(
      (await request('/auth/me', 'GET', undefined, 'localbiz_session=' + persistentToken)).body.user
        .id,
      aliceId,
    );
    await mongoose.disconnect();
    assert.equal((await request('/auth/me')).status, 503);
    assert.equal((await request('/health')).status, 200);
  });
});
