import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { MongoMemoryServer } from 'mongodb-memory-server-core';

process.env.MONGODB_URI = 'mongodb://127.0.0.1/disposable-placeholder';
process.env.GEMINI_API_KEY = '';
process.env.DEAPI_API_KEY = '';
const { createApp } = await import('../src/app.js');
const { default: Product } = await import('../src/models/Product.js');
const { default: Campaign } = await import('../src/models/Campaign.js');
const { default: PosterGeneration } = await import('../src/models/PosterGeneration.js');

test('product photos persist privately and become deliberate AI references', async (t) => {
  const mongo = await MongoMemoryServer.create({
    binary: {
      downloadDir: fileURLToPath(
        new URL('../../node_modules/.cache/mongodb-binaries', import.meta.url),
      ),
    },
  });
  t.after(() => mongo.stop());
  const uri = mongo.getUri('localbiz_product_photo_test');
  await mongoose.connect(uri);
  t.after(() => mongoose.disconnect());
  let submissions = 0;
  let quoted;
  let submitted;
  const provider = {
    configured: true,
    quote: async (input) => {
      quoted = input;
      return 0.015;
    },
    start: async (input) => {
      submitted = input;
      submissions++;
      return 'simulated-job';
    },
  };
  const server = createApp({ imageProvider: provider }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  let owner;
  async function request(path, method = 'GET', body, cookie = owner, marker = '1') {
    const response = await fetch(base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-LocalBiz-Request': marker,
        Cookie: cookie || '',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: response.status,
      headers: response.headers,
      body:
        response.status === 204
          ? null
          : response.headers.get('content-type')?.startsWith('image/')
            ? Buffer.from(await response.arrayBuffer())
            : await response.json(),
    };
  }
  async function register(email) {
    const result = await request(
      '/auth/register',
      'POST',
      {
        name: 'Photo Tester',
        email,
        password: 'disposable-photo-test-password',
      },
      '',
    );
    assert.equal(result.status, 201);
    return result.headers.get('set-cookie').split(';')[0];
  }
  owner = await register('photo-owner@example.test');
  const other = await register('photo-other@example.test');
  const upload = await sharp({
    create: { width: 1600, height: 800, channels: 3, background: '#a83232' },
  })
    .withMetadata()
    .png()
    .toBuffer();
  const photo = 'data:image/png;base64,' + upload.toString('base64');
  const fields = {
    name: 'Cookie box',
    category: 'Bakery',
    description: 'Six cookies',
    price: '1500',
    currency: 'LKR',
    imageUrl: '',
  };
  let product;
  let originalBytes;

  await t.test(
    'create normalizes a real image, strips metadata and omits private bytes',
    async () => {
      const result = await request('/products', 'POST', {
        ...fields,
        photo,
        owner: 'ignored',
        photoVersion: 'fake',
        photoData: 'ignored',
      });
      assert.equal(result.status, 201);
      product = result.body.product;
      assert.equal(product.hasPhoto, true);
      assert.notEqual(product.photoVersion, 'fake');
      assert.equal(product.photoData, undefined);
      const hidden = await Product.findById(product.id);
      assert.equal(hidden.photoData, undefined);
      const image = await request(`/products/${product.id}/photo`);
      assert.equal(image.status, 200);
      assert.match(image.headers.get('content-type'), /^image\/jpeg/);
      assert.equal(image.headers.get('cache-control'), 'no-store');
      originalBytes = image.body;
      const info = await sharp(originalBytes).metadata();
      assert.equal(info.width, 1280);
      assert.equal(info.height, 640);
      assert.equal(info.exif, undefined);
      assert.equal(info.icc, undefined);
      assert.deepEqual((await request('/products')).body.products[0], product);
    },
  );
  await t.test('login, owner and write-marker checks protect stored photos and edits', async () => {
    assert.equal(
      (await request(`/products/${product.id}/photo`, 'GET', undefined, '')).status,
      401,
    );
    assert.equal(
      (await request(`/products/${product.id}/photo`, 'GET', undefined, other)).status,
      404,
    );
    assert.equal(
      (await request(`/products/${product.id}`, 'PUT', { ...fields, photo }, other)).status,
      404,
    );
    assert.equal((await request('/products', 'POST', { ...fields, photo }, owner, '')).status, 403);
  });
  await t.test('text edits preserve the photo and it survives reconnecting', async () => {
    const result = await request(`/products/${product.id}`, 'PUT', {
      ...fields,
      name: 'Gift cookie box',
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.product.photoVersion, product.photoVersion);
    await mongoose.disconnect();
    await mongoose.connect(uri);
    assert.deepEqual((await request(`/products/${product.id}/photo`)).body, originalBytes);
  });
  await t.test(
    'invalid, oversized, unsupported and huge-pixel photos never replace good data',
    async () => {
      const huge = await sharp({
        create: {
          width: 5000,
          height: 4001,
          channels: 3,
          background: '#ffffff',
        },
      })
        .png()
        .toBuffer();
      const badPhotos = [
        {},
        'https://example.test/photo.jpg',
        'data:image/png;base64,bm90YW5pbWFnZQ==',
        'data:image/png;base64,' +
          Buffer.from(
            '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>',
          ).toString('base64'),
        'data:image/png;base64,' + huge.toString('base64'),
        'data:image/png;base64,' + Buffer.alloc(5 * 1024 * 1024 + 1).toString('base64'),
      ];
      for (const invalid of badPhotos) {
        const result = await request(`/products/${product.id}`, 'PUT', {
          ...fields,
          name: 'Bad replacement',
          photo: invalid,
        });
        assert.equal(result.status, 400);
        assert.ok(result.body.fields.photo);
      }
      assert.equal((await request(`/products/${product.id}`)).body.product.name, 'Gift cookie box');
      assert.deepEqual((await request(`/products/${product.id}/photo`)).body, originalBytes);
      assert.equal(
        (await request('/products', 'POST', { ...fields, photo: badPhotos[2] })).status,
        400,
      );
      assert.equal((await request('/products')).body.total, 1);
    },
  );
  let campaign;
  await t.test(
    'saved-photo generation sends owned image bytes and chooses the editing model',
    async () => {
      const stored = await Product.findById(product.id);
      campaign = await Campaign.create({
        owner: stored.owner,
        product: product.id,
        productName: fields.name,
        businessName: 'Bakery',
        goal: 'Sell cookies',
        audience: 'Families',
        platform: 'instagram',
        tone: 'friendly',
        language: 'English',
        title: 'Cookie treats',
        posts: Array.from({ length: 3 }, () => ({
          angle: 'Cookie treats',
          caption: 'Six delicious cookies',
          callToAction: 'Order today',
          hashtags: ['#Bakery'],
          imageIdea: 'A warm scene',
        })),
      });
      const body = {
        requestKey: randomUUID(),
        headline: 'Cookie treats',
        callToAction: 'Order today',
        prompt: 'A warm studio scene',
        brandColor: '#245b46',
        style: 'studio',
        useProductPhoto: true,
      };
      const path = `/poster-generations/${campaign.id}/0`;
      assert.equal((await request(path, 'POST', body, other)).status, 404);
      assert.equal((await request(path, 'POST', { ...body, image: photo })).status, 400);
      const result = await request(path, 'POST', body);
      assert.equal(result.status, 202);
      assert.equal(result.body.generation.model, 'QwenImageEdit_Plus_NF4');
      assert.equal(submissions, 1);
      assert.ok(Buffer.isBuffer(submitted.image));
      assert.deepEqual(submitted.image, quoted.image);
      assert.equal((await sharp(submitted.image).metadata()).width, 1024);
      assert.match(submitted.prompt, /source of truth/);
      assert.equal(
        (await request(path, 'POST', body)).body.generation.id,
        result.body.generation.id,
      );
      assert.equal(submissions, 1);
      await PosterGeneration.updateMany({}, { $set: { active: false, status: 'error' } });
    },
  );
  await t.test(
    'replace and explicit removal persist; missing saved photo never buys a concept',
    async () => {
      const replacement = await sharp({
        create: { width: 200, height: 300, channels: 3, background: '#245b46' },
      })
        .webp()
        .toBuffer();
      const updated = await request(`/products/${product.id}`, 'PUT', {
        ...fields,
        photo: 'data:image/webp;base64,' + replacement.toString('base64'),
      });
      assert.equal(updated.status, 200);
      assert.notEqual(updated.body.product.photoVersion, product.photoVersion);
      assert.equal(
        (await sharp((await request(`/products/${product.id}/photo`)).body).metadata()).height,
        300,
      );
      const removed = await request(`/products/${product.id}`, 'PUT', {
        ...fields,
        photo: null,
        imageUrl: 'https://example.test/image.jpg',
      });
      assert.equal(removed.body.product.hasPhoto, false);
      assert.equal((await request(`/products/${product.id}/photo`)).status, 404);
      const result = await request(`/poster-generations/${campaign.id}/1`, 'POST', {
        requestKey: randomUUID(),
        headline: 'Cookies',
        callToAction: 'Order today',
        prompt: 'Studio scene',
        brandColor: '#245b46',
        style: 'studio',
        useProductPhoto: true,
      });
      assert.equal(result.status, 409);
      assert.equal(submissions, 1);
      assert.equal((await Product.findById(product.id).select('+photoData')).photoData, null);
    },
  );
  await t.test('deleting a product deletes its stored photo too', async () => {
    await request(`/products/${product.id}`, 'PUT', { ...fields, photo });
    assert.equal((await request(`/products/${product.id}`, 'DELETE')).status, 204);
    assert.equal((await request(`/products/${product.id}/photo`)).status, 404);
    assert.equal(await Product.countDocuments(), 0);
  });
});
