import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import {
  postingInput,
  postingDateKey,
  scheduledInstant,
} from '../../client/src/lib/scheduleDates.js';
import { validateScheduleDate } from '../src/validation/schedules.js';

process.env.MONGODB_URI = 'mongodb://127.0.0.1/disposable-placeholder';
process.env.GEMINI_API_KEY = '';
const { createApp } = await import('../src/app.js');
const { default: PostSchedule } = await import('../src/models/PostSchedule.js');

test('posting-time conversion preserves Sri Lanka dates across UTC boundaries', () => {
  assert.equal(scheduledInstant('2026-10-03T00:15'), '2026-10-02T18:45:00.000Z');
  assert.equal(postingInput('2026-10-02T18:45:00.000Z'), '2026-10-03T00:15');
  assert.equal(postingDateKey('2026-09-30T20:00:00.000Z'), '2026-10-01');
  assert.equal(postingInput('2026-12-31T19:00:00.000Z'), '2027-01-01T00:30');
  const now = new Date('2026-10-02T00:00:00.000Z');
  for (const value of [
    '2027-02-29T03:00:00.000Z',
    '2026-13-01T00:00:00.000Z',
    '2026-10-02T00:00:00.000Z',
    '2029-01-01T00:00:00.000Z',
    '2026-10-03T09:00:00+05:30',
    123,
  ])
    assert.ok(validateScheduleDate({ scheduledFor: value }, now).errors.scheduledFor);
  assert.deepEqual(
    validateScheduleDate({ scheduledFor: '2028-02-29T03:00:00.000Z' }, now).errors,
    {},
  );
});

