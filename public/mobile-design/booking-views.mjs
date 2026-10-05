import { routes, departures, money, endDate, shortDate, calendarCells } from './data.mjs';
import { icon, brandLogo } from './components.mjs';
import { escapeHTML as esc, maskDocument, maskPhone, bookingQuote, refundQuote } from './booking-model.mjs';
import { itineraryPanel } from './itinerary.mjs';

export const flowHeader = (title, back) => `<header class="commerce-topbar"><button class="icon-btn" data-go="${back}" aria-label="返回">${icon('back')}</button><span>${title}</span><span></span></header>`;
const shell = (title, back, body) => `<section class="screen is-active journey-flow">${flowHeader(title, back)}<div class="flow-body">${body}</div></section>`;
export const flowNote = '<p class="flow-disclosure">交互演示 · 资料仅在当前页面会话保留，刷新后清除。<br>请勿填写真实证件；付款、签名和退款均为模拟。</p>';
const heading = (eyebrow, title, copy = '') => `<div class="flow-heading"><p>${eyebrow}</p><h1>${title}</h1>${copy ? `<div>${copy}</div>` : ''}</div>`;
const field = (label, name, value = '', attrs = '') => `<label class="flow-field">${label}<input name="${name}" value="${esc(value)}" ${attrs} /></label>`;
export const routeTicket = (r, date) => `<div class="flow-ticket"><img src="../media/${r.image}" alt="${r.alt}" width="72" height="88" /><div><small>西藏 · ${r.days} 天行程</small><h2>${r.name}</h2><p>${shortDate(date)} — ${shortDate(endDate(date, r.days))} · 拉萨集合</p></div></div>`;
export function calendarPage(state) {
  const r = routes[state.route], last = endDate(state.date, r.days);
  const full = state.calendarExpanded ?? state.bookingOrigin !== 'list';
  return shell('选择团期', state.bookingOrigin === 'list' ? 'list' : 'detail', `${heading('01 / 03 · 计划这一程', '什么时候，想出发？')}${routeTicket(r, state.date)}
    <div class="flow-section"><div class="flow-section-head"><div><h2>${shortDate(state.date)} — ${shortDate(last)}</h2><p>2026 年 · 抵达日另列</p></div><button class="flow-text-button" data-action="toggle-calendar" aria-expanded="${full}">${full ? '收起日历' : '更换日期'} ${icon('arrow')}</button></div>
    ${full ? `<div class="flow-calendar"><div class="month-head"><button data-action="month" data-delta="-1" aria-label="上个月" ${state.month === 9 ? 'disabled' : ''}>${icon('back')}</button><b>2026 年 ${state.month} 月</b><button data-action="month" data-delta="1" aria-label="下个月" ${state.month === 11 ? 'disabled' : ''}>${icon('arrow')}</button></div><div class="week-head">${['一','二','三','四','五','六','日'].map(d => `<span>${d}</span>`).join('')}</div><div class="calendar-grid">${calendarCells(state.month).map(c => c ? `<button class="${c.date === state.date ? 'is-selected' : c.date > state.date && c.date <= last ? 'flow-in-range' : ''}" ${c.slots >= state.people ? `data-action="date" data-date="${c.date}"` : 'disabled'} aria-pressed="${c.date === state.date}" aria-label="${c.date}${c.slots ? `，余 ${c.slots} 位` : '，暂无出发团期'}">${c.day}<small>${c.slots ? money(r.price) : c.date === last ? '返程' : ''}</small></button>` : '<i></i>').join('')}</div><p class="flow-caption">淡色区间为所选行程 · 标价日期可出发</p></div>` : ''}
    <div class="people-row"><div><span>出行人数</span><small>演示余位 ${departures[state.date]} 位</small></div><div class="stepper"><button data-action="people" data-delta="-1" aria-label="减少人数" ${state.people === 1 ? 'disabled' : ''}>−</button><b>${state.people}</b><button data-action="people" data-delta="1" aria-label="增加人数" ${state.people >= departures[state.date] ? 'disabled' : ''}>＋</button></div></div></div>
    <button class="flow-link" data-action="buddy"><span>看看同行偏好，找个搭子<small>体验匹配流程</small></span>${icon('arrow')}</button>
    <div class="flow-bottom"><div><small>路线参考总价</small><strong>${money(r.price * state.people)}</strong></div><button class="commerce-pay" data-action="enrollment-notice">填写出行人 ${icon('arrow')}</button></div><p class="flow-caption">团期、余位与价格为演示数据，以最终确认安排为准。</p>`);
}
export function travelersPage(state) {
  const d = state.booking;
  return shell('出行人资料', 'booking', `${heading('02 / 03 · 一起出发的人', '把同行的人，记在这里。', `需要 ${state.people} 位，已添加 ${d.travelers.length} 位。建议使用下方虚构资料体验。`)}
    <div class="flow-section"><div class="flow-section-head"><h2>出行人 <small>${d.travelers.length} / ${state.people}</small></h2><button class="flow-text-button" data-action="demo-travelers">填入演示资料</button></div>
    ${d.travelers.map((p, i) => `<div class="flow-person"><span class="flow-avatar">${String(i + 1).padStart(2, '0')}</span><div><b>${esc(p.name)}</b><p>${p.documentType === 'id' ? '身份证' : '护照'} ${maskDocument(p.document)}</p><p>${maskPhone(p.phone)}</p></div><button data-action="edit-traveler" data-index="${i}" aria-label="编辑第${i + 1}位出行人">编辑</button><button data-action="remove-traveler" data-index="${i}" aria-label="移除第${i + 1}位出行人">${icon('close')}</button></div>`).join('')}
    ${d.travelers.length < state.people ? '<button class="flow-add" data-action="add-traveler">＋ 添加出行人</button>' : state.people < departures[state.date] ? '<button class="flow-add" data-action="more-traveler">＋ 再加一位同行人</button>' : ''}</div>
    <form id="emergency-form" class="flow-section" novalidate><h2>紧急联系人</h2><p class="flow-caption">用于行程中的紧急联络，建议填写非同行亲友。</p>${field('姓名', 'emergencyName', d.emergencyName, 'maxlength="40" autocomplete="off"')}${field('手机号', 'emergencyPhone', d.emergencyPhone, 'type="tel" inputmode="numeric" maxlength="11" autocomplete="off"')}</form>
    <p id="travelers-error" class="flow-error" role="alert"></p><button class="commerce-pay" data-action="review-booking">下一步，核对订单 ${icon('arrow')}</button>${flowNote}`);
}
export function travelerEditor(person, editing) {
  return `<div class="flow-editor"><div class="sheet-head"><h2>${editing ? '编辑' : '添加'}出行人</h2><button class="close-sheet" data-action="close">${icon('close')}</button></div><p class="flow-caption">仅供交互体验，请使用虚构资料。</p><form id="person-form" novalidate>
    ${field('姓名', 'name', person.name, 'maxlength="40" autocomplete="off"')}
    <label class="flow-field">证件类型<select name="documentType"><option value="passport" ${person.documentType === 'passport' ? 'selected' : ''}>护照</option><option value="id" ${person.documentType === 'id' ? 'selected' : ''}>身份证</option></select></label>
    ${field('证件号码', 'document', person.document, 'maxlength="20" autocomplete="off" autocapitalize="characters" aria-describedby="person-error"')}
    <div class="flow-field-pair"><label class="flow-field">性别<select name="gender"><option value="">请选择</option><option value="female" ${person.gender === 'female' ? 'selected' : ''}>女</option><option value="male" ${person.gender === 'male' ? 'selected' : ''}>男</option></select></label>${field('出生日期', 'birthday', person.birthday, 'type="date" min="1900-01-01" max="' + new Date().toISOString().slice(0, 10) + '"')}</div>
    ${field('手机号', 'phone', person.phone, 'type="tel" maxlength="11" inputmode="numeric" autocomplete="off"')}
    <p class="flow-error" id="person-error" role="alert"></p><button class="commerce-pay" type="submit">保存出行人</button></form></div>`;
}
export function quoteRows(quote) {
  return `<dl class="flow-prices"><div><dt>路线费用</dt><dd>${money(quote.grossCents / 100)}</dd></div>${quote.groupDiscountCents ? `<div><dt>多人优惠 <small>演示</small></dt><dd>−${money(quote.groupDiscountCents / 100)}</dd></div>` : ''}${quote.couponDiscountCents ? `<div><dt>优惠码抵扣 <small>演示</small></dt><dd>−${money(quote.couponDiscountCents / 100)}</dd></div>` : ''}<div class="flow-total"><dt>合计</dt><dd>${money(quote.totalCents / 100)}</dd></div></dl>`;
}
export function reviewBookingPage(state) {
  const d = state.booking, quote = bookingQuote(state.route, state.people, d.coupon);
  return shell('确认订单', 'traveler', `${heading('03 / 03 · 出发前，再确认一次', '安心，从每个细节开始。')}${routeTicket(routes[state.route], state.date)}
    <div class="flow-section"><div class="flow-section-head"><h2>出行人 · ${state.people} 位</h2><button class="flow-text-button" data-go="traveler">修改</button></div><p>${d.travelers.map(p => esc(p.name)).join('、')}</p><p class="flow-caption">紧急联系人 ${esc(d.emergencyName)} · ${maskPhone(d.emergencyPhone)}</p></div>
    <form id="booking-options" novalidate><div class="flow-section"><h2>希望和谁住？</h2><div class="flow-room"><label><input type="radio" name="room" value="random" ${d.room === 'random' ? 'checked' : ''} /><span>随机同性拼房</span></label><label><input type="radio" name="room" value="friend" ${d.room === 'friend' ? 'checked' : ''} /><span>指定同行室友</span></label></div><div id="roommate-field" ${d.room === 'friend' ? '' : 'hidden'}>${field('室友姓名', 'roommate', d.roommate, 'maxlength="40" placeholder="输入希望同住的室友姓名"')}</div><p class="flow-caption">这里只记录偏好，最终房型与拼房安排由无方确认。</p></div>
    <div class="flow-section"><h2>优惠与备注</h2><div class="flow-coupon">${field('优惠码', 'couponInput', d.coupon, 'maxlength="20" placeholder="可用演示码 DEMO100"')}<button data-action="apply-coupon" type="button">使用</button></div><p id="coupon-message" class="flow-caption" role="status">${d.coupon ? '已使用演示优惠 ¥100' : '示例：2 人起每人减 ¥50；优惠码可叠加减 ¥100。'}</p><label class="flow-field">出行备注 <small>选填</small><textarea name="note" rows="3" maxlength="500" placeholder="例如：住宿偏好、想提前确认的安排">${esc(d.note)}</textarea></label></div></form>
    <div class="flow-section">${quoteRows(quote)}<p class="flow-caption">优惠为设计演示规则，不代表已发布的促销政策。</p></div>
    <button class="flow-link" data-action="guide"><span>出行指南</span>${icon('arrow')}</button><button class="flow-link" data-action="fees"><span>费用与退改说明</span>${icon('arrow')}</button>
    <label class="flow-consent"><input id="agree" type="checkbox" ${state.bookingAgreed ? 'checked' : ''} /><span>我已核对团期、出行人及费用，并了解本次为交互演示。</span></label><p id="booking-error" class="flow-error" role="alert"></p>
    <div class="flow-dual-actions"><button class="flow-outline" data-action="save-booking">保存，稍后支付</button><button class="commerce-pay" data-action="submit">提交并支付</button></div>${flowNote}`);
}
export function guidePage(r, date, back) {
  const sections = [ ['meet', '集合解散'], ['prepare', '行前准备'], ['pack', '物资清单'], ['journey', '逐日行程'] ];
  return shell('出行指南', back, `${heading('BEFORE THE JOURNEY', '让准备，也从容一点。')}${routeTicket(r, date)}<nav class="flow-anchor-nav" aria-label="出行指南章节">${sections.map(([id, text]) => `<button data-action="guide-anchor" data-section="${id}">${text}</button>`).join('')}</nav>
    <section class="flow-guide-section" id="guide-meet"><small>01</small><h2>在拉萨，见面。</h2><p>本路线在拉萨集合与返程，抵达接机日另列。具体接机时段、集合地址与解散时间，请以出发通知为准。</p><p class="flow-caption">最终安排确认前，请先与顾问核对大交通。</p></section>
    <section class="flow-guide-section" id="guide-prepare"><small>02</small><h2>出发前，把问题问清楚。</h2><ul><li>确认逐日行程、住宿和用车安排。</li><li>核对证件、所需手续及保险范围。</li><li>高原出行与徒步安排需提前沟通；身体适应情况请咨询专业人员。</li></ul></section>
    <section class="flow-guide-section" id="guide-pack"><small>03</small><h2>行李轻一些，准备全一些。</h2><p class="flow-caption">下列为清单交互示例，不替代正式出行通知。</p><div class="flow-checklist">${['有效证件与预订信息', '保暖衣物与防风外层', '适合行走的鞋', '防晒用品与水杯', '充电设备与个人用品'].map((text, i) => `<label><input type="checkbox" data-pack="${i}" /><span>${text}</span></label>`).join('')}</div></section>
    <section class="flow-guide-section" id="guide-journey"><small>04</small><h2>把每一天，先看一遍。</h2>${itineraryPanel(r)}</section><button class="commerce-pay" data-action="advisor">联系无方顾问</button>`);
}
export function policiesContent() {
  return `<p>正式费用、退改与合同条款将在确认后接入。当前可以体验查看规则、申请退款和结果反馈，不会产生真实交易。</p><div class="flow-section"><h3>费用说明</h3><p>路线价格为参考数据。住宿、交通、门票、餐食与保险的包含项，以无方确认的行程及合同为准。</p></div><div class="flow-section"><h3>退款演示规则</h3><p>演示按所选出行人分摊的实付金额计算，扣除额为 0。提交后进入“待处理”，可手动体验完成状态。</p><p class="flow-caption">这不是“无条件全额退款”的商业承诺。真实扣费、处理时限和退回渠道以后端审核为准。</p></div>`;
}
export function aftercareLinks(order) {
  return `<div class="flow-section flow-service-menu"><h2>这一程，有人托底。</h2><button class="flow-link" data-action="guide"><span>出行指南<small>集合、准备与逐日行程</small></span>${icon('arrow')}</button><button class="flow-link" data-action="advisor"><span>联系顾问 / 出行群<small>出发前的沟通入口</small></span>${icon('arrow')}</button><button class="flow-link" data-action="documents"><span>合同与行程单<small>${Object.keys(order.signatures || {}).length} / 2 份已完成签名演示</small></span>${icon('arrow')}</button><button class="flow-link" data-action="refund"><span>${order.refund?.status === 'requested' ? '查看退款进度' : '退款与售后'}<small>${order.refundedTravelers?.length ? `已演示退款 ${order.refundedTravelers.length} 位` : '按出行人选择，先核对再申请'}</small></span>${icon('arrow')}</button></div>`;
}
export function orderPeople(order) {
  const d = order.details;
  if (!d) return '';
  return `<div class="flow-section"><h2>出行资料</h2>${d.travelers.map((p, i) => `<div class="flow-order-person"><b>${esc(p.name)}${order.refundedTravelers.includes(i) ? '<small> · 已演示退款</small>' : ''}</b><p>${maskDocument(p.document)} · ${maskPhone(p.phone)}</p></div>`).join('')}<p class="flow-caption">紧急联系人：${esc(d.emergencyName)} · ${maskPhone(d.emergencyPhone)}</p><p class="flow-caption">拼房偏好：${d.room === 'friend' ? `与 ${esc(d.roommate)} 同住` : '随机同性拼房'}</p>${d.note ? `<p class="flow-caption">备注：${esc(d.note)}</p>` : ''}</div>`;
}
export function documentsPage(order) {
  return shell('合同与行程单', 'order', `${heading('TRAVEL DOCUMENTS', '约定清楚，放心出发。')}<p class="flow-caption">以下仅为流程样张，签名不会形成正式合同或发送给任何机构。</p>${[['contract', '旅游服务合同'], ['itinerary', '旅游行程单']].map(([kind, name]) => `<button class="flow-link" data-action="document" data-kind="${kind}"><span>${name}<small>${order.signatures?.[kind] ? '已完成签名演示 · 查看' : '阅读后进行签名演示'}</small></span>${icon(order.signatures?.[kind] ? 'check' : 'arrow')}</button>`).join('')}<div class="commerce-brand">${brandLogo()}</div>`);
}
export function documentPage(order, kind) {
  const signed = order.signatures?.[kind];
  const r = routes[order.route];
  return shell(kind === 'contract' ? '旅游服务合同' : '旅游行程单', 'documents', `${heading('样张 · 非正式法律文件', kind === 'contract' ? '把这一程，约定清楚。' : '我们即将走过的地方。')}${routeTicket(r, order.date)}${kind === 'itinerary' ? itineraryPanel(r) : `<article class="flow-document"><h2>旅程信息</h2><p>${r.name} · ${order.people} 位旅人<br>参考团期：${order.date} — ${endDate(order.date, r.days)}<br>演示实付：${money(order.total)}</p><h2>费用与服务</h2><p>此处将展示双方确认的服务内容、费用包含项、责任边界与退改条款。当前不是正式合同文本。</p><h2>信息与签名</h2><p>本次只演示阅读、确认及手写签名操作。签名保存在当前页面会话内，刷新后清除，不向第三方提交。</p></article>`}
    ${signed ? `<div class="flow-section"><h2>签名演示已完成</h2>${signaturePreview(signed.strokes)}<p class="flow-caption">${new Date(signed.signedAt).toLocaleString('zh-CN')} · 仅本地演示</p></div>` : `<label class="flow-consent"><input id="document-agree" type="checkbox" /><span>我已查看样张，了解本次签名仅用于交互演示。</span></label><button class="commerce-pay" data-action="start-signature" ${order.status !== 'paid' ? 'disabled' : ''}>开始签名演示</button>`}`);
}
export function signaturePage() {
  return shell('手写签名', 'document', `${heading('SIGNATURE STUDY', '留下这次出发的约定。', '在下方留白处书写，支持触控与鼠标。')}<div class="flow-signature-wrap"><canvas id="signature-canvas" aria-label="手写签名区域"></canvas><span id="signature-hint">在这里书写</span></div><div class="flow-sign-tools"><button data-action="clear-signature">重新书写</button><button data-action="demo-signature">使用演示笔迹</button></div><p class="flow-error" id="signature-error" role="alert"></p><button class="commerce-pay" data-action="save-signature">确认签名演示</button>${flowNote}`);
}
export function signaturePreview(strokes) {
  return `<svg class="flow-signature-preview" viewBox="0 0 400 200" aria-label="本地演示签名" role="img">${strokes.map(line => `<polyline fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${line.map(([x,y]) => `${x * 400},${y * 200}`).join(' ')}" />`).join('')}</svg>`;
}
export function mountSignature(canvas) {
  const context = canvas.getContext('2d');
  let strokes = [], line = null;
  function draw() {
    const bounds = canvas.getBoundingClientRect(), ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(bounds.width * ratio); canvas.height = Math.round(bounds.height * ratio);
    context.scale(ratio, ratio); context.lineWidth = 2.5; context.lineCap = 'round'; context.lineJoin = 'round'; context.strokeStyle = '#273d35';
    strokes.forEach(points => { context.beginPath(); points.forEach(([x, y], i) => context[i ? 'lineTo' : 'moveTo'](x * bounds.width, y * bounds.height)); context.stroke(); });
    document.querySelector('#signature-hint').hidden = strokes.some(points => points.length > 1);
    if (strokes.some(points => points.length >= 3)) document.querySelector('#signature-error').textContent = '';
  }
  function point(event) { const r = canvas.getBoundingClientRect(); return [Math.max(0, Math.min(1, (event.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (event.clientY - r.top) / r.height))]; }
  canvas.onpointerdown = e => { if (e.button !== 0) return; canvas.setPointerCapture(e.pointerId); line = [point(e)]; strokes.push(line); draw(); };
  canvas.onpointermove = e => { if (line) { line.push(point(e)); draw(); } };
  canvas.onpointerup = canvas.onpointercancel = () => { line = null; };
  const observer = new ResizeObserver(draw); observer.observe(canvas);
  return { get: () => structuredClone(strokes), clear() { strokes = []; draw(); }, demo() { strokes = [[[.17,.57],[.3,.32],[.28,.65],[.49,.43],[.42,.68],[.72,.48]],[[.3,.76],[.7,.73],[.83,.75]]]; draw(); }, destroy() { observer.disconnect(); } };
}
export function refundPage(order, selection) {
  const refund = order.refund;
  if (refund?.status === 'requested' || order.status === 'refunded') return shell('退款进度', 'order', `${heading('AFTER THE JOURNEY', refund.status === 'requested' ? '申请已记录。' : '退款演示已完成。', '这只是本地状态变化，没有真实资金流转。')}<div class="flow-section"><h2>${refund.status === 'requested' ? '等待处理' : '已完成演示'}</h2><p>本次 ${refund.indexes.length} 位出行人 · ${money(refund.refundCents / 100)}</p><ol class="flow-progress"><li>提交申请</li><li>${refund.status === 'requested' ? '等待服务端审核（未接入）' : '模拟审核完成'}</li><li>${refund.status === 'requested' ? '核实后原路退回（未接入）' : '模拟退款完成'}</li></ol></div>${refund.status === 'requested' ? '<button class="commerce-pay" data-action="complete-demo-refund">演示退款完成</button>' : ''}<button class="commerce-secondary" data-go="order">返回订单</button>`);
  let quote = null;
  try { quote = refundQuote(order, selection); } catch { /* Empty selection has no quote. */ }
  return shell('申请退款', 'order', `${heading('先核对，再申请', '计划有变，也妥善安排。', '选择需要退款的出行人；提交前会再次确认。')}<div class="flow-section"><h2>选择出行人</h2>${(order.details?.travelers || Array.from({ length: order.people }, (_, i) => ({ name: `旅人 ${i + 1}` }))).map((p, i) => `<label class="flow-refund-person"><input type="checkbox" data-refund-person="${i}" ${selection.includes(i) ? 'checked' : ''} ${order.refundedTravelers?.includes(i) ? 'disabled' : ''} /><span>${esc(p.name)}${order.refundedTravelers?.includes(i) ? '<small>已演示退款</small>' : ''}</span></label>`).join('')}</div><div class="flow-section"><dl class="flow-prices"><div><dt>所选旅人实付</dt><dd>${money((quote?.paidCents || 0) / 100)}</dd></div><div><dt>扣除金额 <small>示例</small></dt><dd>¥0</dd></div><div class="flow-total"><dt>预计退款</dt><dd>${money((quote?.refundCents || 0) / 100)}</dd></div></dl><p class="flow-caption">仅演示：按实付分摊，不扣费。真实退款规则及金额以后端审核为准。</p></div><button class="flow-link" data-action="fees"><span>查看退改说明</span>${icon('arrow')}</button><button class="commerce-pay" data-action="request-refund" ${quote ? '' : 'disabled'}>确认申请退款</button>`);
}
