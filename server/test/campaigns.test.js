import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server-core';

// Override before importing config. No tests read Atlas or call Gemini with a real key.
process.env.MONGODB_URI = 'mongodb://127.0.0.1/test-placeholder';
process.env.GEMINI_API_KEY = 'disposable-test-key';
const { createApp } = await import('../src/app.js');
const { generateCampaign, GenerationError } = await import('../src/lib/gemini.js');
const { env } = await import('../src/config/env.js');
const { validateContent } = await import('../src/validation/campaigns.js');

const draft = {
  title: 'A local loaf for your table',
  posts: Array.from({ length: 3 }, (_, index) => ({
    angle: `Fresh bread idea ${index + 1}`,
    caption: 'Meet our wholegrain bread, baked for your neighborhood.',
    callToAction: 'Visit our shop to learn more.',
    hashtags: ['#LocalBakery', '#Bread'],
    imageIdea: 'Photograph a loaf on your shop counter in natural light.',
  })),
};
const brief = {
  goal: 'Introduce our wholegrain bread',
  audience: 'Local families',
  platform: 'facebook',
  tone: 'friendly',
  language: 'English',
};

test('Gemini request contract, output validation, and safe errors', async (t) => {
  const context = {
    brief,
    profile: { name: 'Bakery', category: 'Food', location: 'Colombo', story: 'A local bakery.' },
    product: {
      name: 'Wholegrain loaf',
      priceMinor: 12550,
      currency: 'LKR',
      category: 'Bread',
      description: 'Fresh bread.',
    },
  };
  const payload = (content = draft, finishReason = 'STOP') => ({
    candidates: [
      {
        finishReason,
        content: {
          parts: [
            { thought: true, text: 'do not include thoughts' },
            { text: JSON.stringify(content) },
          ],
        },
      },
    ],
  });
  await t.test('key stays in headers; explicit public context and structured output', async () => {
    const result = await generateCampaign(context, async (url, options) => {
      assert.ok(url.startsWith('https://generativelanguage.googleapis.com/v1beta/models/'));
      assert.ok(!url.includes(env.geminiKey));
      assert.equal(options.headers['x-goog-api-key'], 'disposable-test-key');
      const body = JSON.parse(options.body);
      const input = JSON.parse(body.contents[0].parts[0].text);
      assert.equal(input.product.price, '125.50');
      assert.equal(input.business.name, 'Bakery');
      assert.equal(input.product._id, undefined);
      assert.equal(input.business.owner, undefined);
      assert.equal(body.generationConfig.responseJsonSchema.properties.posts.minItems, 3);
      assert.equal(body.generationConfig.responseMimeType, 'application/json');
      assert.ok(options.signal);
      return Response.json(payload());
    });
    assert.deepEqual(result, draft);
  });
  await t.test('missing key, quota, access, network and timeout errors are safe', async () => {
    const key = env.geminiKey;
    env.geminiKey = '';
    await assert.rejects(generateCampaign(context), { code: 'AI_NOT_CONFIGURED', status: 503 });
    env.geminiKey = key;
    for (const [status, code, expectedStatus] of [
      [429, 'AI_QUOTA_EXCEEDED', 429],
      [400, 'AI_CONFIGURATION_ERROR', 503],
      [403, 'AI_CONFIGURATION_ERROR', 503],
      [404, 'AI_CONFIGURATION_ERROR', 503],
      [500, 'AI_UNAVAILABLE', 503],
    ]) {
      await assert.rejects(
        generateCampaign(context, async () =>
          Response.json({ error: { message: 'secret-key-provider-details' } }, { status }),
        ),
        (error) =>
          error.code === code &&
          error.status === expectedStatus &&
          !error.message.includes('secret-key'),
      );
    }
    await assert.rejects(
      generateCampaign(context, async () => {
        throw new TypeError('secret network URL');
      }),
      { code: 'AI_UNAVAILABLE' },
    );
    await assert.rejects(
      generateCampaign(context, async () => {
        throw new DOMException('timeout', 'TimeoutError');
      }),
      { code: 'AI_TIMEOUT', status: 504 },
    );
  });
  await t.test('blocked, truncated and malformed model responses are rejected', async () => {
    for (const result of [
      payload(draft, 'MAX_TOKENS'),
      payload({ ...draft, posts: [] }),
      payload({ ...draft, title: 'x'.repeat(101) }),
      {
        candidates: [
          { finishReason: 'STOP', content: { parts: [{ text: '<script>bad JSON</script>' }] } },
        ],
      },
    ]) {
      await assert.rejects(
        generateCampaign(context, async () => Response.json(result)),
        { code: 'AI_INVALID_RESPONSE', status: 502 },
      );
    }
    await assert.rejects(
      generateCampaign(context, async () =>
        Response.json({ promptFeedback: { blockReason: 'SAFETY' } }),
      ),
      { code: 'AI_BLOCKED', status: 422 },
    );
    assert.equal(
      Object.keys(
        validateContent({
          ...draft,
          posts: draft.posts.map((post) => ({ ...post, hashtags: ['#සිංහල', '#தமிழ்'] })),
        }).errors,
      ).length,
      0,
    );
  });
});

