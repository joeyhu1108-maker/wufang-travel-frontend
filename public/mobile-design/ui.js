import { routes, departures, money, normalizeSearch, firstDeparture } from './data.mjs';
import { icon as dsIcon, brandLogo, heroHeader as dsHeroHeader, navMarkup as dsNavMarkup } from './components.mjs';
import { mountExplore } from './explore.mjs';
import { showOpening } from './opening.mjs';
import { companionsTeaser, companionsPage, routeCompanions, companionViewer } from './companions.mjs';
import { itineraryPanel } from './itinerary.mjs';
import { accountHeader, mountAuth, readDemoProfile, clearDemoProfile } from './auth-demo.mjs';
import { checkoutPage, paymentResultPage, orderPage, orderCard, remainingTime } from './commerce.mjs';
import { createPaymentFlow, createDemoPaymentAdapter } from './payment-flow.mjs';
import { groupFilters, emptyGroupFilters, quickGroups, groupResults, groupBooking, departureCard, groupFilterSheet } from './group-picker.mjs';
import { createBookingDetails, blankTraveler, demoTraveler, travelerErrors, identityInfo, bookingError } from './booking-model.mjs';
import { calendarPage, travelersPage, travelerEditor, reviewBookingPage, guidePage, policiesContent, documentsPage, documentPage, signaturePage, mountSignature, refundPage } from './booking-views.mjs';
import { communityEntry, filterCommunity, mountCommunity } from './community.mjs';

