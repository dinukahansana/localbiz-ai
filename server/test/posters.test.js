import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { MongoMemoryServer } from 'mongodb-memory-server-core';

process.env.MONGODB_URI = 'mongodb://127.0.0.1/disposable-placeholder';
process.env.GEMINI_API_KEY = '';
const { createApp } = await import('../src/app.js');
const { default: CampaignPoster } = await import('../src/models/CampaignPoster.js');

test('private photo-poster validation, replacement, download and cleanup', async (t) => {
  const mongo = await MongoMemoryServer.create({
    binary: {
      downloadDir: fileURLToPath(
        new URL('../../node_modules/.cache/mongodb-binaries', import.meta.url),
      ),
    },
  });
  t.after(() => mongo.stop());
  const uri = mongo.getUri('localbiz_poster_test');
  await mongoose.connect(uri);
  t.after(() => mongoose.disconnect());
  await CampaignPoster.init();
  async function startApp() {
    const server = createApp().listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    return `http://127.0.0.1:${server.address().port}/api`;
  }
  const base = await startApp();
  async function request(
    path,
    method = 'GET',
    body,
    cookie = owner,
    endpoint = base,
    marker = '1',
  ) {
    const response = await fetch(endpoint + path, {
      method,
      headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-LocalBiz-Request': marker },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const contentType = response.headers.get('content-type') || '';
    return {
      status: response.status,
      headers: response.headers,
      body:
        response.status === 204
          ? null
          : contentType.startsWith('image/')
            ? Buffer.from(await response.arrayBuffer())
            : await response.json(),
    };
  }
  async function register(email) {
    const response = await fetch(base + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-LocalBiz-Request': '1' },
      body: JSON.stringify({ name: 'Poster Tester', email, password: 'poster-test-password-123' }),
    });
    assert.equal(response.status, 201);
    return response.headers.get('set-cookie').split(';')[0];
  }
  const owner = await register('poster-owner@example.test');
  const other = await register('poster-other@example.test');
  await request('/business-profile', 'PUT', { name: 'Neighborhood Bakery', category: 'Bakery' });
  const productId = (
    await request('/products', 'POST', {
      name: 'Wholegrain loaf',
      price: '125.50',
      currency: 'LKR',
    })
  ).body.product.id;
  const campaignId = (
    await request('/campaigns', 'POST', {
      productId,
      goal: 'Introduce our loaf',
      audience: 'Local families',
      platform: 'facebook',
      tone: 'friendly',
      language: 'English',
      title: 'Our fresh loaf',
      posts: Array.from({ length: 3 }, () => ({
        angle: 'Fresh bread',
        caption: 'Meet our loaf.',
        callToAction: 'Visit our shop.',
        hashtags: ['#Bakery'],
        imageIdea: 'Photograph a loaf.',
      })),
    })
  ).body.campaign.id;
  const path = `/campaign-posters/${campaignId}`;
  const png = await sharp({
    create: { width: 1080, height: 1080, channels: 4, background: '#245b46' },
  })
    .withMetadata()
    .png()
    .toBuffer();
  const poster = {
    headline: 'Fresh bread for your table',
    callToAction: 'Visit our shop',
    brandColor: '#245b46',
    image: `data:image/png;base64,${png.toString('base64')}`,
  };

  await t.test('anonymous, foreign and marker-free access is rejected', async () => {
    for (const [route, method, body] of [[path], [path + '/0'], [path + '/0', 'PUT', poster]]) {
      assert.equal((await request(route, method, body, '')).status, 401);
      assert.equal((await request(route, method, body, other)).status, 404);
    }
    assert.equal((await request(path + '/0', 'PUT', poster, owner, base, '')).status, 403);
    assert.deepEqual((await request(path)).body, { posters: [] });
  });
  await t.test(
    'save picks explicit fields and metadata contains no image bytes or owner',
    async () => {
      const result = await request(path + '/0', 'PUT', {
        ...poster,
        owner: 'a'.repeat(24),
        campaign: 'b'.repeat(24),
        postIndex: 2,
        createdAt: '1990-01-01',
        source: 'ai',
        $set: { headline: 'Injected' },
      });
      assert.equal(result.status, 200);
      assert.equal(result.body.poster.postIndex, 0);
      assert.equal(result.body.poster.source, 'product-photo');
      assert.equal(result.body.poster.headline, poster.headline);
      assert.equal(result.body.poster.owner, undefined);
      assert.equal(result.body.poster.data, undefined);
      assert.equal((await request(path)).body.posters.length, 1);
      assert.equal((await request('/campaigns')).body.campaigns[0].image, undefined);
    },
  );
  await t.test('download is a private PNG with metadata stripped', async () => {
    const result = await request(path + '/0');
    assert.equal(result.status, 200);
    assert.equal(result.headers.get('content-type'), 'image/png');
    assert.ok(result.headers.get('cache-control').includes('no-store'));
    assert.equal(result.headers.get('x-content-type-options'), 'nosniff');
    const metadata = await sharp(result.body).metadata();
    assert.equal(metadata.width, 1080);
    assert.equal(metadata.height, 1080);
    assert.equal(metadata.exif, undefined);
    assert.equal(metadata.icc, undefined);
    const download = await request(path + '/0?download=1');
    assert.equal(download.status, 200);
    assert.equal(
      download.headers.get('content-disposition'),
      'attachment; filename="localbiz-post-1.png"',
    );
  });
  await t.test(
    'bad fields, fake PNGs, dimensions, and oversized bodies preserve the saved poster',
    async () => {
      const tiny = await sharp({
        create: { width: 2, height: 2, channels: 3, background: '#ffffff' },
      })
        .png()
        .toBuffer();
      const patches = [
        null,
        { ...poster, headline: '' },
        { ...poster, headline: { $ne: '' } },
        { ...poster, callToAction: 'x'.repeat(81) },
        { ...poster, brandColor: 'red' },
        { ...poster, image: 'data:image/svg+xml;base64,PHN2Zy8+' },
        { ...poster, image: 'data:image/png;base64,not-a-png' },
        { ...poster, image: 'data:image/png;base64,' + Buffer.from('<svg/>').toString('base64') },
        { ...poster, image: 'data:image/png;base64,' + tiny.toString('base64') },
        { ...poster, image: 'data:image/png;base64,' + 'A'.repeat(8 * 1024 * 1024 + 4) },
      ];
      for (const body of patches)
        assert.equal((await request(path + '/0', 'PUT', body)).status, 400);
      assert.equal((await request(path + '/3', 'PUT', poster)).status, 400);
      assert.equal((await request('/campaign-posters/invalid')).status, 400);
      assert.equal((await request(path + '/2')).status, 404);
      assert.equal(
        (await request(path + '/0', 'PUT', { ...poster, extra: 'x'.repeat(10 * 1024 * 1024) }))
          .status,
        413,
      );
      assert.equal((await request(path)).body.posters[0].headline, poster.headline);
    },
  );
  await t.test(
    'replacement remains one image per post and survives reconnect and product deletion',
    async () => {
      assert.equal(
        (await request(path + '/0', 'PUT', { ...poster, headline: 'New headline' })).status,
        200,
      );
      assert.equal((await request(path + '/1', 'PUT', poster)).status, 200);
      assert.equal((await request(path + '/2', 'PUT', poster)).status, 200);
      assert.equal(await CampaignPoster.countDocuments({ campaign: campaignId }), 3);
      await mongoose.disconnect();
      await mongoose.connect(uri);
      await request(`/products/${productId}`, 'DELETE');
      assert.equal((await request(path)).body.posters[0].headline, 'New headline');
      assert.equal((await request(path + '/0')).status, 200);
    },
  );
  await t.test('poster saves have a per-account limit', async () => {
    const endpoint = await startApp();
    for (let index = 0; index < 30; index++)
      assert.equal(
        (await request(path + '/0', 'PUT', { ...poster, image: 'invalid' }, owner, endpoint))
          .status,
        400,
      );
    assert.equal((await request(path + '/0', 'PUT', poster, owner, endpoint)).status, 429);
  });
  await t.test('deleting the owned campaign also removes all of its posters', async () => {
    assert.equal(
      (await request(`/campaigns/${campaignId}`, 'DELETE', undefined, other)).status,
      404,
    );
    assert.equal(await CampaignPoster.countDocuments({ campaign: campaignId }), 3);
    assert.equal((await request(`/campaigns/${campaignId}`, 'DELETE')).status, 204);
    assert.equal(await CampaignPoster.countDocuments({ campaign: campaignId }), 0);
    assert.equal((await request(path + '/0')).status, 404);
  });
});