test('private campaign generation, persistence and account isolation', async (t) => {
  const mongo = await MongoMemoryServer.create({
    binary: {
      downloadDir: fileURLToPath(
        new URL('../../node_modules/.cache/mongodb-binaries', import.meta.url),
      ),
    },
  });
  t.after(() => mongo.stop());
  const uri = mongo.getUri('localbiz_campaign_test');
  await mongoose.connect(uri);
  t.after(() => mongoose.disconnect());
  let generationCalls = 0;
  let generate = async (context) => {
    generationCalls++;
    assert.equal(context.product.name, 'Wholegrain loaf');
    assert.equal(context.profile.name, 'Neighborhood Bakery');
    return draft;
  };
  async function startApp(instance) {
    const server = instance.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    return `http://127.0.0.1:${server.address().port}/api`;
  }
  const base = await startApp(createApp({ generateCampaign: (context) => generate(context) }));
  async function request(
    path,
    method = 'GET',
    body,
    cookie = ownerCookie,
    endpoint = base,
    marker = '1',
  ) {
    const response = await fetch(`${endpoint}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-LocalBiz-Request': marker, Cookie: cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: response.status,
      body: response.status === 204 ? null : await response.json(),
    };
  }
  async function register(email) {
    const response = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-LocalBiz-Request': '1' },
      body: JSON.stringify({
        name: 'Campaign Tester',
        email,
        password: 'campaign-test-password-123',
      }),
    });
    assert.equal(response.status, 201);
    return response.headers.get('set-cookie').split(';')[0];
  }
  const ownerCookie = await register('campaign-owner@example.test');
  const otherCookie = await register('campaign-other@example.test');
  let productId;
  let campaignId;
  const requestBrief = () => ({ ...brief, productId });
  await t.test('anonymous and marker-free writes are rejected', async () => {
    for (const [path, method, body] of [
      ['/campaigns'],
      ['/campaigns/config'],
      ['/campaigns/generate', 'POST', brief],
      ['/campaigns', 'POST', draft],
      [`/campaigns/${'a'.repeat(24)}`, 'PUT', draft],
      [`/campaigns/${'a'.repeat(24)}`, 'DELETE'],
    ])
      assert.equal((await request(path, method, body, '')).status, 401);
    assert.equal((await request('/campaigns', 'POST', draft, ownerCookie, base, '')).status, 403);
    assert.deepEqual((await request('/campaigns')).body, { campaigns: [], total: 0 });
    assert.deepEqual((await request('/campaigns/config')).body, { configured: true });
  });
  await t.test(
    'invalid briefs, foreign products and missing profiles never call Gemini',
    async () => {
      assert.equal((await request('/campaigns/generate', 'POST', brief)).status, 400);
      productId = (
        await request('/products', 'POST', {
          name: 'Wholegrain loaf',
          price: '125.50',
          currency: 'LKR',
        })
      ).body.product.id;
      assert.equal(
        (await request('/campaigns/generate', 'POST', requestBrief())).body.code,
        'PROFILE_REQUIRED',
      );
      assert.equal(
        (await request('/campaigns/generate', 'POST', requestBrief(), otherCookie)).status,
        404,
      );
      for (const patch of [
        { goal: { $ne: '' } },
        { audience: '' },
        { tone: 'fake' },
        { platform: 'tiktok' },
        { language: 'fake' },
        { goal: 'x'.repeat(601) },
      ])
        assert.equal(
          (await request('/campaigns/generate', 'POST', { ...requestBrief(), ...patch })).status,
          400,
        );
      assert.equal(generationCalls, 0);
      await request('/business-profile', 'PUT', {
        name: 'Neighborhood Bakery',
        category: 'Bakery',
      });
    },
  );
  await t.test('generate returns a draft without automatically saving it', async () => {
    const result = await request('/campaigns/generate', 'POST', requestBrief());
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.draft, draft);
    assert.deepEqual(result.body.brief, requestBrief());
    assert.equal((await request('/campaigns')).body.total, 0);
  });
  await t.test(
    'save ignores injected ownership, IDs, status, timestamps and snapshots',
    async () => {
      const result = await request('/campaigns', 'POST', {
        ...requestBrief(),
        ...draft,
        owner: 'a'.repeat(24),
        status: 'published',
        productName: 'Injected',
        _id: 'b'.repeat(24),
        createdAt: '1990-01-01',
        $set: { title: 'Injected' },
      });
      assert.equal(result.status, 201);
      campaignId = result.body.campaign.id;
      assert.notEqual(campaignId, 'b'.repeat(24));
      assert.equal(result.body.campaign.title, draft.title);
      assert.equal(result.body.campaign.productName, 'Wholegrain loaf');
      assert.equal(result.body.campaign.status, 'draft');
      assert.equal(result.body.campaign.owner, undefined);
      assert.equal((await request('/campaigns')).body.total, 1);
      assert.deepEqual(
        (await request(`/campaigns/${campaignId}`)).body.campaign,
        result.body.campaign,
      );
    },
  );
  await t.test('foreign reads, writes, deletes and product use return 404', async () => {
    assert.equal((await request('/campaigns', 'GET', undefined, otherCookie)).body.total, 0);
    for (const method of ['GET', 'PUT', 'DELETE'])
      assert.equal(
        (
          await request(
            `/campaigns/${campaignId}`,
            method,
            method === 'PUT' ? draft : undefined,
            otherCookie,
          )
        ).status,
        404,
      );
    assert.equal(
      (await request('/campaigns', 'POST', { ...requestBrief(), ...draft }, otherCookie)).status,
      404,
    );
  });
  await t.test(
    'invalid edits preserve drafts; changes survive reconnect and product deletion',
    async () => {
      for (const patch of [
        { posts: [] },
        { title: '' },
        { posts: draft.posts.map((post) => ({ ...post, hashtags: ['#bad tag'] })) },
        { posts: draft.posts.map((post) => ({ ...post, caption: 'x'.repeat(2201) })) },
      ])
        assert.equal(
          (await request(`/campaigns/${campaignId}`, 'PUT', { ...draft, ...patch })).status,
          400,
        );
      assert.equal((await request('/campaigns/not-an-id')).status, 400);
      const saved = await request(`/campaigns/${campaignId}`, 'PUT', {
        ...draft,
        title: 'Edited title',
        platform: 'instagram',
        productId: 'c'.repeat(24),
        owner: 'd'.repeat(24),
      });
      assert.equal(saved.status, 200);
      assert.equal(saved.body.campaign.platform, 'facebook');
      await mongoose.disconnect();
      await mongoose.connect(uri);
      assert.equal((await request(`/campaigns/${campaignId}`)).body.campaign.title, 'Edited title');
      await request(`/products/${productId}`, 'DELETE');
      assert.equal(
        (await request(`/campaigns/${campaignId}`)).body.campaign.productName,
        'Wholegrain loaf',
      );
      assert.equal((await request(`/campaigns/${campaignId}`, 'PUT', draft)).status, 200);
    },
  );
  await t.test('provider errors, concurrent calls and rate limits are handled', async () => {
    productId = (
      await request('/products', 'POST', {
        name: 'Wholegrain loaf',
        price: '125.50',
        currency: 'LKR',
      })
    ).body.product.id;
    generate = async () => {
      throw new GenerationError(429, 'AI_QUOTA_EXCEEDED', 'Test quota reached.');
    };
    assert.equal(
      (await request('/campaigns/generate', 'POST', requestBrief())).body.code,
      'AI_QUOTA_EXCEEDED',
    );
    let release;
    let started;
    const start = new Promise((resolve) => {
      started = resolve;
    });
    generate = () =>
      new Promise((resolve) => {
        release = () => resolve(draft);
        started();
      });
    const pending = request('/campaigns/generate', 'POST', requestBrief());
    await start;
    assert.equal(
      (await request('/campaigns/generate', 'POST', requestBrief())).body.code,
      'GENERATION_IN_PROGRESS',
    );
    release();
    assert.equal((await pending).status, 200);
    const limitedBase = await startApp(createApp({ generateCampaign: async () => draft }));
    for (let index = 0; index < 5; index++)
      assert.equal(
        (await request('/campaigns/generate', 'POST', requestBrief(), ownerCookie, limitedBase))
          .status,
        200,
      );
    const limited = await request(
      '/campaigns/generate',
      'POST',
      requestBrief(),
      ownerCookie,
      limitedBase,
    );
    assert.equal(limited.status, 429);
    assert.equal(limited.body.code, 'GENERATION_RATE_LIMITED');
  });
  await t.test('delete and database-unavailable routes need no AI calls', async () => {
    assert.equal((await request(`/campaigns/${campaignId}`, 'DELETE')).status, 204);
    assert.equal((await request(`/campaigns/${campaignId}`)).status, 404);
    assert.equal((await request('/campaigns')).body.total, 0);
    await mongoose.disconnect();
    for (const [path, method, body] of [
      ['/campaigns'],
      ['/campaigns/config'],
      ['/campaigns/generate', 'POST', requestBrief()],
      ['/campaigns', 'POST', { ...requestBrief(), ...draft }],
      [`/campaigns/${campaignId}`, 'PUT', draft],
      [`/campaigns/${campaignId}`, 'DELETE'],
    ])
      assert.equal((await request(path, method, body)).status, 503);
    assert.equal((await request('/health')).status, 200);
  });
});
