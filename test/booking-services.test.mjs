import test from 'node:test';
import assert from 'node:assert/strict';
import { createBookingDetails, demoTraveler, travelerErrors, validBirthday, identityInfo, bookingError, bookingQuote, refundQuote, escapeHTML, maskDocument, maskPhone } from '../public/mobile-design/booking-model.mjs';
import { calendarPage, travelerEditor, reviewBookingPage, documentsPage, refundPage, policiesContent } from '../public/mobile-design/booking-views.mjs';
import { createDemoPaymentAdapter } from '../public/mobile-design/payment-flow.mjs';
import { remainingTime, orderCard, orderPage } from '../public/mobile-design/commerce.mjs';

const details = (people = 2) => ({ ...createBookingDetails(), travelers: Array.from({ length: people }, (_, i) => demoTraveler(i)), emergencyName: '演示联系人', emergencyPhone: '13800000000' });
const draft = (d = details()) => ({ route: 'ali', date: '2026-09-22', people: d.travelers.length, details: d });
const strokes = [[[.1, .2], [.3, .5], [.7, .3]]];
async function paid(adapter, d) {
  const order = await adapter.createOrder(draft(d));
  await adapter.requestPayment(await adapter.preparePayment(order.id));
  return adapter.queryOrder(order.id);
}

test('traveler forms reject invalid dates, incomplete documents and phone numbers', () => {
  assert.deepEqual(travelerErrors(demoTraveler(0)), {});
  assert.equal(validBirthday('2025-02-29'), false);
  assert.equal(validBirthday('2024-02-29'), true);
  assert.equal(validBirthday('2999-01-01'), false);
  assert.equal(identityInfo('000000000000000000'), null);
  const invalid = travelerErrors({ ...demoTraveler(0), name: ' ', document: '<bad>', birthday: '', gender: '', phone: '123' });
  assert.deepEqual(Object.keys(invalid).sort(), ['birthday', 'document', 'gender', 'name', 'phone']);
});

test('booking requires exact traveler count, unique documents and an emergency contact', () => {
  const d = details();
  assert.equal(bookingError(d, 2), '');
  assert.match(bookingError(d, 3), /补齐/);
  d.travelers[1].document = d.travelers[0].document.toLowerCase();
  assert.match(bookingError(d, 2), /重复/);
  d.travelers[1] = demoTraveler(1);
  d.emergencyPhone = '';
  assert.match(bookingError(d, 2), /紧急联系人/);
});

test('roommate and coupon requirements are explicit demo rules', () => {
  const d = { ...details(), room: 'friend' };
  assert.match(bookingError(d, 2), /室友/);
  d.roommate = '演示室友';
  d.coupon = 'UNKNOWN';
  assert.match(bookingError(d, 2), /优惠码/);
  d.coupon = 'DEMO100';
  assert.equal(bookingError(d, 2), '');
});

test('prices use integer cents and show two independent demo discounts', () => {
  assert.equal(bookingQuote('ali', 1).totalCents, 1480000);
  assert.deepEqual(bookingQuote('ali', 2, 'DEMO100'), { grossCents: 2960000, groupDiscountCents: 10000, couponDiscountCents: 10000, totalCents: 2940000 });
  assert.equal(bookingQuote('ali', 2, 'DEMO100', false).totalCents, 2960000);
  for (const people of [0, 7, 1.5]) assert.throws(() => bookingQuote('ali', people));
  assert.throws(() => bookingQuote('unknown', 1));
});

test('free text is escaped and document / phone summaries are masked', () => {
  const value = '<img src=x onerror="alert(1)">';
  assert.equal(escapeHTML(value).includes('<img'), false);
  assert.equal(travelerEditor({ ...demoTraveler(0), name: value }, true).includes(value), false);
  const state = { route: 'ali', date: '2026-09-22', people: 2, booking: { ...details(), note: '</textarea><script>1</script>' } };
  assert.doesNotMatch(reviewBookingPage(state), /<script>/);
  assert.equal(maskDocument('DEMO0001'), 'DE••••01');
  assert.equal(maskPhone('13800000000'), '138 •••• 0000');
});

test('calendar can collapse, highlight a cross-month range and disable insufficient capacity', () => {
  const state = { route: 'kora', date: '2026-10-20', month: 11, people: 3, bookingOrigin: 'list' };
  assert.doesNotMatch(calendarPage(state), /class="calendar-grid"/);
  const expanded = calendarPage({ ...state, calendarExpanded: true });
  assert.match(expanded, /2026 年 11 月/);
  assert.match(expanded, /flow-in-range/);
  const october = calendarPage({ ...state, month: 10, calendarExpanded: true });
  assert.match(october, /<button class="[^"]*" disabled aria-pressed="false" aria-label="2026-10-06/);
});

