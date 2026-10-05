import test from 'node:test';
import assert from 'node:assert/strict';
import { routes, departures, money, endDate, demoOrder } from '../public/mobile-design/data.mjs';
import { groupFilters, emptyGroupFilters, groupResults, groupBooking, departureCard, groupBookingPage, groupFilterSheet } from '../public/mobile-design/group-picker.mjs';

const results = (filters = {}, search = {}) => groupResults({ ...emptyGroupFilters(), ...filters }, { query: '', people: 1, ...search });

test('group list reuses both approved routes and all five fixture dates', () => {
  assert.deepEqual(results().map(item => item.route.id), ['ali', 'kora']);
  for (const item of results()) assert.deepEqual(item.dates, Object.keys(departures));
});

test('date filtering supports months and exact departures', () => {
  assert.deepEqual(results({ date: '2026-09' })[0].dates, ['2026-09-22', '2026-09-29']);
  assert.equal(results({ date: '2026-10' })[0].dates.length, 3);
  assert.deepEqual(results({ date: '2026-10-13' })[0].dates, ['2026-10-13']);
});

test('party size and remaining capacity are intersected, not silently changed', () => {
  assert.deepEqual(results({}, { people: 6 })[0].dates, ['2026-09-29']);
  assert.deepEqual(results({ date: '2026-10-06' }, { people: 3 }), []);
  assert.deepEqual(results({ availability: 'few' }, { people: 3 }), []);
  assert.deepEqual(results({ availability: 'few' }, { people: 2 })[0].dates, ['2026-10-06']);
  assert.ok(results({ availability: 'roomy' })[0].dates.every(date => departures[date] >= 4));
});

test('style, region, query and date filters work together', () => {
  const items = results({ style: 'trek', region: 'tibet', date: '2026-09' }, { query: '冈仁波齐' });
  assert.equal(items.length, 1);
  assert.equal(items[0].route.id, 'kora');
  assert.equal(items[0].dates.length, 2);
  assert.deepEqual(results({ style: 'road' }, { query: '不存在的路线' }), []);
});

test('sorting never mutates source data or the default ordering', () => {
  assert.deepEqual(results({ sort: 'price-down' }).map(item => item.route.price), [18800, 14800]);
  assert.deepEqual(results({ sort: 'price-up' }).map(item => item.route.price), [14800, 18800]);
  assert.deepEqual(results({ sort: 'days' }).map(item => item.route.days), [10, 13]);
  assert.deepEqual(results().map(item => item.route.id), ['ali', 'kora']);
});

test('each departure opens booking with the exact route, date, month and party size', () => {
  for (const { route, dates } of results()) {
    for (const date of dates) {
      const booking = groupBooking(route.id, date, 2);
      assert.deepEqual(booking, { route: route.id, date, month: Number(date.slice(5, 7)), people: 2 });
      assert.equal(demoOrder(booking.route, booking.date, booking.people).total, route.price * 2);
      const page = groupBookingPage(route, date, 2);
      assert.ok(page.includes(money(route.price * 2)));
      assert.ok(page.includes(endDate(date, route.days).slice(5).replace('-', '.')));
    }
  }
});

test('invalid or insufficient inventory cannot start the booking flow', () => {
  assert.equal(groupBooking('unknown', '2026-09-22', 1), null);
  assert.equal(groupBooking('ali', '2026-09-23', 1), null);
  assert.equal(groupBooking('ali', '2026-10-06', 3), null);
  assert.equal(groupBooking('ali', '2026-09-22', 0), null);
});

test('cards expose separate detail, save and dated booking actions', () => {
  const card = departureCard(results({ date: '2026-10-06' })[0], true);
  assert.equal((card.match(/data-action="group-book"/g) || []).length, 1);
  assert.match(card, /data-route="ali" data-date="2026-10-06"/);
  assert.match(card, /aria-label="取消收藏 阿里大环线" aria-pressed="true"/);
  assert.match(card, /10\.06/);
  assert.match(card, /10\.15/);
  assert.doesNotMatch(card, /已成团|即将成团|大巴团|拼小车/);
});

test('all five filters have a reset option and a selected draft; applying is explicit', () => {
  for (const key of Object.keys(groupFilters)) {
    const sheet = groupFilterSheet(key, emptyGroupFilters());
    assert.match(sheet, /value="all" checked/);
    assert.match(sheet, /data-action="group-apply"/);
    assert.match(sheet, /data-action="group-reset-one"/);
    assert.match(sheet, /data-action="close"/);
  }
});

test('compact confirmation reuses the approved brand and caps people at available places', () => {
  const page = groupBookingPage(routes.ali, '2026-10-06', 2);
  assert.match(page, /wufang-lockup-final-v1-transparent\.svg/);
  assert.match(page, /aria-label="增加人数" disabled/);
  assert.match(page, /data-go="traveler"/);
  assert.match(page, /data-action="group-change-date"/);
});
