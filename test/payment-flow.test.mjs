import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoPaymentAdapter, createPaymentFlow } from '../public/mobile-design/payment-flow.mjs';
import { checkoutPage, paymentResultPage, orderPage } from '../public/mobile-design/commerce.mjs';
const draft = { route: 'ali', date: '2026-09-22', people: 1 };

test('demo amounts are calculated from route data as integer cents', async () => {
  const adapter = createDemoPaymentAdapter({ latency: 0 });
  const order = await adapter.createOrder({ ...draft, total: 1 });
  assert.equal(order.total, 14800);
  assert.equal(order.amountCents, 1480000);
  assert.equal(order.demo, true);
  await assert.rejects(adapter.createOrder({ ...draft, people: 99 }));
});

for (const outcome of ['paid', 'cancelled', 'failed', 'confirming']) {
  test(`payment result ${outcome} comes from querying the adapter`, async () => {
    const adapter = createDemoPaymentAdapter({ latency: 0 });
    const order = await adapter.createOrder(draft);
    adapter.setOutcome(outcome);
    const flow = createPaymentFlow(adapter);
    const result = await flow.pay(order.id);
    assert.equal(result.status, ['cancelled', 'failed'].includes(outcome) ? 'pending' : outcome);
    if (outcome === 'cancelled') assert.equal(result.attempt, 'cancelled');
    if (outcome === 'failed') assert.equal(result.attempt, 'failed');
    if (outcome === 'confirming') {
      assert.equal((await flow.refresh(order.id)).status, 'confirming');
      adapter.confirmDemoPayment(order.id);
      assert.equal((await flow.refresh(order.id)).status, 'paid');
    }
  });
}

test('client success alone never marks an order as paid', async () => {
  const flow = createPaymentFlow({ preparePayment: async () => ({}), requestPayment: async () => {}, queryOrder: async () => ({ status: 'pending' }) });
  assert.equal((await flow.pay('id')).status, 'confirming');
});

test('query failures remain uncertain instead of falsely reporting success or failure', async () => {
  const flow = createPaymentFlow({ preparePayment: async () => ({}), requestPayment: async () => {}, queryOrder: async () => { throw new Error('offline'); } });
  assert.equal((await flow.pay('id')).status, 'confirming');
  assert.equal((await flow.refresh('id')).status, 'confirming');
});

test('server confirmation wins even if the client callback failed', async () => {
  const flow = createPaymentFlow({ preparePayment: async () => ({}), requestPayment: async () => { throw new Error('SDK disconnected'); }, queryOrder: async () => ({ status: 'paid' }) });
  assert.equal((await flow.pay('id')).status, 'paid');
});

test('repeated taps cannot launch concurrent payments', async () => {
  let release, calls = 0;
  const flow = createPaymentFlow({ preparePayment: async () => ({}), requestPayment: () => { calls++; return new Promise(resolve => { release = resolve; }); }, queryOrder: async () => ({ status: 'paid' }) });
  const first = flow.pay('id');
  await Promise.resolve();
  assert.equal(await flow.pay('id'), null);
  release();
  await first;
  assert.equal(calls, 1);
});

test('closed orders cannot pay; paid orders cannot be cancelled', async () => {
  const adapter = createDemoPaymentAdapter({ latency: 0 });
  const order = await adapter.createOrder(draft);
  await adapter.cancelOrder(order.id);
  await assert.rejects(adapter.preparePayment(order.id));
  const paid = await adapter.createOrder(draft);
  await createPaymentFlow(adapter).pay(paid.id);
  await assert.rejects(adapter.cancelOrder(paid.id));
});

test('payment UI preserves sandbox disclosure, recovery paths and no-repeat warning', async () => {
  const order = await createDemoPaymentAdapter().createOrder(draft);
  assert.match(checkoutPage(order), /确认支付 ¥14,800/);
  assert.match(checkoutPage(order), /不会真实扣款/);
  assert.match(paymentResultPage({ ...order, attempt: 'cancelled' }), /订单仍待付款/);
  const confirming = paymentResultPage({ ...order, status: 'confirming' });
  assert.match(confirming, /不要重复付款/);
  assert.doesNotMatch(confirming, /data-go="checkout"/);
  assert.doesNotMatch(orderPage({ ...order, status: 'paid' }), /data-action="cancel-order"|data-go="checkout"/);
});
