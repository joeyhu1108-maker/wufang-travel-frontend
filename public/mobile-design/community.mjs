import { icon } from './components.mjs';
import { routes } from './data.mjs';
import { COMMUNITY_LIMITS, createCommunityStore, browserCommunityPersistence, postErrors } from './community-model.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const labels = { draft: '草稿', pending: '待审核 · 仅自己可见', published: '已公开', removed: '已移入回收站' };
const blank = () => ({ title: '', body: '', route: '', photos: [] });
const previewNote = '<p class="community-preview">本地社区体验 · 投稿与互动仅保存在此浏览器，尚未发送给团队。</p>';
let storePromise;
let feed = { scope: 'all', route: '', top: 0, returnTo: 'home' };
let postReturn = 'community';
const store = () => storePromise ||= createCommunityStore(browserCommunityPersistence()).catch(error => { storePromise = null; throw error; });

export function communityEntry(route = '') {
  return `<section class="community-entry${route ? ' is-route' : ''}" aria-label="团友社区">
    <div><span class="community-kicker">团友社区</span><h2>${route ? '这条路，大家怎么走？' : '风景之外，也听听彼此。'}</h2><p>${route ? '看看沿途记录，分享你的旅行体验。' : '分享照片、写下游记，认识同行的人。'}</p></div>
    <button class="community-entry-link" data-action="community" data-community-route="${route}"><span>${route ? '查看路线游记' : '进入团友社区'}</span>${icon('arrow')}</button>
  </section>`;
}
export function filterCommunity(route = '', returnTo = 'home') { feed = { scope: 'all', route, top: 0, returnTo }; }
export function communityCard(post) {
  return `<article class="community-card"><button data-cm="post" data-id="${escape(post.id)}" aria-label="阅读：${escape(post.title || '未命名草稿')}">
    ${post.photos.length ? `<img src="${escape(post.photos[0])}" alt="${escape(post.title || '游记照片')}" loading="lazy" decoding="async" />` : '<div class="community-no-photo">旅途手记</div>'}
    <div class="community-card-copy"><span class="community-kicker">${post.editorial ? '无方影像' : labels[post.status]}</span><h2>${escape(post.title || '未命名草稿')}</h2><p>${escape(routes[post.route]?.name || '路上见闻')}</p><span class="community-author"><i aria-hidden="true">${post.editorial ? '无' : escape([...post.author][0])}</i>${escape(post.author)}</span></div>
  </button></article>`;
}

async function photoData(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('请选择 JPG、PNG 或 WebP 照片');
  if (file.size > COMMUNITY_LIMITS.fileBytes) throw new Error('单张照片不能超过 10 MB');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url; await image.decode();
    const ratio = Math.min(1, 1440 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * ratio); canvas.height = Math.round(image.naturalHeight * ratio);
    const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch { throw new Error('这张照片无法读取，请换一张再试'); }
  finally { URL.revokeObjectURL(url); }
}

