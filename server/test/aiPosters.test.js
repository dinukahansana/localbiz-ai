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
process.env.DEAPI_DAILY_LIMIT = '20';
process.env.DEAPI_MAX_PRICE = '0.03';
const { createApp } = await import('../src/app.js');
const { default: PosterGeneration, ImageBudget } =
  await import('../src/models/PosterGeneration.js');
const { default: CampaignPoster } = await import('../src/models/CampaignPoster.js');
const { ImageGenerationError, resultUrl } = await import('../src/lib/deapi.js');

test('AI previews are private, resumable, charge once, save deliberately and obey persistent budgets', async (t) => {
  const mongo = await MongoMemoryServer.create({
    binary: {
      downloadDir: fileURLToPath(
        new URL('../../node_modules/.cache/mongodb-binaries', import.meta.url),
      ),
    },
  });
  t.after(() => mongo.stop());
  await mongoose.connect(mongo.getUri('localbiz_ai_poster_test'));
  t.after(() => mongoose.disconnect());
  await PosterGeneration.init();
  const png = await sharp({
    create: { width: 1024, height: 1024, channels: 3, background: '#245b46' },
  })
    .withMetadata()
    .png()
    .toBuffer();
  let submissions = 0;
  let checks = 0;
  let price = 0.015;
  let ambiguous = false;
  let badDownload = false;
  let submitted;
  const provider = {
    configured: true,
    quote: async () => price,
    start: async (input) => {
      submissions++;
      submitted = input;
      if (ambiguous) throw new ImageGenerationError(504, 'Do not expose raw key');
      return 'provider-job';
    },
    check: async () => {
      checks++;
      return { status: 'done', progress: 100, url: 'https://results.deapi.ai/product.png' };
    },
    download: async (url) => {
      resultUrl(badDownload ? 'https://unknown.example.test/product.png' : url);
      return png;
    },
  };
  async function start(imageProvider = provider) {
    const server = createApp({ imageProvider }).listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    return `http://127.0.0.1:${server.address().port}/api`;
  }
  const base = await start();
  let owner = '';
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
    return {
      status: response.status,
      headers: response.headers,
      body:
        response.status === 204
          ? null
          : (response.headers.get('content-type') || '').startsWith('image/')
            ? Buffer.from(await response.arrayBuffer())
            : await response.json(),
    };
  }
  async function register(email) {
    const response = await fetch(base + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-LocalBiz-Request': '1' },
      body: JSON.stringify({
        name: 'AI Poster Tester',
        email,
        password: 'disposable-ai-poster-password',
      }),
    });
    assert.equal(response.status, 201);
    return response.headers.get('set-cookie').split(';')[0];
  }
  owner = await register('ai-poster-owner@example.test');
  const other = await register('ai-poster-other@example.test');
  await request('/business-profile', 'PUT', { name: 'Bakery', category: 'Bakery' });
  const productId = (
    await request('/products', 'POST', {
      name: 'Cookie box',
      description: 'Six chocolate cookies',
      price: '1250.00',
      currency: 'LKR',
    })
  ).body.product.id;
  const campaignId = (
    await request('/campaigns', 'POST', {
      productId,
      goal: 'Introduce cookies',
      audience: 'Local families',
      platform: 'instagram',
      tone: 'friendly',
      language: 'English',
      title: 'Weekend cookies',
      posts: Array.from({ length: 3 }, () => ({
        angle: 'Made for sharing',
        caption: 'Enjoy our cookie box.',
        callToAction: 'Order today',
        hashtags: ['#Bakery'],
        imageIdea: 'Warm bakery scene.',
      })),
    })
  ).body.campaign.id;
  const path = `/poster-generations/${campaignId}/0`;
  const posterPath = `/campaign-posters/${campaignId}/0`;
  const body = {
    requestKey: randomUUID(),
    headline: 'Made for sharing',
    callToAction: 'Order today',
    brandColor: '#245b46',
    style: 'studio',
    prompt: 'A warm product scene with beautiful lighting',
    image: 'data:image/png;base64,' + png.toString('base64'),
  };
  let jobId;

  await t.test(
    'auth, ownership, write marker, image validation and missing keys block submissions',
    async () => {
      assert.equal((await request(path, 'POST', body, '')).status, 401);
      assert.equal((await request(path, 'POST', body, other)).status, 404);
      assert.equal((await request(path, 'POST', body, owner, base, '')).status, 403);
      assert.equal(
        (await request(path, 'POST', { ...body, image: 'https://private.test/image.png' })).status,
        400,
      );
      assert.equal(
        (
          await request(path, 'POST', {
            ...body,
            image: 'data:image/png;base64,' + Buffer.from('<svg/>').toString('base64'),
          })
        ).status,
        400,
      );
      const unconfigured = await start({ configured: false });
      assert.equal((await request(path, 'POST', body, owner, unconfigured)).status, 503);
      assert.equal(submissions, 0);
    },
  );
  await t.test('price ceiling blocks paid submissions', async () => {
    price = 0.0322704;
    const result = await request(path, 'POST', body);
    assert.equal(result.status, 409);
    assert.equal(result.body.code, 'IMAGE_PRICE_LIMIT_EXCEEDED');
    assert.equal(result.body.quotedPrice, price);
    assert.equal(result.body.maxPrice, 0.03);
    assert.match(result.body.error, /0\.0322704 credits/);
    assert.match(result.body.error, /0\.03 credit limit/);
    assert.equal(submissions, 0);
    assert.equal(await PosterGeneration.countDocuments(), 0);
    price = 0.015;
  });
  await t.test('unavailable prices have a distinct error and cannot start generation', async () => {
    price = NaN;
    const result = await request(path, 'POST', body);
    assert.equal(result.status, 503);
    assert.equal(result.body.code, 'IMAGE_PRICE_UNAVAILABLE');
    assert.match(result.body.error, /exact deAPI price is unavailable/);
    assert.equal(submissions, 0);
    assert.equal(await PosterGeneration.countDocuments(), 0);
    price = 0.015;
  });
  await t.test(
    'double-clicks share an ID; other active jobs are blocked; prompt includes facts',
    async () => {
      const results = await Promise.all([request(path, 'POST', body), request(path, 'POST', body)]);
      assert.ok(results.every((result) => [200, 202].includes(result.status)));
      jobId = results[0].body.generation.id;
      assert.equal(results[0].body.generation.settings.prompt, body.prompt);
      assert.equal(results[0].body.generation.settings.style, body.style);
      assert.equal(results[1].body.generation.id, jobId);
      assert.equal(submissions, 1);
      assert.equal((await request(path, 'POST', body)).body.generation.id, jobId);
      assert.equal(
        (
          await request(`/poster-generations/${campaignId}/1`, 'POST', {
            ...body,
            requestKey: randomUUID(),
          })
        ).status,
        409,
      );
      assert.match(submitted.prompt, /Six chocolate cookies/);
      assert.match(submitted.prompt, /Enjoy our cookie box/);
      assert.equal((await sharp(submitted.image).metadata()).width, 1024);
      assert.equal(await CampaignPoster.countDocuments(), 0);
      assert.equal(results[0].body.generation.providerId, undefined);
      assert.equal(results[0].body.generation.data, undefined);
    },
  );
  await t.test(
    'new app instance resumes a job without resubmitting; download failure is recoverable',
    async () => {
      const restarted = await start();
      assert.equal(
        (await request(path, 'GET', undefined, owner, restarted)).body.generation.id,
        jobId,
      );
      badDownload = true;
      const failed = await request(`${path}/${jobId}`, 'GET', undefined, owner, restarted);
      assert.equal(failed.status, 502);
      assert.match(failed.body.error, /image host was not recognized/);
      assert.equal((await PosterGeneration.findById(jobId)).status, 'pending');
      await PosterGeneration.updateOne({ _id: jobId }, { $set: { checkedAt: new Date(0) } });
      badDownload = false;
      const done = await request(`${path}/${jobId}`, 'GET', undefined, owner, restarted);
      assert.equal(done.body.generation.status, 'done');
      assert.equal(submissions, 1);
      assert.equal(await CampaignPoster.countDocuments(), 0);
      const completedChecks = checks;
      await request(`${path}/${jobId}`);
      assert.equal(checks, completedChecks);
      const image = await request(`${path}/${jobId}/image`);
      assert.equal(image.status, 200);
      assert.match(image.headers.get('cache-control'), /no-store/);
      const metadata = await sharp(image.body).metadata();
      assert.equal(metadata.width, 1080);
      assert.equal(metadata.height, 1080);
      assert.equal(metadata.exif, undefined);
      assert.equal((await request(`${path}/${jobId}/image`, 'GET', undefined, other)).status, 404);
      assert.equal((await request(`${path}/${jobId}/image`, 'GET', undefined, '')).status, 401);
    },
  );
  await t.test(
    'saving uses server-owned bytes and provenance, with no cross-post or cross-account ID access',
    async () => {
      assert.equal((await request(posterPath, 'PUT', { generationId: jobId }, other)).status, 404);
      assert.equal(
        (await request(`/campaign-posters/${campaignId}/1`, 'PUT', { generationId: jobId })).status,
        404,
      );
      const saved = await request(posterPath, 'PUT', {
        generationId: jobId,
        owner: 'a'.repeat(24),
        headline: 'Injected',
        source: 'fake',
        image: 'fake',
      });
      assert.equal(saved.status, 200);
      assert.equal(saved.body.poster.source, 'deapi');
      assert.equal(saved.body.poster.generationId, jobId);
      assert.equal(saved.body.poster.headline, body.headline);
      assert.equal((await request(posterPath)).status, 200);
      await PosterGeneration.updateOne({ _id: jobId }, { $set: { expiresAt: new Date(0) } });
      assert.equal((await request(posterPath, 'PUT', { generationId: jobId })).status, 404);
      assert.equal((await request(posterPath)).status, 200);
    },
  );
  await t.test('ambiguous provider submission is not retried automatically', async () => {
    ambiguous = true;
    const input = { ...body, requestKey: randomUUID(), image: '' };
    const result = await request(path, 'POST', input);
    assert.equal(result.status, 202);
    assert.equal(result.body.generation.status, 'unknown');
    assert.match(result.body.generation.message, /may have used credits/);
    const count = submissions;
    await request(path, 'POST', input);
    await request(`${path}/${result.body.generation.id}`);
    assert.equal(submissions, count);
    ambiguous = false;
  });
  await t.test('persistent per-account hourly budget blocks paid generation', async () => {
    const job = await PosterGeneration.findOne({ campaign: campaignId });
    const hour = new Date().toISOString().slice(0, 13);
    const key = `user:${job.owner}:${hour}`;
    await ImageBudget.updateOne({ _id: key }, { $set: { used: 5 } });
    const count = submissions;
    assert.equal((await request(path, 'POST', { ...body, requestKey: randomUUID() })).status, 429);
    assert.equal(submissions, count);
    await ImageBudget.updateOne({ _id: key }, { $set: { used: 0 } });
  });
  await t.test(
    'persistent app budget blocks generation and survives campaign deletion',
    async () => {
      const day = new Date().toISOString().slice(0, 10);
      await ImageBudget.updateOne({ _id: `app:${day}` }, { $set: { used: 20 } });
      const count = submissions;
      assert.equal(
        (await request(path, 'POST', { ...body, requestKey: randomUUID() })).status,
        429,
      );
      assert.equal(submissions, count);
      assert.equal((await request(`/campaigns/${campaignId}`, 'DELETE')).status, 204);
      assert.equal(await PosterGeneration.countDocuments({ campaign: campaignId }), 0);
      assert.equal(await CampaignPoster.countDocuments({ campaign: campaignId }), 0);
      assert.equal((await ImageBudget.findById(`app:${day}`)).used, 20);
    },
  );
});
