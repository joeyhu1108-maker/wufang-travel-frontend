import { demoOrder } from './data.mjs';
import { bookingError, bookingQuote, refundQuote } from './booking-model.mjs';

// This controller is platform-independent. Production adapters must call a
// merchant backend; a client payment callback is never proof of payment.
export function createPaymentFlow(adapter) {
  let inFlight = false;
  return {
    async pay(orderId) {
      if (inFlight) return null;
      inFlight = true;
      let attempt = 'completed';
      try {
        try {
          const parameters = await adapter.preparePayment(orderId);
          await adapter.requestPayment(parameters);
        } catch (error) { attempt = error.code === 'PAYMENT_CANCELLED' ? 'cancelled' : 'failed'; }
        try {
          const order = await adapter.queryOrder(orderId);
          // A successful SDK callback followed by an unpaid query can be a race.
          // Wait for confirmation rather than immediately offering another charge.
          return { ...order, status: attempt === 'completed' && order.status === 'pending' ? 'confirming' : order.status, attempt };
        }
        catch { return { id: orderId, status: 'confirming', attempt }; }
      } finally { inFlight = false; }
    },
    async refresh(orderId) {
      try { return await adapter.queryOrder(orderId); }
      catch { return { id: orderId, status: 'confirming' }; }
    }
  };
}

export function createDemoPaymentAdapter({ latency = 600, now = () => Date.now() } = {}) {
  const orders = new Map();
  let outcome = 'paid', sequence = 0;
  const get = id => {
    const order = orders.get(id);
    if (!order) throw new Error('Unknown demo order');
    if (order.status === 'pending' && now() >= order.expiresAt) { order.status = 'cancelled'; order.expired = true; }
    return order;
  };
  const snapshot = order => structuredClone(order);
  return {
    setOutcome(value) { if (['paid', 'cancelled', 'failed', 'confirming'].includes(value)) outcome = value; },
    listOrders() { return [...orders.keys()].reverse().map(id => snapshot(get(id))); },
    async createOrder({ route, date, people, details }) {
      const draft = demoOrder(route, date, people);
      if (!draft) throw new Error('团期余位不足，请重新选择日期或人数。');
      if (details && bookingError(details, people)) throw new Error(bookingError(details, people));
      const quote = bookingQuote(route, people, details?.coupon, Boolean(details));
      const order = { ...draft, id: `WF-DEMO-${now()}-${++sequence}`, amountCents: quote.totalCents, total: quote.totalCents / 100, quote, details: details ? snapshot(details) : null, createdAt: now(), expiresAt: now() + 30 * 60 * 1000, signatures: {}, refundedTravelers: [], refund: null, demo: true };
      orders.set(order.id, order);
      return snapshot(order);
    },
    async preparePayment(id) {
      if (get(id).status !== 'pending') throw new Error('Order is not payable');
      return { orderId: id, demo: true };
    },
    async requestPayment({ orderId }) {
      const chosen = outcome;
      await new Promise(resolve => setTimeout(resolve, latency));
      if (get(orderId).status !== 'pending') throw new Error('订单已关闭');
      if (chosen === 'paid' || chosen === 'confirming') get(orderId).status = chosen;
      if (chosen === 'cancelled') throw Object.assign(new Error('Cancelled'), { code: 'PAYMENT_CANCELLED' });
      if (chosen === 'failed') throw new Error('Demo payment failure');
    },
    async queryOrder(id) { return snapshot(get(id)); },
    async cancelOrder(id) {
      if (get(id).status !== 'pending') throw new Error('Only an unpaid order can be cancelled');
      get(id).status = 'cancelled'; return snapshot(get(id));
    },
    confirmDemoPayment(id) { if (get(id).status === 'confirming') get(id).status = 'paid'; },
    async signDocument(id, kind, strokes) {
      const order = get(id);
      if (order.status !== 'paid' || !['contract', 'itinerary'].includes(kind)) throw new Error('当前不可签署');
      if (order.signatures[kind]) return snapshot(order);
      if (!Array.isArray(strokes) || strokes.some(line => !Array.isArray(line) || line.some(point => !Array.isArray(point) || point.length !== 2 || point.some(n => !Number.isFinite(n) || n < 0 || n > 1))) || !strokes.some(line => line.length >= 3)) throw new Error('请先手写签名');
      order.signatures[kind] = { strokes: snapshot(strokes), signedAt: now(), demo: true };
      return snapshot(order);
    },
    async requestRefund(id, indexes) {
      const order = get(id);
      if (order.refund?.status === 'requested') throw new Error('已有退款申请正在处理中');
      const quote = refundQuote(order, indexes);
      order.refund = { ...quote, status: 'requested', requestedAt: now(), demo: true };
      return snapshot(order);
    },
    async completeDemoRefund(id) {
      const order = get(id);
      if (order.refund?.status !== 'requested') throw new Error('没有待处理的退款申请');
      order.refundedTravelers.push(...order.refund.indexes);
      order.refund.status = 'completed';
      if (order.refundedTravelers.length === order.people) order.status = 'refunded';
      return snapshot(order);
    }
  };
}