export function mountCommunity(container, { page, profile, go, login, toast }) {
  let disposed = false, database, draft, busy = false, uploading = false, dirty = false, timer, commentText = '';
  let mode = page.startsWith('community-compose') ? 'compose' : page.startsWith('community-post/') ? 'post' : page === 'community-mine' ? 'mine' : page === 'community-trash' ? 'trash' : 'feed';
  const id = page.split('/')[1];
  const auth = () => { if (profile) return true; login(page); return false; };
  const button = (action, text, primary = false, extra = '') => `<button class="community-button${primary ? ' is-primary' : ''}" data-cm="${action}" ${extra}>${text}</button>`;
  const bar = (title, right = '') => `<header class="community-topbar"><button data-cm="back" aria-label="返回">${icon('back')}</button><span>${title}</span>${right || '<span></span>'}</header>`;
  const message = text => { const el = container.querySelector('#community-error'); if (el) el.textContent = text; else toast(text); };
  const status = text => { const el = container.querySelector('#community-save-state'); if (el) el.textContent = text; };
  function requireAvailable() { if (!database) throw new Error('社区仍在加载，请稍后重试'); }
  function editorPhotos() {
    return draft.photos.map((src, i) => `<div class="community-photo-item"><img src="${escape(src)}" alt="已选照片 ${i + 1}" /><button data-cm="remove-photo" data-index="${i}" aria-label="移除照片 ${i + 1}">${icon('close')}</button><button class="community-cover" data-cm="cover" data-index="${i}" aria-pressed="${i === 0}">${i === 0 ? '封面' : '设为封面'}</button></div>`).join('');
  }
  function draw() {
    if (disposed) return;
    const top = window.scrollY;
    if (mode === 'feed' || mode === 'mine' || mode === 'trash') {
      const personal = mode !== 'feed';
      const posts = mode === 'trash' ? database.trash() : database.list(personal ? { scope: 'mine' } : feed);
      container.innerHTML = `<section class="screen is-active community-screen">
        ${bar(personal ? mode === 'trash' ? '回收站' : '我的游记' : '团友社区', personal ? '' : '<button data-cm="mine">我的</button>')}
        <div class="community-intro"><p class="community-kicker">${personal ? '留住每一段旅程' : '路上的故事，在这里相遇'}</p><div class="community-heading"><h1>${personal ? mode === 'trash' ? '故事还在，可以找回。' : '写过的路，<br>都在这里。' : '分享你的<br>西藏时刻。'}</h1>${mode !== 'trash' ? button('write', '＋ 写游记', true) : ''}</div><p>${mode === 'trash' ? '恢复后回到草稿，需要重新投稿。' : personal ? '草稿与待审核内容仅自己可见。' : '看看沿途见闻，也把你的旅行体验留下来。'}</p></div>
        ${previewNote}
        ${personal ? `<div class="community-list-heading"><span>${posts.length} 篇${mode === 'trash' ? '已移除游记' : '游记'}</span>${mode === 'mine' ? '<button data-cm="trash">回收站</button>' : ''}</div>` : `<div class="community-filters"><div role="group" aria-label="内容范围">${[['all','全部'],['saved','我的收藏']].map(([value, text]) => `<button data-cm="scope" data-value="${value}" aria-pressed="${feed.scope === value}">${text}</button>`).join('')}</div><label>路线<select id="community-route" aria-label="筛选游记路线"><option value="">全部路线</option>${Object.values(routes).map(r => `<option value="${r.id}" ${feed.route === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}</select></label></div>`}
        <div class="community-grid">${posts.map(post => mode === 'trash' ? `<article class="community-trash-item"><h2>${escape(post.title || '未命名草稿')}</h2>${button('restore', '恢复为草稿', false, `data-id="${post.id}"`)}</article>` : communityCard(post)).join('')}</div>
        ${!posts.length ? `<div class="community-empty"><span aria-hidden="true">○</span><h2>${mode === 'trash' ? '回收站是空的' : mode === 'mine' ? '第一篇游记，从你开始。' : feed.scope === 'saved' ? '还没有收藏的游记' : '这条路线，等你来记录。'}</h2><p>${mode === 'trash' ? '移除的游记会保留在这里。' : mode === 'mine' ? '草稿随时可以回来继续写。' : feed.scope === 'saved' ? '遇到喜欢的故事，点进详情收藏。' : '还没有公开游记。你可以分享沿途照片和见闻。'}</p>${mode !== 'trash' ? button('write', '写下我的旅途', true) : ''}</div>` : ''}
        ${!personal && posts.length ? `<div class="community-invitation"><h2>下一篇，想听听你的故事。</h2><p>真实的照片和感受，比标准答案更动人。</p>${button('write','写一篇游记', true)}</div><p class="community-source">首批内容为无方提供的旅途影像整理，非团友评价。<br>团友投稿审核通过后才会公开。</p>` : ''}
        <p class="community-error" id="community-error" role="alert"></p>
      </section>`;
    } else if (mode === 'compose') {
      container.innerHTML = `<section class="screen is-active community-screen community-compose">${bar('写游记', '<button data-cm="save">存草稿</button>')}
        <div class="community-editor"><p class="community-kicker">把值得记住的，分享给同行的人</p><h1>这一程，你想留下什么？</h1>${previewNote}
        <div class="community-field-head"><label for="community-photos">旅途照片 <small>选填 · 最多 6 张</small></label><span id="community-photo-count">${draft.photos.length} / 6</span></div>
        <div class="community-photo-grid" id="community-photo-grid">${editorPhotos()}</div><label class="community-add-photo">＋ 添加照片<input type="file" id="community-photos" accept="image/jpeg,image/png,image/webp" multiple /></label><p class="community-field-note">JPG / PNG / WebP，单张不超过 10 MB。首张为封面。</p>
        <form id="community-post-form" novalidate><label for="community-title">标题 <span id="community-title-count">${draft.title.length} / 40</span></label><input id="community-title" name="title" maxlength="40" value="${escape(draft.title)}" placeholder="给这一段旅行起个名字" aria-describedby="community-error" />
        <label for="community-body">旅行体验 <span id="community-body-count">${draft.body.length} / 2000</span></label><textarea id="community-body" name="body" rows="8" maxlength="2000" placeholder="去了哪里？哪一刻让你记住？有什么想告诉下一位旅人？至少写 10 个字。" aria-describedby="community-error">${escape(draft.body)}</textarea>
        <label for="community-post-route">关联路线 <small>选填</small></label><select id="community-post-route" name="route"><option value="">不关联路线</option>${Object.values(routes).map(r => `<option value="${r.id}" ${draft.route === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}</select>
        <label class="community-consent"><input type="checkbox" id="community-consent" /><span>内容是我的真实记录，照片有权分享；不包含他人的证件、联系方式等隐私。</span></label>
        <p class="community-error" id="community-error" role="alert"></p><p class="community-save-state" id="community-save-state" role="status">草稿仅保存在此浏览器</p>
        <div class="community-editor-actions"><button type="submit" class="community-button is-primary">提交审核</button><p>通过审核后公开，可在“我的游记”查看进度。<br>当前仅体验投稿状态，未发送给团队。</p></div></form></div></section>`;
    } else {
      const post = database.get(id);
      if (!post) { container.innerHTML = `<section class="screen is-active community-screen">${bar('游记')}<div class="community-empty"><h1>这篇游记暂时不可用</h1><p>可能已移入回收站，或不在当前浏览器。</p>${button('feed','回到社区',true)}</div></section>`; return; }
      const activity = database.activity(id), published = post.status === 'published';
      if (!profile) activity.comments = [];
      container.innerHTML = `<section class="screen is-active community-screen community-detail">${bar('旅途游记', published ? '<button data-cm="report">反馈</button>' : '')}
        ${!published ? `<div class="community-review-state"><span>${post.status === 'pending' ? '○' : '✎'}</span><div><strong>${labels[post.status]}</strong><p>${post.status === 'pending' ? '投稿状态已保存在本地；尚未接入团队审核。' : '还没写完也没关系，随时回来继续。'}</p></div></div>` : ''}
        ${post.photos.length ? `<div class="community-photo-rail" aria-label="游记照片">${post.photos.map((photo, i) => `<figure><img src="${escape(photo)}" alt="${escape(post.title)}，照片 ${i + 1}" loading="${i ? 'lazy' : 'eager'}" /><figcaption>${i + 1} / ${post.photos.length}${post.photos.length > 1 ? ' · 左右滑动看照片' : ''}</figcaption></figure>`).join('')}</div>` : ''}
        <article class="community-story"><div class="community-author"><i aria-hidden="true">${post.editorial ? '无' : escape([...post.author][0])}</i><span>${escape(post.author)}<small>${post.editorial ? '官方影像整理 · 非团友评价' : '本地体验账号'}</small></span></div><h1>${escape(post.title || '未命名草稿')}</h1><p class="community-story-body">${escape(post.body || '还没有写下正文。')}</p>
          ${post.route ? `<button class="community-related-route" data-action="route" data-route="${post.route}" data-origin="${escape(page)}"><span><small>这篇游记关联的路线</small><strong>${escape(routes[post.route].name)}</strong><span>查看行程与团期</span></span>${icon('arrow')}</button>` : ''}
          ${published ? `<div class="community-interactions"><button data-cm="like" aria-pressed="${activity.liked}">${icon(activity.liked ? 'heartOn' : 'heart')}${activity.liked ? '已喜欢' : '喜欢'}</button><button data-cm="save-post" aria-pressed="${activity.saved}"><span aria-hidden="true">${activity.saved ? '★' : '☆'}</span>${activity.saved ? '已收藏' : '收藏'}</button></div><section class="community-comments"><h2>聊聊这段旅途</h2><p>友善交流，留言审核通过后公开。</p>${activity.comments.map(c => `<div class="community-comment"><strong>${escape(c.author)}</strong><small>待审核 · 仅自己可见</small><p>${escape(c.body)}</p></div>`).join('')}${!activity.comments.length ? '<p class="community-comment-empty">还没有公开留言，写下你的第一句吧。</p>' : ''}<form id="community-comment-form"><label for="community-comment">我的留言</label><textarea id="community-comment" maxlength="300" rows="3" placeholder="想问问路线，也可以分享你的感受">${escape(commentText)}</textarea><button class="community-button" type="submit">提交留言</button></form></section>` : `<div class="community-owner-actions">${button(post.status === 'draft' ? 'edit' : 'withdraw', post.status === 'draft' ? '继续编辑' : '撤回并编辑', true)}${button('remove','移入回收站')}</div>`}
        ${previewNote}<p class="community-error" id="community-error" role="alert"></p></article></section>`;
    }
    window.scrollTo({ top, behavior: 'instant' });
  }
  async function persistDraft() {
    if (!draft || !dirty) return;
    clearTimeout(timer);
    const snapshot = structuredClone(draft);
    status('正在保存草稿…');
    try {
      const saved = await database.saveDraft(snapshot, profile);
      if (disposed) return;
      draft.id = saved.id;
      dirty = draft.title !== snapshot.title || draft.body !== snapshot.body || draft.route !== snapshot.route || JSON.stringify(draft.photos) !== JSON.stringify(snapshot.photos);
      status(dirty ? '正在保存新的修改…' : '草稿已保存到此浏览器');
      if (dirty) timer = setTimeout(() => persistDraft().catch(() => {}), 500);
    } catch (error) { status('草稿尚未保存'); message(error.message); throw error; }
  }
  function scheduleSave() { dirty = true; status('有未保存的修改'); clearTimeout(timer); timer = setTimeout(() => persistDraft().catch(() => {}), 600); }
  function dialog(title, content) {
    const element = document.createElement('dialog'); element.className = 'community-dialog'; element.setAttribute('aria-labelledby','community-dialog-title');
    element.innerHTML = `<h2 id="community-dialog-title">${title}</h2>${content}<button class="community-button" data-cm="close-dialog">取消</button>`;
    container.append(element); element.addEventListener('close', () => element.remove()); element.showModal();
  }
  async function click(event) {
    const target = event.target.closest('[data-cm]');
    if (!target || busy) return;
    const action = target.dataset.cm;
    try {
      if (action === 'back' && !database) { go('home'); return; }
      requireAvailable();
      if (action === 'back') {
        if (uploading) return message('照片正在处理，请稍等');
        if (mode === 'compose') { await persistDraft(); go('community-mine'); }
        else go(mode === 'feed' ? feed.returnTo : mode === 'trash' ? 'community-mine' : mode === 'post' ? postReturn : 'community');
      }
      if (action === 'feed') go('community');
      if (action === 'close-dialog') container.querySelector('dialog')?.close();
      if (action === 'mine') { if (auth()) go('community-mine'); }
      if (action === 'trash') go('community-trash');
      if (action === 'scope') { if (target.dataset.value === 'saved' && !auth()) return; feed.scope = target.dataset.value; draw(); }
      if (action === 'post') { if (mode === 'feed') feed.top = window.scrollY; postReturn = mode === 'mine' ? 'community-mine' : 'community'; go(`community-post/${target.dataset.id}`); }
      if (action === 'write') {
        if (!auth()) return;
        busy = true;
        const post = await database.saveDraft({ ...blank(), route: feed.route }, profile);
        if (!disposed) go(`community-compose/${post.id}`);
      }
      if (action === 'save') { await persistDraft(); toast('草稿已保存到此浏览器'); }
      if (action === 'remove-photo' || action === 'cover') {
        if (uploading) return;
        const index = Number(target.dataset.index);
        if (action === 'remove-photo') draft.photos.splice(index, 1);
        else draft.photos.unshift(...draft.photos.splice(index, 1));
        container.querySelector('#community-photo-grid').innerHTML = editorPhotos(); container.querySelector('#community-photo-count').textContent = `${draft.photos.length} / 6`; scheduleSave();
      }
      if (action === 'edit') go(`community-compose/${id}`);
      if (action === 'withdraw') dialog('撤回这篇投稿？', '<p>撤回后回到草稿，修改完成后需要重新提交审核。</p>' + button('confirm-withdraw','撤回并编辑',true));
      if (action === 'confirm-withdraw') { busy = true; await database.withdraw(id, profile); if (!disposed) go(`community-compose/${id}`); }
      if (action === 'remove') dialog('移入回收站？', '<p>游记不会被永久删除，可从“我的游记”的回收站恢复为草稿。</p>' + button('confirm-remove','确认移入',true));
      if (action === 'confirm-remove') { busy = true; await database.remove(id, profile); if (!disposed) go('community-mine'); }
      if (action === 'restore') { busy = true; await database.restore(target.dataset.id, profile); if (!disposed) { draw(); toast('已恢复为草稿，可在我的游记继续编辑'); } }
      if (action === 'like' || action === 'save-post') {
        if (!auth()) return;
        busy = true; await database.toggle(id, action === 'like' ? 'liked' : 'saved', profile); draw();
      }
      if (action === 'report') {
        if (!auth()) return;
        dialog('反馈这篇游记', '<p>当前仅保存在本地，不会发送给团队。</p><label for="community-report">反馈原因</label><select id="community-report"><option>侵权或隐私</option><option>广告或无关内容</option><option>不友善或不实内容</option></select>' + button('confirm-report','保存反馈',true));
      }
      if (action === 'confirm-report') { busy = true; await database.report(id, container.querySelector('#community-report').value, profile); if (!disposed) { container.querySelector('dialog').close(); toast('反馈已保存在本地，未发送给团队'); } }
    } catch (error) { message(error.message); }
    finally { busy = false; }
  }
  function input(event) {
    if (event.target.id === 'community-comment') commentText = event.target.value;
    if (mode !== 'compose' || !['title','body','route'].includes(event.target.name)) return;
    draft[event.target.name] = event.target.value;
    const counter = container.querySelector(`#community-${event.target.name}-count`);
    if (counter) counter.textContent = `${event.target.value.length} / ${COMMUNITY_LIMITS[event.target.name]}`;
    event.target.removeAttribute('aria-invalid'); message(''); scheduleSave();
  }
  async function change(event) {
    if (event.target.id === 'community-route') { feed.route = event.target.value; draw(); }
    if (event.target.id !== 'community-photos' || !event.target.files.length || uploading || busy) return;
    const files = [...event.target.files]; event.target.value = '';
    if (files.length + draft.photos.length > COMMUNITY_LIMITS.photos) return message('最多添加 6 张照片，请减少选择数量');
    uploading = true; event.target.disabled = true; status('正在处理照片…');
    try {
      const added = [];
      for (const file of files) added.push(await photoData(file));
      if (disposed) return;
      draft.photos.push(...added); container.querySelector('#community-photo-grid').innerHTML = editorPhotos(); container.querySelector('#community-photo-count').textContent = `${draft.photos.length} / 6`; message(''); scheduleSave();
    } catch (error) { message(error.message); status('照片未添加，原有内容保留'); }
    finally { uploading = false; event.target.disabled = false; }
  }
  async function submit(event) {
    if (!['community-post-form','community-comment-form'].includes(event.target.id)) return;
    event.preventDefault();
    if (busy || uploading) { message('正在处理，请稍等'); return; }
    if (!auth()) return;
    busy = true;
    const submitButton = event.target.querySelector('[type="submit"]'); submitButton.disabled = true;
    const editorFields = [...container.querySelectorAll('.community-editor input, .community-editor textarea, .community-editor select')];
    try {
      if (mode === 'compose') {
        const errors = postErrors(draft, true);
        for (const name of ['title','body']) container.querySelector(`#community-${name}`).setAttribute('aria-invalid', String(Boolean(errors[name])));
        if (Object.keys(errors).length) { container.querySelector(`#community-${Object.keys(errors)[0]}`)?.focus(); throw new Error(Object.values(errors)[0]); }
        const consent = container.querySelector('#community-consent').checked;
        if (!consent) { container.querySelector('#community-consent').focus(); throw new Error('请先确认内容真实且照片有权分享'); }
        editorFields.forEach(field => { field.disabled = true; });
        clearTimeout(timer);
        await persistDraft(); await database.submit(draft.id, profile, consent);
        if (!disposed) { go(`community-post/${draft.id}`); toast('投稿状态已保存为待审核，仅自己可见'); }
      } else {
        await database.comment(id, commentText, profile); commentText = ''; draw(); toast('留言已保存为待审核，尚未发送给团队');
      }
    } catch (error) { message(error.message); }
    finally { busy = false; submitButton.disabled = false; editorFields.forEach(field => { field.disabled = false; }); }
  }
  const beforeUnload = event => { if (dirty || uploading) { event.preventDefault(); event.returnValue = ''; } };
  container.addEventListener('click', click); container.addEventListener('input', input); container.addEventListener('change', change); container.addEventListener('submit', submit); window.addEventListener('beforeunload', beforeUnload);
  container.innerHTML = `<section class="screen is-active community-screen">${bar('团友社区')}<p class="community-loading" role="status">正在打开旅途故事…</p></section>`;
  store().then(async value => {
    if (disposed) return;
    database = value;
    if (['compose','mine','trash'].includes(mode) && !auth()) return;
    if (mode === 'post' && database.get(id) && !database.get(id).editorial && !auth()) return;
    if (mode === 'compose') {
      draft = database.get(id);
      if (!draft || draft.editorial || draft.status !== 'draft') { go(draft ? `community-post/${draft.id}` : 'community-mine'); return; }
    }
    draw();
    window.scrollTo({ top: mode === 'feed' ? feed.top : 0, behavior: 'instant' });
  }).catch(error => { if (!disposed) container.innerHTML = `<section class="screen is-active community-screen">${bar('团友社区')}<div class="community-empty"><h1>社区暂时没有打开</h1><p role="alert">${escape(error.message)}</p><button class="community-button is-primary" data-go="community">重新加载</button></div></section>`; });
  return () => {
    if (dirty && database) persistDraft().catch(() => toast('草稿保存失败，请重新打开游记检查'));
    disposed = true; clearTimeout(timer); container.querySelector('dialog')?.close();
    container.removeEventListener('click', click); container.removeEventListener('input', input); container.removeEventListener('change', change); container.removeEventListener('submit', submit); window.removeEventListener('beforeunload', beforeUnload);
  };
}
