import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const { resolveRuntime } = require('../miniprogram/services/runtime.js');
const { validateInquiry, todayInChina } = require('../miniprogram/services/inquiry.js');
const { createHandler } = require('../cloudfunctions/wufangApi/handler.js');
const identity = { APPID: 'wx1234567890abcdef', OPENID: 'trusted-wechat-user' };
const settings = { appId: identity.APPID, privacyVersion: '2026-10-05' };
const fixedTime = Date.parse('2026-10-05T02:00:00Z');
const route = { _id: 'ali', title: '阿里大环线', price: 14800, cover: 'https://example.com/approved.jpg', published: true, approved: true, internalContact: 'private' };
const input = { routeId: 'ali', requestId: 'request-1234567890', name: ' 测试旅人 ', phone: '13800000000', date: '2026-10-20', people: 2, consent: true, privacyVersion: settings.privacyVersion };

function repository() {
  const records = new Map([['routes:ali', { ...route }]]);
  return {
    records,
    async get(collection, id) { return records.get(`${collection}:${id}`) || null; },
    async listRoutes() { return [...records].filter(([key]) => key.startsWith('routes:')).map(([, value]) => value); },
    async create(collection, document) {
      const key = `${collection}:${document._id}`;
      if (!records.has(key)) records.set(key, structuredClone(document));
      return records.get(key);
    },
  };
}

function moduleInSandbox(file, dependencies, globals = {}) {
  const module = { exports: {} };
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  vm.runInNewContext(source, {
    module, exports: module.exports,
    require: key => { if (!(key in dependencies)) throw new Error(`Unexpected dependency: ${key}`); return dependencies[key]; },
    setTimeout, clearTimeout, ...globals,
  }, { filename: file });
  return module.exports;
}

test('preview fixtures can never run in trial, release or an unknown environment', () => {
  const config = { mode: 'preview', environments: { develop: '', trial: '', release: '' } };
  assert.equal(resolveRuntime(config, 'develop').preview, true);
  for (const version of ['trial', 'release', 'unexpected']) {
    assert.equal(resolveRuntime(config, version).preview, false);
    assert.equal(resolveRuntime(config, version).configured, false);
  }
  assert.equal(resolveRuntime({ mode: 'cloud', environments: { release: 'REPLACE_ME' } }, 'release').configured, false);
  assert.equal(resolveRuntime({ mode: 'cloud', environments: { release: '   ' } }, 'release').configured, false);
  assert.equal(resolveRuntime({ mode: 'cloud', environments: { release: 'production-env-id' } }, 'release').configured, true);
});

test('form validation checks China date boundary, calendar validity, consent and traveller count', () => {
  assert.equal(todayInChina(Date.parse('2026-10-04T16:05:00Z')), '2026-10-05');
  assert.equal(validateInquiry(input, '2026-10-05'), '');
  for (const change of [{ name: ' ' }, { phone: '123' }, { date: '2026-02-30' }, { date: '2026-10-04' }, { people: '1.5' }, { people: '7' }, { consent: false }]) {
    assert.notEqual(validateInquiry({ ...input, ...change }, '2026-10-05'), '');
  }
});

test('cloud actions reject an absent or forged WeChat identity before returning data', async () => {
  const handle = createHandler(repository(), settings, () => fixedTime);
  for (const context of [null, {}, { ...identity, APPID: 'another-app' }, { APPID: identity.APPID }]) {
    assert.equal((await handle({ action: 'login', payload: { OPENID: identity.OPENID } }, context)).code, 'AUTH_REQUIRED');
  }
  const result = await handle({ action: 'login' }, identity);
  assert.equal(result.data.authenticated, true);
  assert.match(result.data.user.id, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(result).includes(identity.OPENID), false);
});

