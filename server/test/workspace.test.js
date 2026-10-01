import test from 'node:test';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server-core';

// This suite uses its own disposable database, never server/.env or Atlas.
process.env.MONGODB_URI = 'mongodb://127.0.0.1/test-placeholder';
const { default: app } = await import('../src/app.js');

test('business workspace persistence and validation', async (t) => {
  const mongo = await MongoMemoryServer.create({
    binary: {
      downloadDir: fileURLToPath(
        new URL('../../node_modules/.cache/mongodb-binaries', import.meta.url),
      ),
    },
  });
  t.after(() => mongo.stop());
  const uri = mongo.getUri('localbiz_test');
  await mongoose.connect(uri);
  t.after(() => mongoose.disconnect());
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function request(path, method = 'GET', body) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: response.status,
      body: response.status === 204 ? null : await response.json(),
    };
  }
  const details = {
    name: 'Neighborhood Bakery',
    category: 'Bakery',
    location: 'Colombo',
    story: 'Fresh daily.',
  };
  const product = {
    name: 'Bread',
    category: 'Bakery',
    description: 'Fresh bread',
    price: '125.50',
    currency: 'LKR',
    imageUrl: '',
  };
  let id;

  await t.test('fresh database has a null profile and empty catalog', async () => {
    assert.deepEqual((await request('/business-profile')).body, { profile: null });
    assert.deepEqual((await request('/products')).body, { products: [], total: 0 });
    assert.equal((await request('/health')).body.database, 'connected');
  });
  await t.test('profile creates, updates, and remains one record', async () => {
    const saved = await request('/business-profile', 'PUT', {
      ...details,
      name: '  Neighborhood Bakery  ',
      _id: 'other',
      $set: { name: 'Injected' },
    });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.profile.name, details.name);
    const updated = await request('/business-profile', 'PUT', { ...details, location: 'Kandy' });
    assert.equal(updated.body.profile.location, 'Kandy');
    assert.equal(await mongoose.connection.collection('businessprofiles').countDocuments(), 1);
  });
  await t.test('invalid profile cannot replace saved details', async () => {
    const invalid = await request('/business-profile', 'PUT', { name: ' ', category: { $ne: '' } });
    assert.equal(invalid.status, 400);
    assert.ok(invalid.body.fields.name);
    assert.ok(invalid.body.fields.category);
    assert.equal((await request('/business-profile')).body.profile.location, 'Kandy');
  });
  await t.test('creates, lists, and retrieves a product with exact price', async () => {
    const created = await request('/products', 'POST', {
      ...product,
      _id: 'a'.repeat(24),
      priceMinor: 1,
      $set: { name: 'Injected' },
    });
    assert.equal(created.status, 201);
    id = created.body.product.id;
    assert.notEqual(id, 'a'.repeat(24));
    assert.equal(created.body.product.price, '125.50');
    assert.equal(created.body.product.name, 'Bread');
    assert.equal((await request('/products')).body.total, 1);
    assert.deepEqual((await request(`/products/${id}`)).body.product, created.body.product);
  });
  await t.test('data survives disconnect and reconnect; updates persist', async () => {
    await mongoose.disconnect();
    await mongoose.connect(uri);
    assert.equal((await request('/business-profile')).body.profile.name, details.name);
    assert.equal((await request('/products')).body.total, 1);
    const updated = await request(`/products/${id}`, 'PUT', {
      ...product,
      name: 'Wholegrain bread',
      price: '0',
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.product.price, '0.00');
    assert.equal((await request(`/products/${id}`)).body.product.name, 'Wholegrain bread');
  });
  await t.test(
    'invalid prices, currencies, URLs, bodies, and IDs never create records',
    async () => {
      for (const patch of [
        { price: '-1' },
        { price: '1.001' },
        { price: '1e3' },
        { price: '10000000' },
        { price: null },
        { currency: 'XYZ' },
        { name: ' ' },
        { name: { $ne: '' } },
        { description: 'x'.repeat(2001) },
        { imageUrl: 'javascript:alert(1)' },
        { imageUrl: 'https://user:secret@example.com/image.jpg' },
      ]) {
        assert.equal((await request('/products', 'POST', { ...product, ...patch })).status, 400);
      }
      assert.equal((await request('/products', 'POST', [])).status, 400);
      assert.equal((await request('/products/not-an-id')).status, 400);
      assert.equal((await request('/products')).body.total, 1);
      const invalidUpdate = await request(`/products/${id}`, 'PUT', { ...product, price: '-2' });
      assert.equal(invalidUpdate.status, 400);
      assert.equal((await request(`/products/${id}`)).body.product.price, '0.00');
    },
  );
  await t.test('delete removes a product; missing IDs return 404', async () => {
    assert.equal((await request(`/products/${id}`, 'DELETE')).status, 204);
    assert.equal((await request('/products')).body.total, 0);
    assert.equal((await request(`/products/${id}`)).status, 404);
    assert.equal((await request(`/products/${id}`, 'PUT', product)).status, 404);
    assert.equal((await request(`/products/${id}`, 'DELETE')).status, 404);
  });
  await t.test('database unavailable returns 503 promptly while health stays live', async () => {
    await mongoose.disconnect();
    for (const [path, method, body] of [
      ['/products', 'GET'],
      ['/products', 'POST', product],
      [`/products/${id}`, 'PUT', product],
      [`/products/${id}`, 'DELETE'],
      ['/business-profile', 'GET'],
      ['/business-profile', 'PUT', details],
    ]) {
      const response = await request(path, method, body);
      assert.equal(response.status, 503);
      assert.equal(response.body.code, 'DATABASE_UNAVAILABLE');
    }
    assert.equal((await request('/health')).status, 200);
  });
});