test('private posting plans, uniqueness, manual status and cleanup', async (t) => {
  const mongo = await MongoMemoryServer.create({
    binary: {
      downloadDir: fileURLToPath(
        new URL('../../node_modules/.cache/mongodb-binaries', import.meta.url),
      ),
    },
  });
  const uri = mongo.getUri('localbiz_schedule_test');
  await mongoose.connect(uri);
  await PostSchedule.init();
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongo.stop();
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function request(path, method = 'GET', body, cookie = owner, marker = '1') {
    const response = await fetch(base + path, {
      method,
      headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-LocalBiz-Request': marker },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: response.status,
      body: response.status === 204 ? null : await response.json(),
    };
  }
  async function register(email) {
    const response = await fetch(base + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-LocalBiz-Request': '1' },
      body: JSON.stringify({
        name: 'Calendar Tester',
        email,
        password: 'calendar-test-password-123',
      }),
    });
    assert.equal(response.status, 201);
    return response.headers.get('set-cookie').split(';')[0];
  }
  const owner = await register('calendar-owner@example.test');
  const other = await register('calendar-other@example.test');
  await request('/business-profile', 'PUT', { name: 'Neighborhood Bakery', category: 'Bakery' });
  const productId = (
    await request('/products', 'POST', {
      name: 'Wholegrain loaf',
      price: '125.50',
      currency: 'LKR',
    })
  ).body.product.id;
  const content = {
    title: 'Fresh bread',
    posts: Array.from({ length: 3 }, (_, index) => ({
      angle: `Bread idea ${index + 1}`,
      caption: 'Meet our loaf.',
      callToAction: 'Visit our shop.',
      hashtags: ['#Bakery'],
      imageIdea: 'Photograph a loaf.',
    })),
  };
  const campaignId = (
    await request('/campaigns', 'POST', {
      ...content,
      productId,
      goal: 'Introduce our loaf',
      audience: 'Local families',
      platform: 'facebook',
      tone: 'friendly',
      language: 'English',
    })
  ).body.campaign.id;
  const future = (days = 1) =>
    new Date(Math.ceil(Date.now() / 60000) * 60000 + days * 86400000).toISOString();
  const plan = (postIndex = 0) => ({ campaignId, postIndex, scheduledFor: future() });
  let id;

  await t.test('anonymous and marker-free writes are rejected; fresh data is empty', async () => {
    for (const [path, method, body] of [
      ['/schedules'],
      ['/schedules', 'POST', plan()],
      ['/schedules/' + 'a'.repeat(24), 'PUT', plan()],
      ['/schedules/' + 'a'.repeat(24) + '/status', 'PATCH', { status: 'published' }],
    ])
      assert.equal((await request(path, method, body, '')).status, 401);
    assert.equal((await request('/schedules', 'POST', plan(), owner, '')).status, 403);
    assert.deepEqual((await request('/schedules')).body, {
      schedules: [],
      total: 0,
      scheduledTotal: 0,
    });
  });
  await t.test(
    'invalid dates, indexes, campaigns and foreign products do not create plans',
    async () => {
      for (const patch of [
        { scheduledFor: '' },
        { scheduledFor: new Date(Date.now() - 1000).toISOString() },
        { scheduledFor: future(1000) },
        { scheduledFor: { $gt: '' } },
        { postIndex: -1 },
        { postIndex: 3 },
        { postIndex: '0' },
        { campaignId: 'invalid' },
      ])
        assert.equal((await request('/schedules', 'POST', { ...plan(), ...patch })).status, 400);
      assert.equal((await request('/schedules', 'POST', plan(), other)).status, 404);
      assert.equal(
        (await request('/schedules', 'POST', { ...plan(), campaignId: 'a'.repeat(24) })).status,
        404,
      );
      assert.equal((await request('/schedules')).body.total, 0);
    },
  );
  await t.test('create ignores injected owner, IDs, status and publication time', async () => {
    const result = await request('/schedules', 'POST', {
      ...plan(),
      owner: 'a'.repeat(24),
      _id: 'b'.repeat(24),
      status: 'published',
      publishedAt: '1990-01-01',
      caption: 'Injected',
    });
    assert.equal(result.status, 201);
    id = result.body.schedule.id;
    assert.notEqual(id, 'b'.repeat(24));
    assert.equal(result.body.schedule.owner, undefined);
    assert.equal(result.body.schedule.status, 'scheduled');
    assert.equal(result.body.schedule.publishedAt, null);
    assert.equal(result.body.schedule.caption, 'Meet our loaf.');
    assert.equal((await request('/schedules')).body.scheduledTotal, 1);
  });
  await t.test(
    'foreign reads/writes and simultaneous duplicate creates stay isolated',
    async () => {
      assert.equal((await request('/schedules', 'GET', undefined, other)).body.total, 0);
      assert.equal((await request(`/schedules/${id}`, 'PUT', plan(), other)).status, 404);
      assert.equal(
        (await request(`/schedules/${id}/status`, 'PATCH', { status: 'cancelled' }, other)).status,
        404,
      );
      assert.equal((await request('/schedules', 'POST', plan())).status, 409);
      const concurrent = await Promise.all([
        request('/schedules', 'POST', plan(1)),
        request('/schedules', 'POST', plan(1)),
      ]);
      assert.deepEqual(concurrent.map((result) => result.status).sort(), [201, 409]);
      assert.equal(await PostSchedule.countDocuments({ campaign: campaignId }), 2);
    },
  );
  await t.test(
    'rescheduling preserves ownership/reference and invalid changes preserve dates',
    async () => {
      const before = (await request('/schedules')).body.schedules.find((item) => item.id === id);
      assert.equal((await request(`/schedules/${id}`, 'PUT', { scheduledFor: 'bad' })).status, 400);
      assert.equal((await request('/schedules/invalid', 'PUT', plan())).status, 400);
      assert.equal((await request('/schedules/' + 'c'.repeat(24), 'PUT', plan())).status, 404);
      assert.equal(
        (await request('/schedules')).body.schedules.find((item) => item.id === id).scheduledFor,
        before.scheduledFor,
      );
      const nextDate = future(2);
      const changed = await request(`/schedules/${id}`, 'PUT', {
        scheduledFor: nextDate,
        owner: 'a'.repeat(24),
        campaignId: 'b'.repeat(24),
        postIndex: 2,
        status: 'published',
      });
      assert.equal(changed.status, 200);
      assert.equal(changed.body.schedule.scheduledFor, nextDate);
      assert.equal(changed.body.schedule.campaignId, campaignId);
      assert.equal(changed.body.schedule.postIndex, 0);
      assert.equal(changed.body.schedule.status, 'scheduled');
    },
  );
  await t.test('cancellation is recoverable and publishing is manual/idempotent', async () => {
    const status = (value) =>
      request(`/schedules/${id}/status`, 'PATCH', { status: value, publishedAt: '1990-01-01' });
    assert.equal((await status('fake')).status, 400);
    assert.equal((await status('cancelled')).body.schedule.status, 'cancelled');
    assert.equal((await status('cancelled')).status, 200);
    assert.equal((await status('published')).status, 409);
    assert.equal((await request('/schedules')).body.scheduledTotal, 1);
    assert.equal(
      (await request(`/schedules/${id}`, 'PUT', { scheduledFor: future(3) })).body.schedule.status,
      'scheduled',
    );
    const published = (await status('published')).body.schedule;
    assert.equal(published.status, 'published');
    assert.ok(new Date(published.publishedAt) > new Date('2026-01-01'));
    assert.equal((await status('published')).body.schedule.publishedAt, published.publishedAt);
    assert.equal((await status('cancelled')).status, 409);
    assert.equal((await request(`/schedules/${id}`, 'PUT', plan())).status, 409);
  });
  await t.test(
    'latest saved captions, plans and counts survive reconnect/product deletion',
    async () => {
      await request(`/campaigns/${campaignId}`, 'PUT', {
        ...content,
        title: 'Updated campaign',
        posts: content.posts.map((post) => ({ ...post, caption: 'Updated saved caption.' })),
      });
      await mongoose.disconnect();
      await mongoose.connect(uri);
      await request(`/products/${productId}`, 'DELETE');
      const result = (await request('/schedules')).body;
      assert.equal(result.total, 2);
      assert.equal(result.scheduledTotal, 1);
      assert.equal(result.schedules[0].caption, 'Updated saved caption.');
      assert.equal(result.schedules[0].campaignTitle, 'Updated campaign');
    },
  );
  await t.test(
    'unavailable database gives readable responses and deletion removes plans',
    async () => {
      await mongoose.disconnect();
      assert.equal((await request('/schedules')).status, 503);
      assert.equal((await request('/schedules', 'POST', plan())).status, 503);
      assert.equal((await request(`/schedules/${id}`, 'PUT', plan())).status, 503);
      assert.equal(
        (await request(`/schedules/${id}/status`, 'PATCH', { status: 'cancelled' })).status,
        503,
      );
      assert.equal((await request('/health')).status, 200);
      await mongoose.connect(uri);
      assert.equal(
        (await request(`/campaigns/${campaignId}`, 'DELETE', undefined, other)).status,
        404,
      );
      assert.equal(await PostSchedule.countDocuments({ campaign: campaignId }), 2);
      assert.equal((await request(`/campaigns/${campaignId}`, 'DELETE')).status, 204);
      assert.equal(await PostSchedule.countDocuments({ campaign: campaignId }), 0);
      assert.equal((await request('/schedules')).body.total, 0);
    },
  );
});