test('only approved complete routes are public; template prices and internal fields never leak', async () => {
  const repo = repository();
  repo.records.set('routes:template', { ...route, _id: 'template', price: null });
  repo.records.set('routes:hidden', { ...route, _id: 'hidden', approved: false });
  const handle = createHandler(repo, settings, () => fixedTime);
  const result = await handle({ action: 'listRoutes' }, identity);
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].id, 'ali');
  assert.equal('internalContact' in result.data[0], false);
  for (const id of ['hidden', 'template', 'missing']) assert.equal((await handle({ action: 'getRoute', payload: { id } }, identity)).code, 'NOT_FOUND');
  assert.equal((await handle({ action: 'getRoute', payload: null }, identity)).code, 'NOT_FOUND');
});

test('parallel identical inquiry requests save exactly one record with server-owned identity and status', async () => {
  const repo = repository(), handle = createHandler(repo, settings, () => fixedTime);
  const results = await Promise.all(Array.from({ length: 12 }, () => handle({ action: 'createInquiry', payload: { ...input, owner: 'attacker', _openid: 'forged', status: 'paid', price: 1, routeTitle: 'forged' } }, identity)));
  assert.ok(results.every(result => result.ok && result.data.status === 'received'));
  assert.equal(new Set(results.map(result => result.data.id)).size, 1);
  const inquiries = [...repo.records].filter(([key]) => key.startsWith('inquiries:'));
  assert.equal(inquiries.length, 1);
  const saved = inquiries[0][1];
  assert.equal(saved._openid, identity.OPENID);
  assert.notEqual(saved.owner, 'attacker');
  assert.equal(saved.routeTitle, route.title);
  assert.equal(saved.status, 'received');
  assert.equal('price' in saved, false);
  assert.equal(saved.name, '测试旅人');
});

test('retry returns the original receipt; changed payload conflicts and a second key is rate limited', async () => {
  const repo = repository(), handle = createHandler(repo, settings, () => fixedTime);
  const first = await handle({ action: 'createInquiry', payload: input }, identity);
  assert.deepEqual(await handle({ action: 'createInquiry', payload: input }, identity), first);
  assert.equal((await handle({ action: 'createInquiry', payload: { ...input, people: 3 } }, identity)).code, 'CONFLICT');
  assert.equal((await handle({ action: 'createInquiry', payload: { ...input, requestId: 'another-request-12345' } }, identity)).code, 'RATE_LIMITED');
  assert.equal([...repo.records].filter(([key]) => key.startsWith('inquiries:')).length, 1);
});

test('cloud validation rejects invalid inputs and an unconfirmed policy without storing personal data', async () => {
  const repo = repository(), handle = createHandler(repo, settings, () => fixedTime);
  for (const change of [{ name: '坏\n名字' }, { phone: 'bad' }, { date: '2026-02-30' }, { people: 0 }, { people: '2' }, { consent: false }, { privacyVersion: 'old' }, { requestId: 'short' }]) {
    assert.equal((await handle({ action: 'createInquiry', payload: { ...input, ...change } }, identity)).code, 'INVALID_INPUT');
  }
  assert.equal((await createHandler(repo, { ...settings, privacyVersion: '' })({ action: 'createInquiry', payload: input }, identity)).code, 'POLICY_NOT_READY');
  assert.equal([...repo.records].filter(([key]) => key.startsWith('inquiries:')).length, 0);
});

test('failed persistence does not produce a successful receipt and can recover using the same key', async () => {
  const repo = repository(), save = repo.create;
  let offline = true;
  repo.create = async (collection, document) => { if (collection === 'inquiries' && offline) throw new Error('offline'); return save(collection, document); };
  const handle = createHandler(repo, settings, () => fixedTime);
  await assert.rejects(handle({ action: 'createInquiry', payload: input }, identity), /offline/);
  offline = false;
  assert.equal((await handle({ action: 'createInquiry', payload: input }, identity)).data.status, 'received');
});

