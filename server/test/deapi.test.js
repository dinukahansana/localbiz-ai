import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';

process.env.MONGODB_URI = 'mongodb://127.0.0.1/disposable-placeholder';
process.env.DEAPI_API_KEY = '';
const { createDeapiProvider, resultUrl, ImageGenerationError, editModel, textModel } =
  await import('../src/lib/deapi.js');
const { validateAiPoster, buildPosterPrompt, prepareReference, normalizeGeneratedPoster } =
  await import('../src/lib/aiPosters.js');
const { readEnv } = await import('../src/config/readEnv.js');
const json = (data, status = 200) =>
  new Response(JSON.stringify({ data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

test('deAPI edit uploads a private reference, and text generation uses the correct native model', async () => {
  const calls = [];
  const provider = createDeapiProvider({
    key: 'disposable-test-key',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return url.endsWith('/price')
        ? json({ price: 0.015, is_estimated: false })
        : json({ request_id: 'test-job-1' });
    },
  });
  const input = { prompt: 'Design a product scene', image: Buffer.from('fixture') };
  assert.equal(await provider.quote(input), 0.015);
  assert.equal(await provider.start(input), 'test-job-1');
  assert.ok(calls[0].url.endsWith('/images/edits/price'));
  assert.equal(JSON.parse(calls[0].options.body).model, editModel);
  const form = calls[1].options.body;
  assert.ok(form instanceof FormData);
  assert.equal(form.get('model'), editModel);
  assert.equal(form.get('steps'), '20');
  assert.equal(form.get('image').type, 'image/png');
  assert.equal(calls[1].options.headers['Content-Type'], undefined);
  await provider.start({ prompt: 'A concept poster' });
  assert.ok(calls[2].url.endsWith('/images/generations'));
  assert.deepEqual(JSON.parse(calls[2].options.body), {
    model: textModel,
    prompt: 'A concept poster',
    width: 1024,
    height: 1024,
    steps: 4,
    guidance: 1,
    seed: -1,
  });
});

test('missing keys, estimated prices and provider failures never expose credentials or raw messages', async () => {
  await assert.rejects(createDeapiProvider({ key: '' }).quote({}), { status: 503 });
  for (const data of [
    { price: 0, is_estimated: false },
    { price: 0.02, is_estimated: true },
    { price: 0.02 },
    { price: '0.02', is_estimated: false },
  ]) {
    const provider = createDeapiProvider({ key: 'test-key', fetchImpl: async () => json(data) });
    await assert.rejects(provider.quote({ prompt: 'test' }), ImageGenerationError);
  }
  for (const status of [401, 402, 403, 422, 429, 500]) {
    const provider = createDeapiProvider({
      key: 'private-test-key',
      fetchImpl: async () => new Response('raw private provider error', { status }),
    });
    await assert.rejects(provider.start({ prompt: 'test' }), (error) => {
      assert.ok(!error.message.includes('private'));
      return error instanceof ImageGenerationError;
    });
  }
});

test('job states, refunds, malformed IDs and unsafe result URLs are handled safely', async () => {
  const provider = createDeapiProvider({
    key: 'test-key',
    fetchImpl: async () =>
      json({ status: 'error', refunded: true, error_reason: 'untrusted raw text' }),
  });
  const result = await provider.check('job-1');
  assert.equal(result.status, 'error');
  assert.match(result.message, /refunded/);
  assert.ok(!result.message.includes('untrusted'));
  await assert.rejects(provider.check('../other'), ImageGenerationError);
  for (const url of [
    'http://assets.deapi.ai/a.png',
    'https://127.0.0.1/a.png',
    'https://assets.deapi.ai.evil.test/a.png',
    'https://user:pass@assets.deapi.ai/a.png',
    'https://assets.deapi.ai:8443/a.png',
    'http://results.deapi.ai/a.png',
    'https://results.deapi.ai.evil.test/a.png',
    'https://evil-results.deapi.ai/a.png',
    'https://results.deapi.ai./a.png',
    'https://user:pass@results.deapi.ai/a.png',
    'https://results.deapi.ai:8443/a.png',
    'https://unrecognized.deapi.ai/a.png',
    'file:///private',
  ])
    assert.throws(() => resultUrl(url), ImageGenerationError);
  assert.equal(resultUrl('https://assets.deapi.ai/result.png').hostname, 'assets.deapi.ai');
  assert.equal(resultUrl('https://results.deapi.ai/result.png').hostname, 'results.deapi.ai');
});

test('a completed native job downloads from results.deapi.ai without starting a new generation', async () => {
  const imageUrl = 'https://results.deapi.ai/generated-image.png?signature=test-only';
  const calls = [];
  const provider = createDeapiProvider({
    key: 'disposable-test-key',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return url.endsWith('/jobs/existing-job')
        ? json({ status: 'done', progress: 100, result_url: imageUrl })
        : new Response(Buffer.from('image-fixture'), {
            headers: { 'Content-Type': 'image/png' },
          });
    },
  });
  const completed = await provider.check('existing-job');
  assert.equal(completed.status, 'done');
  assert.equal((await provider.download(completed.url)).toString(), 'image-fixture');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://api.deapi.ai/api/v2/jobs/existing-job');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer disposable-test-key');
  assert.equal(calls[1].url, imageUrl);
  assert.equal(calls[1].options.headers, undefined);
  assert.equal(calls[1].options.redirect, 'error');
});

test('asset downloads omit keys, block redirects and reject oversized or non-image responses', async () => {
  let options;
  const provider = createDeapiProvider({
    key: 'test-key',
    fetchImpl: async (_, init) => {
      options = init;
      return new Response(Buffer.from('fixture'), { headers: { 'Content-Type': 'image/png' } });
    },
  });
  assert.equal((await provider.download('https://assets.deapi.ai/a.png')).toString(), 'fixture');
  assert.equal(options.headers, undefined);
  assert.equal(options.redirect, 'error');
  for (const headers of [
    { 'Content-Type': 'text/html' },
    { 'Content-Type': 'image/png', 'Content-Length': 13000000 },
  ]) {
    const invalid = createDeapiProvider({
      key: 'test-key',
      fetchImpl: async () => new Response('invalid', { headers }),
    });
    await assert.rejects(invalid.download('https://assets.deapi.ai/a.png'), ImageGenerationError);
  }
});

test('poster prompts include owned facts and chosen style, and PNG normalization strips metadata', async () => {
  const data = {
    headline: 'Fresh cookies',
    callToAction: 'Order today',
    prompt: 'Warm dramatic bakery scene',
    style: 'lifestyle',
    brandColor: '#245b46',
    requestKey: 'a'.repeat(36),
  };
  assert.deepEqual(validateAiPoster(data).errors, {});
  for (const patch of [
    { prompt: '' },
    { style: '__proto__' },
    { headline: {} },
    { image: 'https://example.com/image.png' },
  ])
    assert.ok(Object.keys(validateAiPoster({ ...data, ...patch }).errors).length);
  const prompt = buildPosterPrompt({
    campaign: {
      posts: [{ angle: 'Weekend cookies', caption: 'Made for sharing' }],
      productName: 'Cookie box',
      businessName: 'Bakery',
      audience: 'Families',
      platform: 'instagram',
    },
    product: { description: 'Six chocolate cookies', category: 'Bakery' },
    postIndex: 0,
    data,
    reference: true,
  });
  assert.match(prompt, /Six chocolate cookies/);
  assert.match(prompt, /Made for sharing/);
  assert.match(prompt, /actual product/);
  assert.ok(prompt.startsWith('Use the uploaded reference image as the source of truth'));
  assert.match(prompt, /Do not recolor, redesign or replace/);
  assert.match(prompt, /customer creative brief controls the scene/);
  const imaginedPrompt = buildPosterPrompt({
    campaign: {
      posts: [{ angle: 'Shop owner outside the shop', caption: 'Made for sharing' }],
      productName: 'Cookie box',
    },
    product: { description: 'Six chocolate cookies' },
    postIndex: 0,
    data: { ...data, prompt: 'Show the uploaded cookie box on a bakery counter' },
    reference: false,
  });
  assert.ok(imaginedPrompt.startsWith('There is no reference photo'));
  assert.ok(!imaginedPrompt.startsWith('Use the uploaded reference image'));
  const original = await sharp({
    create: { width: 1600, height: 800, channels: 3, background: '#245b46' },
  })
    .withMetadata()
    .jpeg()
    .toBuffer();
  const reference = await prepareReference(original);
  const info = await sharp(reference).metadata();
  assert.equal(info.width, 1024);
  assert.equal(info.height, 1024);
  assert.equal(info.exif, undefined);
  const poster = await normalizeGeneratedPoster(original);
  assert.equal((await sharp(poster).metadata()).width, 1080);
  assert.equal((await sharp(poster).metadata()).exif, undefined);
  await assert.rejects(prepareReference(Buffer.from('<svg/>')));
  await assert.rejects(normalizeGeneratedPoster(Buffer.from('bad image')));
});

test('image credit limits validate at startup and keys stay server-side', () => {
  assert.equal(readEnv({}).deapiMaxPrice, 0.05);
  assert.equal(readEnv({ DEAPI_MAX_PRICE: '0.03' }).deapiMaxPrice, 0.03);
  assert.equal(readEnv({}).deapiDailyLimit, 20);
  assert.equal(readEnv({ DEAPI_API_KEY: ' test-key ' }).deapiKey, 'test-key');
  for (const value of ['0', '-1', 'NaN', '1.1'])
    assert.throws(() => readEnv({ DEAPI_MAX_PRICE: value }));
  for (const value of ['0', '1.5', '101', 'NaN'])
    assert.throws(() => readEnv({ DEAPI_DAILY_LIMIT: value }));
});
