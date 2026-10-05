import { routes, money, shortDate } from './data.mjs';
import { icon, brandLogo } from './components.mjs';
import { aftercareLinks, orderPeople, quoteRows } from './booking-views.mjs';

const labels = { pending: '待付款', confirming: '支付确认中', paid: '已付款', cancelled: '已取消', refunded: '已演示退款' };
const statusLabel = order => order.refund?.status === 'requested' ? '退款演示处理中' : order.status === 'paid' && order.refundedTravelers?.length ? '部分退款 · 演示' : labels[order.status];
const sandboxNote = '<p class="payment-sandbox">支付沙盒 · 不会真实扣款</p>';
const header = (title, back) => `<header class="commerce-topbar"><button class="icon-btn" data-go="${back}" aria-label="返回">${icon('back')}</button><span>${title}</span><span aria-hidden="true"></span></header>`;
function summary(order) {
  const route = routes[order.route];
  return `<div class="commerce-route"><img src="../media/${route.image}" alt="${route.alt}" width="88" height="100" /><div><span>${route.days} 天 · ${route.tags[0]}</span><h2>${route.name}</h2><p>${shortDate(order.date)} 出发 · ${order.people} 位旅人</p></div></div>`;
}
export function orderCard(order) {
  return `<div class="order-top"><span>我的订单</span><i>${statusLabel(order)}</i></div><h2>${routes[order.route].name}</h2><p>${shortDate(order.date)} 出发 · ${order.people} 位旅人</p><button data-action="order-open" data-id="${order.id}">查看订单 ${icon('arrow')}</button>`;
}
export function checkoutPage(order) {
  return `<section class="screen is-active commerce-screen">${header('支付订单', 'order')}<div class="commerce-content"><p class="commerce-eyebrow">最后一步 · 付款</p><h1>下一程，<br>即将开始。</h1>${summary(order)}${order.quote ? `<div class="flow-section">${quoteRows(order.quote)}</div>` : ''}<p class="flow-countdown" data-expires="${order.expiresAt}">请在 <span>${remainingTime(order.expiresAt)}</span> 内完成支付演示，超时订单将自动关闭。</p>
    <h2 class="commerce-section-title">支付方式</h2><label class="payment-method"><span class="wechat-pay-mark" aria-hidden="true">✓</span><span><strong>微信支付</strong><small>在微信中确认付款</small></span><input type="radio" name="payment-method" checked aria-label="微信支付" /></label><p class="commerce-help">付款前，请确认团期、人数及最终费用。</p>
    <button class="commerce-pay" data-action="pay">确认支付 ${money(order.total)}</button><button class="commerce-secondary" data-go="order">稍后支付</button>${sandboxNote}
    <details class="payment-test-tools"><summary>体验其他支付结果</summary><label>本次结果<select id="payment-outcome"><option value="paid">支付成功</option><option value="cancelled">用户取消支付</option><option value="failed">支付失败</option><option value="confirming">结果确认中</option></select></label></details></div></section>`;
}
export function paymentResultPage(order) {
  const paid = order.status === 'paid', pending = order.status === 'confirming';
  const title = paid ? '报名成功。' : pending ? '正在确认支付结果。' : '支付尚未完成。';
  const copy = paid ? '期待与你同行。你可以在订单中查看这次旅程。' : pending ? '暂时还没有确认结果，请先不要重复付款。' : order.attempt === 'cancelled' ? '这次已退出支付，订单仍待付款，可以稍后继续。' : '本次支付没有完成，可以重新尝试。';
  return `<section class="screen is-active commerce-screen">${header('支付结果', 'mine')}<div class="commerce-content commerce-result"><span class="payment-result-symbol ${paid ? 'is-paid' : ''}" aria-hidden="true">${paid ? icon('check') : pending ? '…' : '—'}</span><h1>${title}</h1><p class="commerce-help" role="status">${copy}</p>${summary(order)}<dl class="commerce-amount"><div class="is-total"><dt>${paid ? '已付金额' : '订单金额'}</dt><dd>${money(order.total)}</dd></div></dl>
    ${pending ? '<button class="commerce-pay" data-action="refresh-payment">刷新支付结果</button><button class="commerce-secondary" data-go="order">稍后查看订单</button><button class="payment-demo-resolve" data-action="resolve-demo-payment">演示：确认回调到账</button>' : paid ? `${aftercareLinks(order)}<button class="commerce-pay" data-go="order">查看完整订单</button><button class="commerce-secondary" data-go="home">回到首页</button>` : '<button class="commerce-pay" data-go="checkout">继续支付</button><button class="commerce-secondary" data-go="order">查看订单</button>'}${sandboxNote}</div></section>`;
}
export function orderPage(order) {
  const pending = order.status === 'pending', paid = order.status === 'paid', confirming = order.status === 'confirming';
  return `<section class="screen is-active commerce-screen">${header('订单详情', 'mine')}<div class="commerce-content"><p class="commerce-eyebrow">${statusLabel(order)}</p><h1>${order.status === 'refunded' ? '这次申请，已妥善记录。' : paid ? '把期待，留给出发。' : confirming ? '支付结果确认中。' : pending ? '离出发，更近一步。' : order.expired ? '订单已超时关闭。' : '这次订单已取消。'}</h1>${summary(order)}<dl class="commerce-amount"><div><dt>订单编号</dt><dd class="commerce-order-id">${order.id}</dd></div><div><dt>出发日期</dt><dd>${order.date}</dd></div><div><dt>同行人数</dt><dd>${order.people} 人</dd></div><div class="is-total"><dt>${paid || order.status === 'refunded' ? '原实付金额' : '订单金额'}</dt><dd>${money(order.total)}</dd></div></dl>${orderPeople(order)}${paid || order.status === 'refunded' ? aftercareLinks(order) : ''}
    <button class="commerce-info-link" data-action="fees">费用与退改说明 ${icon('arrow')}</button>
    ${pending ? `<p class="flow-countdown" data-expires="${order.expiresAt}">剩余 <span>${remainingTime(order.expiresAt)}</span> · 超时自动关闭</p><button class="commerce-pay" data-go="checkout">继续支付 ${money(order.total)}</button><button class="commerce-secondary" data-action="cancel-order">取消订单</button>` : confirming ? '<p class="commerce-help">请勿重复付款，最终结果确认后将在这里更新。</p><button class="commerce-pay" data-action="refresh-payment">刷新支付结果</button><button class="payment-demo-resolve" data-action="resolve-demo-payment">演示：确认回调到账</button>' : '<button class="commerce-pay" data-action="order-itinerary">查看路线行程</button>'}${sandboxNote}<div class="commerce-brand">${brandLogo()}</div></div></section>`;
}
export function remainingTime(expiresAt, now = Date.now()) {
  const seconds = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