const app = document.querySelector('#app');
const nav = document.querySelector('.bottom-nav');
const sheet = document.querySelector('#sheet');
const toastEl = document.querySelector('#toast');
let account = readDemoProfile();
const paymentAdapter = createDemoPaymentAdapter();
const paymentFlow = createPaymentFlow(paymentAdapter);
let submittingOrder = false, paying = false;
let signaturePad = null;
let cleanupExplore = null;
let cleanupCommunity = null;
document.querySelector('.rail-brand').innerHTML = brandLogo();
const state = { route: 'ali', date: '2026-09-22', month: 9, people: 1, tab: 'story', group: emptyGroupFilters(), query: '', search: { query: '', date: '', people: 1 }, searchDraft: null, saved: [], order: null, booking: createBookingDetails(), bookingAgreed: false, documentKind: 'contract', refundSelection: [] };
let listPosition = { top: 0, rails: {}, quick: 0 };
const pageFromHash = () => (location.hash.slice(1) || 'home').replace('route-detail', 'detail').replace('route-list', 'list');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const icon = dsIcon;
const route = () => routes[state.route];
const dateLabel = date => date ? `${date.slice(5, 7)} 月 ${date.slice(8)} 日` : '尚未选择';
function go(page) { if(sheet.open) closeSheet(); const hash = page === 'detail' ? 'route-detail' : page; if(location.hash.slice(1) === hash) render(); else location.hash = hash; }
function showToast(text) { toastEl.textContent = text; toastEl.classList.add('is-visible'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toastEl.classList.remove('is-visible'), 2200); }
function openSheet(content) {
  stopSheetMedia();
  const contentEl = document.querySelector('#sheet-content');
  contentEl.innerHTML = content;
  const title = contentEl.querySelector('h2');
  title.id = 'sheet-title'; title.tabIndex = -1;
  contentEl.querySelector('.close-sheet')?.setAttribute('aria-label', '关闭弹层');
  if (!sheet.open) sheet.showModal();
  sheet.scrollTop = 0;
  title.focus({ preventScroll: true });
}
function stopSheetMedia() {
  sheet.querySelectorAll('video').forEach(video => { video.pause(); video.removeAttribute('src'); video.load(); });
  sheet.classList.remove('is-companion-viewer');
}
function closeSheet() { state.searchDraft = null; stopSheetMedia(); if(sheet.open) sheet.close(); }
const heroHeader = dsHeroHeader;
const navMarkup = dsNavMarkup;
function render() {
  cleanupCommunity?.(); cleanupCommunity = null;
  cleanupExplore?.(); cleanupExplore = null;
  signaturePad?.destroy(); signaturePad = null;
  if (sheet.open) closeSheet();
  const page = pageFromHash();
  if (page !== 'list' && app.querySelector('.group-screen')) {
    listPosition = { top: window.scrollY, quick: app.querySelector('.group-quick').scrollLeft, rails: Object.fromEntries([...app.querySelectorAll('[data-rail]')].map(el => [el.dataset.rail, el.scrollLeft])) };
  }
  if (page === 'auth') {
    nav.classList.add('is-hidden');
    mountAuth(app, { onBack: () => { const back = state.authReturn ? 'community' : 'mine'; state.authReturn = null; go(back); }, onComplete: (profile, mode) => { account = profile; const back = state.authReturn || 'mine'; state.authReturn = null; go(back); showToast(mode === 'register' ? '已完成注册体验，欢迎来到无方' : '已登录演示账号'); } });
    window.scrollTo({ top: 0, behavior: 'instant' });
    return;
  }
  if (page === 'companions') {
    app.innerHTML = companionsPage(state.companionsOrigin || 'home');
    nav.classList.add('is-hidden');
    window.scrollTo({ top: 0, behavior: 'instant' });
    return;
  }
  if (page.startsWith('community')) {
    nav.innerHTML = navMarkup(page === 'community-mine' || page === 'community-trash' ? 'mine' : 'home');
    nav.classList.toggle('is-hidden', page.startsWith('community-post/') || page.startsWith('community-compose/'));
    cleanupCommunity = mountCommunity(app, { page, profile: account, go, login: back => { state.authReturn = back; go('auth'); }, toast: showToast });
    window.scrollTo({ top: 0, behavior: 'instant' });
    return;
  }
  if (['checkout', 'result', 'order', 'documents', 'document', 'signature', 'refund'].includes(page) && !state.order) { go('mine'); return; }
  if (state.order) state.order = { ...state.order, ...paymentAdapter.listOrders().find(order => order.id === state.order.id) };
  if (page === 'checkout' && state.order.status !== 'pending') { go('order'); return; }
  if (page === 'result' && ['cancelled', 'refunded'].includes(state.order.status)) { go('order'); return; }
  if (page === 'review' && (state.booking.travelers.length !== state.people || state.booking.travelers.some(p => Object.keys(travelerErrors(p)).length))) { go('traveler'); return; }
  if (['documents', 'document', 'refund'].includes(page) && !['paid', 'refunded'].includes(state.order.status)) { go('order'); return; }
  if (page === 'signature' && (state.order.status !== 'paid' || !state.documentAgreed)) { go('document'); return; }
  if (page === 'home') renderHome();
  else if (page === 'explore') mountExplore(app);
  else if (page === 'explore-roam') cleanupExplore = mountExplore(app, 'route');
  else if (page === 'explore-weather') mountExplore(app, 'weather');
  else if (page === 'list') renderList();
  else if (page === 'detail') renderDetail();
  else if (page === 'booking') renderBooking();
  else if (page === 'traveler') renderTraveler();
  else if (page === 'review') renderReview();
  else if (page === 'checkout') app.innerHTML = checkoutPage(state.order);
  else if (page === 'result') app.innerHTML = paymentResultPage(state.order);
  else if (page === 'order') app.innerHTML = orderPage(state.order);
  else if (page === 'guide') { const context = state.guideContext || { route: state.route, date: state.date }; app.innerHTML = guidePage(routes[context.route], context.date, state.serviceBack || 'order'); }
  else if (page === 'documents') app.innerHTML = documentsPage(state.order);
  else if (page === 'document') app.innerHTML = documentPage(state.order, state.documentKind);
  else if (page === 'signature') { app.innerHTML = signaturePage(); signaturePad = mountSignature(app.querySelector('#signature-canvas')); }
  else if (page === 'refund') renderRefund();
  else renderMine();
  nav.innerHTML = navMarkup(page); nav.classList.toggle('is-hidden', !['home','list','explore','mine'].includes(page));
  if (['checkout', 'result', 'order'].includes(page)) { const heading = app.querySelector('h1'); heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  if (page === 'mine') {
    app.querySelector('.saved-section').insertAdjacentHTML('afterend', `<div class="mine-companions"><button class="companion-link" data-action="companions">与无方同行 · 旅途里的我们 ${icon('arrow')}</button></div>`);
  }
  window.scrollTo({ top: page === 'list' ? listPosition.top : 0, behavior: 'instant' });
  if (page === 'list') {
    app.querySelector('.group-quick').scrollLeft = listPosition.quick;
    app.querySelectorAll('[data-rail]').forEach(el => { el.scrollLeft = listPosition.rails[el.dataset.rail] || 0; });
  }
}
function renderHome() {
  app.innerHTML = `<section class="screen is-active home-screen">
    <header class="home-header">
      <div class="home-identity">${brandLogo()}</div>
      <button class="home-search" data-action="search" aria-label="搜索路线">${icon('search')}</button>
    </header>
    <div class="home-opening">
      <p class="home-signature">有人托底的自由旅行</p>
      <h1>把远方，<br>走成自己的路。</h1>
    </div>
    <figure class="home-landscape">
      <img src="../media/route-ali-hero.jpg" alt="阿里湖岸，一位旅人走在雪山与湖水之间" width="1200" height="1000" fetchpriority="high" decoding="async" />
      <figcaption>西藏 · 阿里</figcaption>
    </figure>
    <div class="home-content">
      <button class="home-explore" data-go="list">探索路线 ${icon('arrow')}</button>
      ${communityEntry()}
      <section class="home-journeys" aria-labelledby="home-routes-title">
        <div class="home-section-heading"><h2 id="home-routes-title">选一程，去西藏。</h2><span>参考价</span></div>
        ${Object.values(routes).map(r => `<button class="home-route" data-route="${r.id}" data-action="route" aria-label="查看${r.name}，${r.days}天，${money(r.price)}每人起">
          <img src="../media/${r.id === 'ali' ? 'region-ali-terrain.jpg' : r.image}" alt="" width="80" height="100" loading="lazy" decoding="async" />
          <span class="home-route-copy"><span class="home-route-meta">${r.days} 天 · ${r.tags[0]}</span><strong>${r.name}</strong><span class="home-route-price">${money(r.price)} <span>/ 人起</span></span></span>
          ${icon('arrow')}
        </button>`).join('')}
      </section>
      ${companionsTeaser()}
      <button class="home-journal" data-action="journal"><span>出发前，读一页旅途</span>${icon('arrow')}</button>
      <button class="home-film-link" data-action="opening"><span>无方与西藏的故事</span>${icon('arrow')}</button>
    </div>
  </section>`;
}
function renderList() {
  state.search = normalizeSearch({ ...state.search, query: state.query, people: state.people });
  const items = groupResults(state.group, state.search);
  const active = Object.values(state.group).some(value => value !== 'all') || state.query || state.people !== 1;
  app.innerHTML = `<section class="screen is-active group-screen">
    <header class="group-header">${brandLogo()}<h1>选团助手</h1><button data-action="search" aria-label="搜索路线与同行人数">${icon('search')}</button></header>
    <div class="group-tools"><div class="group-filter-bar" aria-label="筛选路线">${Object.entries(groupFilters).map(([key, filter]) => `<button data-action="group-filter" data-key="${key}" class="${state.group[key] !== 'all' ? 'is-set' : ''}" aria-label="${filter.label}${state.group[key] !== 'all' ? '：' + filter.options.find(([value]) => value === state.group[key])[1] : ''}" aria-haspopup="dialog" aria-expanded="false">${filter.label}<span class="group-chevron" aria-hidden="true"></span></button>`).join('')}</div>
      <div class="group-quick" aria-label="快捷筛选">${quickGroups.map(([key, value, label]) => `<button data-action="group-quick" data-key="${key}" data-value="${value}" aria-pressed="${state.group[key] === value}">${label}</button>`).join('')}</div>
    </div>
    ${state.query || state.people !== 1 ? `<div class="group-search-summary"><span>${escape(state.query) || '全部路线'} · ${state.people} 位旅人</span><button data-action="group-clear-query" aria-label="清除关键词和人数条件">${icon('close')}</button></div>` : ''}
    <div class="group-summary"><p role="status">${items.length} 条路线 · ${items.reduce((n, item) => n + item.dates.length, 0)} 个团期</p>${active ? '<button data-action="clear-search">清除筛选</button>' : '<span>左右滑动选团期</span>'}</div>
    <div class="group-cards">${items.length ? items.map(item => departureCard(item, state.saved.includes(item.route.id))).join('') : '<div class="group-empty"><h2>暂时没有合适的团期</h2><p>试试其他日期、人数或玩法，<br>也许下一程就在这里。</p><button data-action="clear-search">查看全部团期</button></div>'}</div>
    <p class="group-footnote">参考团期与余位 · 以无方最终确认为准<br>抵达日另列，完整安排请查看路线详情</p>
  </section>`;
}
function refreshGroups(focusSelector) {
  const quick = app.querySelector('.group-quick')?.scrollLeft || 0;
  listPosition = { top: 0, rails: {}, quick };
  renderList();
  app.querySelector('.group-quick').scrollLeft = quick;
  window.scrollTo({ top: Math.min(window.scrollY, app.querySelector('.group-tools').offsetTop), behavior: 'instant' });
  app.querySelector(focusSelector)?.focus({ preventScroll: true });
}
function renderDetail() {
  const r = route(); const tabs = [['story','这一路'],['days','逐日行程'],['notes','出发前']];
  app.innerHTML = `<section class="screen is-active detail-screen"><div class="detail-visual"><img src="../media/${r.image}" alt="${r.alt}" /><div class="detail-visual-fade"></div>${heroHeader(state.detailOrigin || 'list')}<div class="detail-heading"><span class="eyebrow light">${r.latin} · ${r.days} DAYS</span><h1>${r.name}</h1><p>${r.summary}</p></div></div><div class="detail-content"><div class="detail-price"><div><span class="eyebrow">FROM</span><span class="price-line"><strong>${money(r.price)}</strong><small>/ 人起</small></span></div><span class="status-dot">可咨询团期</span></div><div class="detail-tabs">${tabs.map(([v,t]) => `<button class="${state.tab === v ? 'is-active' : ''}" data-tab="${v}" aria-pressed="${state.tab === v}">${t}</button>`).join('')}</div>${detailPanel(r)}<div class="detail-actions"><button class="outline-button" data-action="save" data-route="${r.id}" aria-pressed="${state.saved.includes(r.id)}">${state.saved.includes(r.id) ? icon('heartOn') + ' 已收藏' : icon('heart') + ' 收藏'}</button><button class="primary-button" data-go="booking">查看团期 ${icon('arrow')}</button></div></div><div class="detail-sticky"><div class="sticky-price"><small>参考价</small><span><b>${money(r.price)}</b><i>/ 人起</i></span></div><button data-go="booking">选一个团期 ${icon('arrow')}</button></div></section>`;
  app.querySelector('.place-quote')?.insertAdjacentHTML('beforebegin', routeCompanions(r.id));
  app.querySelector('.detail-actions').insertAdjacentHTML('beforebegin', communityEntry(r.id));
}
function detailPanel(r) {
  if (state.tab === 'days') return itineraryPanel(r);
  if (state.tab === 'notes') return `<div class="notes-list"><div><i>01</i><b>费用先说清楚</b><p>这里展示参考价与路线信息，住宿、用车、门票、餐食及退改边界需要在出发前逐项确认。</p></div><div><i>02</i><b>高原出行要留余地</b><p>移动端只做信息整理，不替代身体评估或医疗建议；转山安排需要单独沟通。</p></div><div><i>03</i><b>把问题带上路</b><p>如果还没决定，可以先咨询，不需要在页面里直接购买。</p></div></div>`;
  return `<div class="story-panel"><div class="route-fact-row"><div><b>${r.days}</b><span>天行程</span></div><div><b>拉萨</b><span>集合与返程</span></div><div><b>${r.category === 'trek' ? '徒步' : '公路'}</b><span>行走方式</span></div></div><p class="lead-copy">${r.story}</p><div class="place-quote"><span>“</span><p>路不是把你送到某个地方。<br>路本身，就是这次旅行。</p><small>WUFANG TRAVEL / NOTE 01</small></div><div class="detail-links"><button data-action="fees">费用与边界 ${icon('arrow')}</button><button data-action="buddy">想找搭子？ ${icon('arrow')}</button></div></div>`;
}
function renderBooking() {
  app.innerHTML = calendarPage(state);
}
function renderTraveler() {
  app.innerHTML = travelersPage(state);
  app.querySelector('#emergency-form').addEventListener('input', e => { state.booking[e.target.name] = e.target.value; state.bookingAgreed = false; app.querySelector('#travelers-error').textContent = ''; });
}
function renderReview() {
  app.innerHTML = reviewBookingPage(state);
  app.querySelector('#agree').addEventListener('change', e => { state.bookingAgreed = e.target.checked; });
  app.querySelector('#booking-options').addEventListener('input', e => {
    app.querySelector('#booking-error').textContent = '';
    if (['room', 'roommate', 'note'].includes(e.target.name)) state.booking[e.target.name] = e.target.value;
    if (e.target.name === 'room') app.querySelector('#roommate-field').hidden = e.target.value !== 'friend';
  });
}
function openTravelerEditor(index = -1, increasePeople = false) {
  const person = index < 0 ? blankTraveler() : { ...state.booking.travelers[index] };
  openSheet(travelerEditor(person, index >= 0));
  const form = sheet.querySelector('#person-form');
  form.addEventListener('input', e => {
    form.querySelector('#person-error').textContent = '';
    e.target.removeAttribute('aria-invalid');
    if (e.target.name === 'document' && form.elements.documentType.value === 'id') {
      const info = identityInfo(form.elements.document.value);
      if (info) { form.elements.birthday.value = info.birthday; form.elements.gender.value = info.gender; }
    }
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    values.name = values.name.trim(); values.document = values.document.trim().toUpperCase();
    const errors = travelerErrors(values);
    for (const name of ['name','documentType','document','gender','birthday','phone']) form.elements[name].setAttribute('aria-invalid', String(Boolean(errors[name])));
    const duplicate = state.booking.travelers.some((p, i) => i !== index && p.document.toUpperCase() === values.document);
    const message = Object.values(errors)[0] || (duplicate ? '该证件已添加，请勿重复添加' : '');
    form.querySelector('#person-error').textContent = message;
    if (message) { form.elements[Object.keys(errors)[0] || 'document'].focus(); return; }
    if (index < 0) { state.booking.travelers.push(values); if (increasePeople) state.people++; }
    else state.booking.travelers[index] = values;
    state.bookingAgreed = false; closeSheet(); renderTraveler();
  });
}
function renderRefund() {
  app.innerHTML = refundPage(state.order, state.refundSelection || []);
  app.querySelectorAll('[data-refund-person]').forEach(input => input.addEventListener('change', () => {
    const top = window.scrollY;
    state.refundSelection = [...app.querySelectorAll('[data-refund-person]:checked')].map(el => Number(el.dataset.refundPerson));
    renderRefund(); window.scrollTo({ top, behavior: 'instant' });
    app.querySelector('[data-refund-person="' + input.dataset.refundPerson + '"]')?.focus({ preventScroll: true });
  }));
}
function bookingServicesContext() {
  return ['order','result','checkout','documents','document','signature','refund'].includes(pageFromHash()) && state.order
    ? { route: state.order.route, date: state.order.date } : { route: state.route, date: state.date };
}
function renderMine() {
  const saved = state.saved.map(id => routes[id]);
  app.innerHTML = `<section class="screen is-active mine-screen">
    <div class="mine-top"><div class="eyebrow">MY JOURNEY</div><button class="circle-button" data-action="share" aria-label="分享无方旅行">${icon('share')}</button></div>
    ${accountHeader(account)}
    <div class="mine-community"><button data-action="my-community">我的游记与草稿 ${icon('arrow')}</button><button data-action="community">去团友社区看看 ${icon('arrow')}</button></div>
    ${paymentAdapter.listOrders().length ? paymentAdapter.listOrders().map(order => `<div class="mine-order">${orderCard(order)}</div>`).join('') : `<div class="mine-empty"><span>⌁</span><h2>还没有行程</h2><p>收藏一条路线，或从团期开始计划。</p><button class="outline-button" data-go="list">看看路线 ${icon('arrow')}</button></div>`}
    <div class="saved-section"><div class="section-label"><span>收藏的路线</span><small>${saved.length} 条</small></div>${saved.length ? saved.map(r => `<button class="saved-row" data-route="${r.id}" data-action="route"><img src="../media/${r.image}" alt="" /><div><b>${r.name}</b><span>${r.days} 天 · ${money(r.price)} / 人起</span></div><i>${icon('arrow')}</i></button>`).join('') : '<p class="muted-copy">还没有收藏。喜欢的路线可以先留在这里。</p>'}</div>
  </section>`;
}
async function action(type, el) {
  if (type === 'community') { filterCommunity(el.dataset.communityRoute || '', pageFromHash()); go('community'); }
  if (type === 'my-community') { if (account) go('community-mine'); else { state.authReturn = 'community-mine'; go('auth'); } }
  if (type === 'order-open') { state.order = await paymentAdapter.queryOrder(el.dataset.id); go('order'); }
  if (type === 'toggle-calendar') { state.calendarExpanded = !(state.calendarExpanded ?? state.bookingOrigin !== 'list'); renderBooking(); }
  if (type === 'enrollment-notice') openSheet(sheetContent('出发前，先确认', '<p>抵达日另列；集合时间、大交通与具体安排请在预订前确认。接下来可以使用虚构资料体验报名流程。</p><button class="commerce-pay" data-go="traveler">了解，填写出行人</button><button class="commerce-secondary" data-action="close">再看看团期</button>'));
  if (type === 'add-traveler' && state.booking.travelers.length < state.people) openTravelerEditor();
  if (type === 'edit-traveler') openTravelerEditor(Number(el.dataset.index));
  if (type === 'more-traveler' && state.people < departures[state.date]) openTravelerEditor(-1, true);
  if (type === 'remove-traveler') { state.booking.travelers.splice(Number(el.dataset.index), 1); state.bookingAgreed = false; renderTraveler(); }
  if (type === 'demo-travelers') {
    state.booking.travelers = Array.from({ length: state.people }, (_, i) => demoTraveler(i));
    state.booking.emergencyName = '演示联系人'; state.booking.emergencyPhone = '13800000000'; state.bookingAgreed = false; renderTraveler();
  }
  if (type === 'review-booking') {
    const message = bookingError({ ...state.booking, room: 'random', coupon: '' }, state.people);
    if (message) { app.querySelector('#travelers-error').textContent = message; app.querySelector('#travelers-error').scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    else go('review');
  }
  if (type === 'apply-coupon') {
    const code = app.querySelector('[name="couponInput"]').value.trim().toUpperCase();
    if (code && code !== 'DEMO100') { app.querySelector('#coupon-message').textContent = '优惠码无效，演示可使用 DEMO100；原有优惠未改变。'; return; }
    state.booking.coupon = code; state.bookingAgreed = false;
    const top = window.scrollY; renderReview(); window.scrollTo({ top, behavior: 'instant' });
    showToast(code ? '已应用演示优惠 ¥100' : '已移除优惠码');
  }
  if (type === 'guide') { state.guideContext = bookingServicesContext(); state.serviceBack = pageFromHash(); go('guide'); }
  if (type === 'guide-anchor') app.querySelector('#guide-' + el.dataset.section)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  if (type === 'advisor') openSheet(sheetContent('出发前，有人回应', '<p>这里是无方顾问与出行群的服务入口。正式联系方式和群二维码尚未接入；当前不会添加联系人或向团队发消息。</p><div class="flow-section"><h3>无方旅行顾问</h3><p>团期确认、住宿与拼房、出行准备</p><button class="commerce-pay" data-action="demo-contact">体验联系顾问</button><button class="commerce-secondary" data-action="demo-group">体验查看出行群</button></div>'));
  if (type === 'demo-contact' || type === 'demo-group') openSheet(sheetContent(type === 'demo-contact' ? '顾问联系入口' : '出行群入口', '<p>入口体验已完成。正式版本将展示甲方提供的联系方式或有效群二维码，此处不生成虚构二维码，也没有发送任何消息。</p><button class="commerce-pay" data-action="close">返回旅程</button>'));
  if (type === 'documents') go('documents');
  if (type === 'document') { state.documentKind = el.dataset.kind; state.documentAgreed = false; go('document'); }
  if (type === 'start-signature') { if (!app.querySelector('#document-agree').checked) { showToast('请先阅读并确认样张说明'); app.querySelector('#document-agree').focus(); return; } state.documentAgreed = true; go('signature'); }
  if (type === 'clear-signature') signaturePad?.clear();
  if (type === 'demo-signature') signaturePad?.demo();
  if (type === 'save-signature') {
    el.disabled = true;
    try { state.order = await paymentAdapter.signDocument(state.order.id, state.documentKind, signaturePad.get()); state.documentAgreed = false; go('document'); showToast('签名演示已保存，未形成正式合同'); }
    catch (error) { app.querySelector('#signature-error').textContent = error.message; el.disabled = false; }
  }
  if (type === 'refund') { state.refundSelection = []; go('refund'); }
  if (type === 'request-refund' && state.refundSelection.length) openSheet(sheetContent('确认提交退款申请？', `<p>本次选择 ${state.refundSelection.length} 位出行人。这里只演示提交与处理状态，不会发起真实退款。</p><button class="commerce-pay" data-action="confirm-refund">确认提交演示申请</button><button class="commerce-secondary" data-action="close">暂不申请</button>`));
  if (type === 'confirm-refund' || type === 'complete-demo-refund') {
    el.disabled = true;
    try { state.order = type === 'confirm-refund' ? await paymentAdapter.requestRefund(state.order.id, state.refundSelection) : await paymentAdapter.completeDemoRefund(state.order.id); state.refundSelection = []; closeSheet(); go(type === 'confirm-refund' ? 'refund' : 'order'); showToast(type === 'confirm-refund' ? '已记录演示申请' : '退款演示完成，没有资金流转'); }
    catch (error) { showToast(error.message); el.disabled = false; }
  }
  if (type === 'login') go('auth');
  if (type === 'logout') { account = null; clearDemoProfile(); go('mine'); showToast('已退出登录'); }
  if (type === 'companions') { state.companionsOrigin = pageFromHash(); go('companions'); }
  if (type === 'companion-media') {
    const content = companionViewer(el.dataset.media);
    if (!content) return;
    openSheet(content); sheet.classList.add('is-companion-viewer');
    const video = sheet.querySelector('video');
    if (video) {
      const error = sheet.querySelector('.companion-media-error');
      video.addEventListener('error', () => { error.hidden = false; }, { once: true });
      video.play().catch(() => { /* Native controls remain available if playback is blocked. */ });
    }
  }
  if (type === 'opening') showOpening({ replay: true });
  if (type === 'route') {
    state.detailOrigin = el.dataset.origin || (pageFromHash() === 'home' ? 'home' : 'list');
    state.route = el.dataset.route || state.route; state.tab = 'story'; state.bookingOrigin = 'detail'; state.calendarExpanded = true; state.bookingAgreed = false;
    const date = pageFromHash() === 'list' ? groupResults(state.group, state.search).find(item => item.route.id === state.route)?.dates[0] : firstDeparture({ ...state.search, people: state.people });
    if (date) { state.date = date; state.month = Number(date.slice(5, 7)); }
    go('detail');
  }
  if (type === 'search') { state.searchDraft = { ...state.search, query: state.query, people: state.people }; openSheet(`<div class="sheet-head"><div><span class="eyebrow">PLAN YOUR WAY</span><h2>先选一个方向，<br><em>再慢慢靠近。</em></h2></div><button class="close-sheet" data-action="close">${icon('close')}</button></div><label class="sheet-search">${icon('search')}<input id="sheet-query" aria-label="搜索路线关键词" maxlength="100" value="${escape(state.searchDraft.query)}" placeholder="搜索湖泊、山峰或路线" /></label><div class="search-fields"><label>出发日期<select id="sheet-date"><option value="">任意日期</option>${Object.keys(departures).map(d => `<option value="${d}" ${state.searchDraft.date === d ? 'selected' : ''}>${dateLabel(d)} · 余 ${departures[d]}</option>`).join('')}</select></label><label>同行人数<select id="sheet-people">${[1,2,3,4,5,6].map(n => `<option value="${n}" ${state.searchDraft.people === n ? 'selected' : ''}>${n} 位旅人</option>`).join('')}</select></label></div><div class="sheet-hint">先填好条件，再查看仍有余位的路线</div><div class="sheet-actions"><button class="cancel-button" data-action="close">取消</button><button class="wide-button" data-action="apply-search">查看路线 ${icon('arrow')}</button></div>`); }
  if (type === 'apply-search') { const draft = normalizeSearch({ query: document.querySelector('#sheet-query')?.value, date: document.querySelector('#sheet-date')?.value, people: document.querySelector('#sheet-people')?.value }); state.group.date = draft.date || 'all'; listPosition = { top: 0, rails: {}, quick: 0 }; state.search = draft; state.query = draft.query; state.people = draft.people; if (draft.date) { state.date = draft.date; state.month = Number(draft.date.slice(5, 7)); } closeSheet(); go('list'); }
  if (type === 'group-filter') {
    const content = groupFilterSheet(el.dataset.key, state.group);
    if (content) { el.setAttribute('aria-expanded', 'true'); openSheet(content); }
  }
  if (type === 'group-reset-one') sheet.querySelector('input[name="group-option"][value="all"]').checked = true;
  if (type === 'group-apply') {
    const key = el.dataset.key, value = sheet.querySelector('input[name="group-option"]:checked')?.value;
    if (!groupFilters[key]?.options.some(option => option[0] === value)) return;
    state.group[key] = value;
    if (key === 'date') state.search.date = Object.hasOwn(departures, value) ? value : '';
    closeSheet(); refreshGroups(`[data-action="group-filter"][data-key="${key}"]`);
  }
  if (type === 'group-quick') {
    const { key, value } = el.dataset;
    state.group[key] = state.group[key] === value ? 'all' : value;
    if (key === 'date') state.search.date = '';
    refreshGroups(`[data-action="group-quick"][data-key="${key}"][data-value="${value}"]`);
  }
  if (type === 'group-clear-query') { state.query = ''; state.people = 1; refreshGroups('[data-action="search"]'); }
  if (type === 'group-book') {
    const booking = groupBooking(el.dataset.route, el.dataset.date, state.people);
    if (!booking) { showToast('当前余位不足，请调整人数或团期'); return; }
    Object.assign(state, booking); state.bookingOrigin = 'list'; state.calendarExpanded = false; state.bookingAgreed = false; go('booking');
  }
  if (type === 'group-change-date') { state.calendarExpanded = true; renderBooking(); }
  if (type === 'map') openSheet(`<div class="sheet-head"><div><span class="eyebrow">MAP VIEW</span><h2>把路线，<br><em>放回地理里。</em></h2></div><button class="close-sheet" data-action="close">${icon('close')}</button></div><div class="map-card"><div class="map-lines"></div><span class="map-label lhasa">拉萨</span><span class="map-label ali">阿里</span><span class="map-label kora">冈仁波齐</span><i class="map-pin pin-1">01</i><i class="map-pin pin-2">02</i></div><p class="sheet-copy">地图是帮助你理解距离的另一种方式。正式版本可接入路线轨迹与集合点，不替代最终行程确认。</p><button class="wide-button" data-action="close">返回列表 ${icon('arrow')}</button>`);
  if (type === 'save') {
    const id = el.dataset.route || state.route;
    state.saved = state.saved.includes(id) ? state.saved.filter(x => x !== id) : [...state.saved, id];
    const saved = state.saved.includes(id), isCard = el.classList.contains('save-button');
    el.innerHTML = icon(saved ? 'heartOn' : 'heart') + (isCard ? '' : saved ? ' 已收藏' : ' 收藏');
    el.setAttribute('aria-pressed', String(saved));
    el.setAttribute('aria-label', `${saved ? '取消收藏' : '收藏'} ${routes[id].name}`);
    showToast(saved ? '已收藏这条路线' : '已取消收藏');
  }
  if (type === 'clear-search') { state.query = ''; state.people = 1; state.search = normalizeSearch(); state.group = emptyGroupFilters(); refreshGroups('[data-action="group-filter"][data-key="date"]'); }
  if (type === 'journal') openSheet(`<div class="sheet-head"><div><span class="eyebrow">A PAGE FROM THE JOURNEY</span><h2>让意料之外<br><em>也成为旅程。</em></h2></div><button class="close-sheet" data-action="close">${icon('close')}</button></div><img class="sheet-photo" src="../media/region-kulagangri-golden.jpg" alt="金色雪峰与光线" /><p class="sheet-copy">有时我们并不是为了抵达某个地方出发。只是想在一束光落下来以前，走得再慢一点。</p><button class="wide-button" data-go="list">找一条这样的路线 ${icon('arrow')}</button>`);
  if (type === 'share') { const sharedRoute = ['detail','booking','traveler','review','checkout','result'].includes(pageFromHash()) ? route() : null; openSheet(`<div class="sheet-head"><div><span class="eyebrow">SHARE A JOURNEY</span><h2>把这一程，<br><em>分享给同行的人。</em></h2></div><button class="close-sheet" data-action="close">${icon('close')}</button></div><div class="share-card"><img src="../media/${sharedRoute?.image || 'route-ali-hero.jpg'}" alt="${sharedRoute?.alt || '阿里湖岸与雪山'}" /><div><b>无方旅行${sharedRoute ? ' · ' + sharedRoute.name : ''}</b><span>${sharedRoute?.summary || '把远方，走成自己的路。'}</span></div></div><button class="wide-button" data-action="copy">复制分享文案 ${icon('arrow')}</button>`); }
  if (type === 'fees') openSheet(sheetContent('费用与退改说明', policiesContent()));
  if (type === 'buddy') openSheet(sheetContent('找个合拍的同行者', `<p>先选同行偏好，再交由顾问沟通。以下不是已报名名单，仅用于匹配意向演示。</p><div class="flow-checklist">${['喜欢摄影与日落', '希望慢节奏行走', '愿意分享旅途故事'].map(text => `<label><input type="checkbox" name="buddy-preference" value="${text}" /><span>${text}</span></label>`).join('')}</div><button class="commerce-pay" data-action="buddy-request">记录同行意向</button>`));
  if (type === 'buddy-request') { if (!sheet.querySelector('[name="buddy-preference"]:checked')) { showToast('先选一个同行偏好'); return; } state.buddyPreferences = [...sheet.querySelectorAll('[name="buddy-preference"]:checked')].map(input => input.value); openSheet(sheetContent('意向已记录', `<p>${state.buddyPreferences.join(' · ')}</p><p>这是本地匹配意向演示，尚未匹配或通知其他旅人。</p><button class="commerce-pay" data-action="advisor">看看顾问服务入口</button>`)); }
  if (type === 'month') { state.month += Number(el.dataset.delta); state.month = Math.max(9, Math.min(11, state.month)); renderBooking(); }
  if (type === 'date') { state.date = el.dataset.date; state.bookingAgreed = false; renderBooking(); }
  if (type === 'people') { state.people = Math.max(1, Math.min(departures[state.date], state.people + Number(el.dataset.delta))); state.bookingAgreed = false; renderBooking(); }
  if (type === 'submit' || type === 'save-booking') {
    if (submittingOrder || paying) return;
    const validation = bookingError(state.booking, state.people);
    if (validation) { app.querySelector('#booking-error').textContent = validation; return; }
    if (!state.bookingAgreed) { showToast('请先核对并确认订单信息'); document.querySelector('#agree')?.focus(); return; }
    submittingOrder = true; el.disabled = true; el.textContent = '正在创建订单…';
    try {
      const current = state.order;
      if (!current || current.status !== 'pending' || current.route !== state.route || current.date !== state.date || current.people !== state.people || JSON.stringify(current.details) !== JSON.stringify(state.booking) || Date.now() >= current.expiresAt) {
        state.order = await paymentAdapter.createOrder({ route: state.route, date: state.date, people: state.people, details: state.booking });
      }
      go(type === 'save-booking' ? 'order' : 'checkout');
    } catch (error) { showToast(error.message); go('booking'); }
    finally { submittingOrder = false; }
  }
  if (type === 'pay') {
    if (paying || state.order?.status !== 'pending') return;
    paying = true; el.disabled = true; el.setAttribute('aria-busy', 'true'); el.textContent = '正在确认支付结果…';
    paymentAdapter.setOutcome(document.querySelector('#payment-outcome')?.value || 'paid');
    const id = state.order.id;
    try {
      const result = await paymentFlow.pay(id);
      if (result && state.order?.id === id) state.order = { ...state.order, ...result };
      if (pageFromHash() === 'checkout') go('result');
      else { if (['mine', 'order', 'result'].includes(pageFromHash())) render(); showToast('支付结果已更新，可在订单中查看'); }
    } finally { paying = false; }
  }
  if (type === 'refresh-payment' || type === 'resolve-demo-payment') {
    if (paying || !state.order) return;
    paying = true; el.disabled = true; el.textContent = '正在查询…';
    const id = state.order.id;
    try {
      if (type === 'resolve-demo-payment') paymentAdapter.confirmDemoPayment(id);
      const result = await paymentFlow.refresh(id);
      if (state.order?.id === id) state.order = { ...state.order, ...result };
      render();
      if (state.order.status === 'confirming') showToast('结果仍在确认，请不要重复付款');
      else showToast(state.order.status === 'paid' ? '支付已确认，可查看订单' : '订单状态已更新');
    } finally { paying = false; }
  }
  if (type === 'cancel-order') {
    if (paying || state.order?.status !== 'pending') { showToast('请先等待支付结果确认'); return; }
    openSheet(sheetContent('取消这次订单？', '<p>订单尚未付款。取消后可重新选择团期，不会产生扣款。</p><button class="wide-button" data-action="close">保留订单</button><button class="commerce-secondary" data-action="confirm-cancel-order">确认取消订单</button>'));
  }
  if (type === 'confirm-cancel-order') {
    if (paying || state.order?.status !== 'pending') return;
    try { state.order = await paymentAdapter.cancelOrder(state.order.id); go('order'); }
    catch { showToast('订单状态已变化，请刷新后重试'); }
  }
  if (type === 'order-itinerary') { state.route = state.order.route; state.tab = 'days'; state.detailOrigin = 'order'; go('detail'); }
  if (type === 'copy') { navigator.clipboard.writeText(document.querySelector('.share-card').innerText + '\n移动端设计原型，非正式产品。').then(() => { showToast('分享文案已复制'); closeSheet(); }).catch(() => showToast('复制不可用，请手动选取分享卡文案')); }
  if (type === 'consult') { closeSheet(); go('traveler'); }
  if (type === 'close') closeSheet();
}
function sheetContent(title, body) { return `<div class="sheet-head"><div><span class="eyebrow">WUFANG NOTE</span><h2>${title}</h2></div><button class="close-sheet" data-action="close">${icon('close')}</button></div><div class="sheet-body">${body}</div>`; }
document.addEventListener('click', e => {
  const el = e.target.closest('[data-go],[data-action],[data-tab]');
  if (!el) return;
  if (el.dataset.go) go(el.dataset.go);
  else if (el.dataset.action) action(el.dataset.action, el);
  else if (el.dataset.tab) { state.tab = el.dataset.tab; renderDetail(); }
});
sheet.addEventListener('click', e => {
  if (e.target !== sheet) return;
  const rect = sheet.getBoundingClientRect();
  if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) closeSheet();
});
sheet.addEventListener('cancel', () => { state.searchDraft = null; stopSheetMedia(); });
sheet.addEventListener('close', () => { stopSheetMedia(); app.querySelectorAll('[data-action="group-filter"]').forEach(el => el.setAttribute('aria-expanded', 'false')); });
document.addEventListener('visibilitychange', () => { if (document.hidden) sheet.querySelector('video')?.pause(); });
window.addEventListener('hashchange', render);
setInterval(() => {
  const countdown = app.querySelector('[data-expires]');
  if (!countdown || !state.order || state.order.status !== 'pending' || paying) return;
  countdown.querySelector('span').textContent = remainingTime(Number(countdown.dataset.expires));
  if (Date.now() >= Number(countdown.dataset.expires)) { state.order = paymentAdapter.listOrders().find(order => order.id === state.order.id); go('order'); }
}, 1000);
render();
if (pageFromHash() === 'home') showOpening();
export { state, pageFromHash };