test('order snapshots cannot mutate draft data or another order', async () => {
  const adapter = createDemoPaymentAdapter({ latency: 0 });
  const d = details();
  const one = await adapter.createOrder(draft(d));
  d.travelers[0].name = 'changed';
  one.details.travelers[0].name = 'also changed';
  const two = await adapter.createOrder(draft(d));
  assert.equal((await adapter.queryOrder(one.id)).details.travelers[0].name, '演示旅人1');
  assert.equal((await adapter.queryOrder(two.id)).details.travelers[0].name, 'changed');
  const list = adapter.listOrders();
  list[0].details.travelers[0].name = 'tamper';
  assert.equal((await adapter.queryOrder(two.id)).details.travelers[0].name, 'changed');
  assert.equal(list.length, 2);
});

test('unpaid orders expire after 30 minutes and cannot be paid', async () => {
  let time = 1000;
  const adapter = createDemoPaymentAdapter({ latency: 0, now: () => time });
  const order = await adapter.createOrder(draft());
  assert.equal(order.expiresAt - order.createdAt, 1800000);
  time = order.expiresAt;
  assert.equal((await adapter.queryOrder(order.id)).expired, true);
  assert.equal(adapter.listOrders()[0].status, 'cancelled');
  await assert.rejects(adapter.preparePayment(order.id));
  await assert.rejects(adapter.requestPayment({ orderId: order.id }));
  assert.equal(remainingTime(order.expiresAt, time), '00:00');
  assert.equal(remainingTime(order.expiresAt, time - 61000), '01:01');
});

test('signatures require a paid order, known document and valid normalized strokes', async () => {
  const adapter = createDemoPaymentAdapter({ latency: 0 });
  const unpaid = await adapter.createOrder(draft());
  await assert.rejects(adapter.signDocument(unpaid.id, 'contract', strokes));
  const order = await paid(adapter);
  for (const invalid of [[], [null], [[]], [[[2, .2], [.2, .3], [.1, .4]]]]) await assert.rejects(adapter.signDocument(order.id, 'contract', invalid), /手写签名/);
  await assert.rejects(adapter.signDocument(order.id, 'unknown', strokes));
  const signed = await adapter.signDocument(order.id, 'contract', strokes);
  assert.equal(Object.keys(signed.signatures).length, 1);
  assert.deepEqual((await adapter.signDocument(order.id, 'contract', [])).signatures, signed.signatures);
  assert.equal(Object.keys((await adapter.signDocument(order.id, 'itinerary', strokes)).signatures).length, 2);
  assert.match(documentsPage(signed), /已完成签名演示/);
});

test('partial refund allocation is exact, including rounding residue', () => {
  const order = { status: 'paid', people: 3, amountCents: 100, refundedTravelers: [] };
  assert.equal(refundQuote(order, [0]).refundCents, 34);
  assert.equal(refundQuote(order, [1, 2]).refundCents, 66);
  assert.equal(refundQuote(order, [0, 0]).refundCents, 34);
  assert.throws(() => refundQuote(order, []));
  assert.throws(() => refundQuote(order, [-1]));
  assert.throws(() => refundQuote({ ...order, refundedTravelers: [0] }, [0]));
  assert.throws(() => refundQuote({ ...order, status: 'pending' }, [0]));
});

test('partial then full refunds cannot duplicate or exceed the discounted payment', async () => {
  const adapter = createDemoPaymentAdapter({ latency: 0 });
  const order = await paid(adapter, { ...details(), coupon: 'DEMO100' });
  let result = await adapter.requestRefund(order.id, [0]);
  assert.equal(result.refund.refundCents, 1470000);
  assert.match(refundPage(result, []), /等待处理/);
  await assert.rejects(adapter.requestRefund(order.id, [1]), /正在处理中/);
  result = await adapter.completeDemoRefund(order.id);
  assert.equal(result.status, 'paid');
  assert.deepEqual(result.refundedTravelers, [0]);
  assert.match(orderCard(result), /部分退款/);
  assert.match(orderPage(result), /部分退款/);
  await assert.rejects(adapter.requestRefund(order.id, [0]));
  await adapter.requestRefund(order.id, [1]);
  result = await adapter.completeDemoRefund(order.id);
  assert.equal(result.status, 'refunded');
  assert.match(refundPage(result, []), /退款演示已完成/);
  await assert.rejects(adapter.completeDemoRefund(order.id));
  await assert.rejects(adapter.preparePayment(order.id));
  await assert.rejects(adapter.cancelOrder(order.id));
});

test('commercial boundaries remain clear in contract and refund screens', () => {
  assert.match(policiesContent(), /不是.*商业承诺/);
  assert.match(documentsPage({ signatures: {} }), /不会形成正式合同/);
  assert.match(reviewBookingPage({ route: 'ali', date: '2026-09-22', people: 2, booking: details() }), /刷新后清除/);
});