test('client never authenticates, returns mock data or accepts fake receipts when cloud is unavailable', async () => {
  const app = { globalData: { cloudReady: false, runtime: { preview: false }, user: null } };
  const deps = { '../config': { functionName: 'wufangApi', privacyVersion: 'confirmed' }, './preview-routes': [route] };
  let response = { result: { ok: true, data: {} } };
  const api = moduleInSandbox('../miniprogram/services/api.js', deps, { getApp: () => app, wx: { cloud: { callFunction: async () => response } } });
  for (const action of [() => api.getRoutes(), () => api.login(), () => api.createInquiry(input)]) await assert.rejects(action(), error => error.code === 'NOT_CONFIGURED');
  assert.equal(app.globalData.user, null);
  app.globalData.cloudReady = true;
  await assert.rejects(api.login(), error => error.code === 'AUTH_REQUIRED');
  await assert.rejects(api.createInquiry(input), error => error.code === 'SERVICE_UNAVAILABLE');
  await assert.rejects(api.getRoutes(), error => error.code === 'SERVICE_UNAVAILABLE');
  response = { result: { ok: true, data: { id: 'wrong-route' } } };
  await assert.rejects(api.getRoute('ali'), error => error.code === 'NOT_FOUND');
  response = { result: { ok: false, code: 'RATE_LIMITED' } };
  await assert.rejects(api.createInquiry(input), error => error.code === 'RATE_LIMITED');
});

test('inquiry page prevents double submission, preserves fields on failure and reuses its idempotency key', async () => {
  let page, resolveRequest, calls = [];
  const deps = {
    '../../config': { privacyVersion: 'confirmed' },
    '../../services/inquiry': { todayInChina: () => '2026-10-05', validateInquiry: () => '' },
    '../../services/api': { getRoute: async () => route, createInquiry: payload => { calls.push(payload); return new Promise(resolve => { resolveRequest = resolve; }); } },
  };
  moduleInSandbox('../miniprogram/pages/booking/booking.js', deps, { Page: value => { page = value; }, wx: {} });
  page.data = { ...page.data, ...input, route: { ...route, id: 'ali' }, loading: false };
  page.setData = change => Object.assign(page.data, change);
  const pending = page.submit();
  await page.submit();
  assert.equal(calls.length, 1);
  assert.equal(page.data.submitting, true);
  resolveRequest({ id: 'server-receipt' });
  await pending;
  assert.equal(page.data.submitted, true);
  await page.submit();
  assert.equal(calls.length, 1);
  page.data.submitted = false;
  deps['../../services/api'].createInquiry = async payload => { calls.push(payload); throw new Error('断网'); };
  // 方法在加载时解构服务，使用新的页面实例验证失败重试。
  moduleInSandbox('../miniprogram/pages/booking/booking.js', deps, { Page: value => { page = value; }, wx: {} });
  page.data = { ...page.data, ...input, route: { ...route, id: 'ali' }, loading: false };
  page.setData = change => Object.assign(page.data, change);
  await page.submit();
  const key = calls.at(-1).requestId;
  await page.submit();
  assert.equal(calls.at(-1).requestId, key);
  assert.equal(page.data.phone, input.phone);
  assert.equal(page.data.submitted, false);
  assert.equal(page.data.error, '断网');
  assert.equal(page.data.submitting, false);
});

test('launch templates do not publish guessed inventory, accept unaudited policies or declare live acceptance', () => {
  const read = file => readFileSync(new URL(file, import.meta.url), 'utf8');
  const templates = JSON.parse(read('../launch/routes-template.json'));
  for (const template of templates) {
    assert.equal(template.published, false);
    assert.equal(template.approved, false);
    assert.equal(template.price, null);
  }
  const rules = JSON.parse(read('../launch/database-rules.json'));
  assert.equal(rules.read, false);
  assert.equal(rules.write, false);
  const acceptance = JSON.parse(read('../launch/acceptance.json'));
  assert.ok(acceptance.checks.every(check => check.status === 'pending' && check.evidence === ''));
  for (const file of ['../launch/甲方资料填写表.csv', '../launch/团期资料模板.csv']) {
    const lines = read(file).trim().split('\n'), columns = lines[0].split(',').length;
    assert.ok(lines.slice(1).every(line => line.split(',').length === columns), `${file} column count`);
  }
});
