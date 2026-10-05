// Local preview adapter. Production identity, moderation and storage belong on the server.
export const COMMUNITY_LIMITS = Object.freeze({ title: 40, body: 2000, photos: 6, fileBytes: 10 * 1024 * 1024, comment: 300 });
export const communitySeed = [
  { id: 'official-lake', title: '湖边坐一会儿，也是旅行', body: '一行人在湖岸并肩坐下，把目光留给远处。\n\n这里收录的是无方提供的旅途影像。你也可以分享自己的路上见闻：一次停留、一段同行，或是出发前希望有人告诉你的事。', photos: ['../media/companions-lakeside.jpg', '../media/companions-dusk.jpg'], route: 'ali', author: '无方旅行', editorial: true, status: 'published' },
  { id: 'official-mountain', title: '雪山前，留下同行的身影', body: '雪山前的合影，山谷里的脚步。风景之外，一起走过的人也值得被记住。\n\n照片来自无方提供的阿里路线素材。这是官方影像整理，不是团友评价。', photos: ['../media/companions-mountain.jpg', '../media/companions-walking.jpg'], route: 'ali', author: '无方旅行', editorial: true, status: 'published' }
];
const empty = () => ({ posts: [], liked: [], saved: [], comments: [], reports: [] });
export function postErrors(post, submit = false) {
  const errors = {};
  if (submit && !post.title?.trim()) errors.title = '给这篇游记起一个标题';
  if ((post.title || '').length > COMMUNITY_LIMITS.title) errors.title = '标题最多 40 个字';
  if (submit && (post.body?.trim().length || 0) < 10) errors.body = '再写一点吧，正文至少 10 个字';
  if ((post.body || '').length > COMMUNITY_LIMITS.body) errors.body = '正文最多 2000 个字';
  if (!Array.isArray(post.photos) || post.photos.length > COMMUNITY_LIMITS.photos) errors.photos = '最多添加 6 张照片';
  else if (post.photos.some(src => !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(src))) errors.photos = '照片格式有误，请重新选择';
  if (post.route && !['ali', 'kora'].includes(post.route)) errors.route = '请选择现有路线';
  return errors;
}

export async function createCommunityStore(persistence) {
  const loaded = await persistence.read();
  let state = loaded || empty();
  if (!['posts', 'liked', 'saved', 'comments', 'reports'].every(key => Array.isArray(state[key]))) throw new Error('本地社区数据无法读取，请不要清除浏览器数据，稍后重试');
  let queue = Promise.resolve();
  const all = () => [...state.posts, ...communitySeed];
  function mutate(change) {
    const operation = queue.then(async () => {
      const next = structuredClone(state);
      const result = change(next);
      await persistence.write(next);
      state = next;
      return structuredClone(result);
    });
    queue = operation.catch(() => {});
    return operation;
  }
  function requireProfile(profile) { if (!profile?.nickname) throw new Error('请先登录，再参与社区'); }
  function own(next, id) {
    const post = next.posts.find(p => p.id === id);
    if (!post) throw new Error('没有找到这篇游记');
    return post;
  }
  return {
    list({ scope = 'all', route = '' } = {}) {
      return structuredClone(all().filter(p => p.status !== 'removed' && (scope === 'mine' ? !p.editorial : p.status === 'published') && (scope !== 'saved' || state.saved.includes(p.id)) && (!route || p.route === route)));
    },
    get(id) { return structuredClone(all().find(p => p.id === id && p.status !== 'removed') || null); },
    activity(id) { return { liked: state.liked.includes(id), saved: state.saved.includes(id), comments: structuredClone(state.comments.filter(c => c.postId === id)) }; },
    saveDraft(post, profile) {
      requireProfile(profile);
      const errors = postErrors(post);
      if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
      return mutate(next => {
        const existing = post.id ? own(next, post.id) : null;
        if (existing && existing.status !== 'draft') throw new Error('请先撤回投稿，再继续编辑');
        const value = { id: existing?.id || crypto.randomUUID(), title: post.title.trim(), body: post.body.trim(), photos: [...post.photos], route: post.route || '', author: profile.nickname, status: 'draft', editorial: false, updatedAt: new Date().toISOString() };
        if (existing) Object.assign(existing, value); else next.posts.unshift(value);
        return value;
      });
    },
    submit(id, profile, consent) {
      requireProfile(profile);
      return mutate(next => {
        const post = own(next, id);
        if (post.status !== 'draft') throw new Error('这篇游记已提交，请勿重复投稿');
        if (!consent) throw new Error('请确认内容与照片的分享权限');
        const errors = postErrors(post, true);
        if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
        post.status = 'pending'; post.submittedAt = new Date().toISOString();
        return post;
      });
    },
    withdraw(id, profile) {
      requireProfile(profile);
      return mutate(next => { const post = own(next, id); if (post.status !== 'pending') throw new Error('只有待审核游记可以撤回'); post.status = 'draft'; return post; });
    },
    remove(id, profile) {
      requireProfile(profile);
      return mutate(next => { const post = own(next, id); post.previousStatus = post.status; post.status = 'removed'; return post; });
    },
    restore(id, profile) {
      requireProfile(profile);
      return mutate(next => { const post = own(next, id); if (post.status !== 'removed') throw new Error('游记不在回收站'); post.status = 'draft'; return post; });
    },
    trash() { return structuredClone(state.posts.filter(p => p.status === 'removed')); },
    toggle(id, kind, profile) {
      requireProfile(profile);
      if (!['liked', 'saved'].includes(kind) || !all().some(p => p.id === id && p.status === 'published')) throw new Error('只能对公开游记进行互动');
      return mutate(next => { const active = !next[kind].includes(id); next[kind] = active ? [...next[kind], id] : next[kind].filter(value => value !== id); return active; });
    },
    comment(id, body, profile) {
      requireProfile(profile);
      if (!all().some(p => p.id === id && p.status === 'published')) throw new Error('这篇游记尚未公开');
      if (!body.trim() || body.trim().length > COMMUNITY_LIMITS.comment) throw new Error('留言请填写 1–300 个字');
      return mutate(next => { const value = { id: crypto.randomUUID(), postId: id, body: body.trim(), author: profile.nickname, status: 'pending' }; next.comments.push(value); return value; });
    },
    report(id, reason, profile) {
      requireProfile(profile);
      if (!all().some(p => p.id === id && p.status === 'published')) throw new Error('这篇游记尚未公开');
      if (!['侵权或隐私', '广告或无关内容', '不友善或不实内容'].includes(reason)) throw new Error('请选择反馈原因');
      return mutate(next => { if (!next.reports.some(r => r.postId === id)) next.reports.push({ postId: id, reason }); return true; });
    }
  };
}

export function browserCommunityPersistence() {
  let opening;
  function database() {
    return opening ||= new Promise((resolve, reject) => {
      const request = indexedDB.open('wufang-community-preview-v1', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('community');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => { opening = null; reject(new Error('浏览器存储不可用，内容尚未保存')); };
      request.onblocked = () => { opening = null; reject(new Error('请关闭其他预览标签页后重试')); };
    });
  }
  async function transact(write, value) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('community', write ? 'readwrite' : 'readonly');
      const request = write ? tx.objectStore('community').put(value, 'state') : tx.objectStore('community').get('state');
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = tx.onerror = () => reject(new Error('未能保存，可能是浏览器存储空间不足；请保留页面后重试'));
    });
  }
  return { read: () => transact(false), write: value => transact(true, value) };
}
