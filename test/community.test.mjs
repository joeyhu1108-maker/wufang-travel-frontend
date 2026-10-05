import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCommunityStore, communitySeed, postErrors } from '../public/mobile-design/community-model.mjs';
import { communityEntry, communityCard } from '../public/mobile-design/community.mjs';

const profile = { nickname: '测试旅人', demo: true };
const post = { title: '在西藏的一天', body: '这是一篇用于验证社区投稿流程的测试游记。', photos: [], route: 'ali' };
function memory() { let value; return { read: async () => structuredClone(value), write: async next => { value = structuredClone(next); } }; }

test('public feed starts with identified official media, not fabricated traveller reviews', async () => {
  const db = await createCommunityStore(memory());
  assert.equal(db.list().length, 2);
  assert.ok(db.list().every(p => p.editorial && p.author === '无方旅行'));
  assert.equal(db.list({ route: 'kora' }).length, 0);
  assert.equal(db.list({ scope: 'mine' }).length, 0);
  assert.deepEqual(db.activity(communitySeed[0].id), { liked: false, saved: false, comments: [] });
});

test('draft -> pending is persisted but never leaks into the public feed', async () => {
  const storage = memory(), db = await createCommunityStore(storage);
  const draft = await db.saveDraft(post, profile);
  assert.equal(draft.status, 'draft');
  await assert.rejects(db.submit(draft.id, profile, false), /分享权限/);
  const pending = await db.submit(draft.id, profile, true);
  assert.equal(pending.status, 'pending');
  assert.equal(db.list().length, 2);
  assert.equal(db.list({ scope: 'mine' }).length, 1);
  const restored = await createCommunityStore(storage);
  assert.equal(restored.get(draft.id).status, 'pending');
  await assert.rejects(db.submit(draft.id, profile, true), /重复/);
  await assert.rejects(db.saveDraft({ ...draft, title: '修改' }, profile), /撤回/);
});

test('withdrawal and recoverable removal return content to draft without losing photos', async () => {
  const db = await createCommunityStore(memory());
  const draft = await db.saveDraft({ ...post, photos: ['data:image/jpeg;base64,YQ=='] }, profile);
  await db.submit(draft.id, profile, true);
  await db.withdraw(draft.id, profile);
  await db.remove(draft.id, profile);
  assert.equal(db.get(draft.id), null);
  assert.equal(db.trash().length, 1);
  await db.restore(draft.id, profile);
  assert.equal(db.get(draft.id).status, 'draft');
  assert.equal(db.get(draft.id).photos[0], 'data:image/jpeg;base64,YQ==');
  assert.equal(db.trash().length, 0);
});

test('validation permits incomplete drafts but prevents blank submission, invalid routes and unsafe images', async () => {
  assert.deepEqual(postErrors({ title: '', body: '', photos: [], route: '' }), {});
  assert.ok(postErrors({ title: '', body: '', photos: [] }, true).title);
  assert.ok(postErrors({ ...post, title: '长'.repeat(41) }).title);
  assert.ok(postErrors({ ...post, body: '短' }, true).body);
  assert.ok(postErrors({ ...post, body: '长'.repeat(2001) }).body);
  assert.ok(postErrors({ ...post, photos: Array(7).fill('data:image/jpeg;base64,YQ==') }).photos);
  assert.ok(postErrors({ ...post, photos: ['javascript:alert(1)'] }).photos);
  assert.ok(postErrors({ ...post, photos: ['data:image/svg+xml;base64,YQ=='] }).photos);
  assert.ok(postErrors({ ...post, route: 'nonexistent' }).route);
  const db = await createCommunityStore(memory());
  assert.throws(() => db.saveDraft(post, null), /登录/);
});

test('official posts cannot be edited or submitted using client draft ids', async () => {
  const db = await createCommunityStore(memory());
  await assert.rejects(db.saveDraft({ ...post, id: 'official-lake' }, profile), /没有找到/);
  await assert.rejects(db.remove('official-lake', profile), /没有找到/);
});

test('likes and saves toggle and survive a store reload, without invented counts', async () => {
  const storage = memory(), db = await createCommunityStore(storage);
  assert.equal(await db.toggle('official-lake', 'liked', profile), true);
  assert.equal(await db.toggle('official-lake', 'liked', profile), false);
  await db.toggle('official-lake', 'saved', profile);
  const reloaded = await createCommunityStore(storage);
  assert.equal(reloaded.list({ scope: 'saved' }).length, 1);
  const draft = await db.saveDraft(post, profile);
  assert.throws(() => db.toggle(draft.id, 'liked', profile), /公开/);
});

test('comments require login and meaningful content and stay pending; duplicate reports do not stack', async () => {
  const storage = memory(), db = await createCommunityStore(storage);
  assert.throws(() => db.comment('official-lake', '你好', null), /登录/);
  assert.throws(() => db.comment('official-lake', '   ', profile), /1–300/);
  assert.throws(() => db.comment('official-lake', '字'.repeat(301), profile), /1–300/);
  const comment = await db.comment('official-lake', '很喜欢这片湖的颜色。', profile);
  assert.equal(comment.status, 'pending');
  assert.equal(db.activity('official-lake').comments.length, 1);
  await db.report('official-lake', '侵权或隐私', profile);
  await db.report('official-lake', '侵权或隐私', profile);
  assert.equal((await storage.read()).reports.length, 1);
});

test('failed persistence does not claim success or discard the previous saved state', async () => {
  let fail = false;
  const storage = memory(), write = storage.write;
  storage.write = async value => { if (fail) throw new Error('quota'); await write(value); };
  const db = await createCommunityStore(storage), draft = await db.saveDraft(post, profile);
  fail = true;
  await assert.rejects(db.submit(draft.id, profile, true), /quota/);
  assert.equal(db.get(draft.id).status, 'draft');
  fail = false;
  assert.equal((await db.submit(draft.id, profile, true)).status, 'pending');
});

test('queued updates retain interactions and returned values cannot mutate storage', async () => {
  const db = await createCommunityStore(memory());
  await Promise.all([db.toggle('official-lake', 'saved', profile), db.toggle('official-mountain', 'saved', profile)]);
  assert.equal(db.list({ scope: 'saved' }).length, 2);
  const draft = await db.saveDraft(post, profile);
  db.get(draft.id).status = 'published';
  assert.equal(db.get(draft.id).status, 'draft');
});

test('cards escape user content and entry points keep route association', () => {
  const html = communityCard({ ...post, id: 'test', author: '<script>', title: '<img src=x onerror=alert(1)>', status: 'draft' });
  assert.doesNotMatch(html, /<script>|<img src=x/);
  assert.match(html, /&lt;img/);
  assert.match(communityEntry('kora'), /data-community-route="kora"/);
  const ui = readFileSync(new URL('../public/mobile-design/ui.js', import.meta.url), 'utf8');
  assert.match(ui, /communityEntry\(\)/);
  assert.match(ui, /communityEntry\(r.id\)/);
  assert.match(ui, /我的游记与草稿/);
  const source = readFileSync(new URL('../public/mobile-design/community.mjs', import.meta.url), 'utf8');
  assert.match(source, /if \(disposed\) return/);
  assert.match(source, /removeEventListener\('beforeunload'/);
  assert.match(source, /URL.revokeObjectURL/);
  assert.match(source, /本地社区体验/);
  assert.match(source, /if \(!profile\) activity.comments = \[\]/);
  assert.match(source, /mode === 'feed' \? feed.returnTo/);
  assert.match(source, /postReturn = mode === 'mine'/);
});
