import test from 'node:test';
import assert from 'node:assert/strict';
import { routes } from '../public/mobile-design/data.mjs';
import { itineraryDays, itineraryPanel } from '../public/mobile-design/itinerary.mjs';
import { validPhone, maskedPhone, validateDemoCode, accountHeader, readDemoProfile } from '../public/mobile-design/auth-demo.mjs';

test('itinerary chapters preserve every source day and waypoint', () => {
  for (const route of Object.values(routes)) {
    const days = itineraryDays(route);
    assert.deepEqual(days.map(day => day.original), route.itinerary);
    assert.deepEqual(days.map(day => day.stops.join('—')), route.itinerary);
    assert.ok(days.every(day => day.title && day.lodging && day.elevation));
    const html = itineraryPanel(route);
    assert.equal((html.match(/<details /g) || []).length, route.days);
    assert.equal((html.match(/class="journey-chapter"/g) || []).length, 3);
    assert.match(html, /抵达日另列/);
    assert.match(html, /并非当天最高点/);
    assert.doesNotMatch(html, /data-action="day"/);
  }
});

test('phone and demo-code validation reject malformed or unsolicited codes', () => {
  assert.equal(validPhone('13800000000'), true);
  for (const phone of ['', '123', 'abcdefghijk', '03800000000']) assert.equal(validPhone(phone), false);
  assert.ok(validateDemoCode('123', '246810', true));
  assert.ok(validateDemoCode('13800000000', '246810', false));
  assert.ok(validateDemoCode('13800000000', '123456', true));
  assert.equal(validateDemoCode('13800000000', '246810', true), '');
  assert.equal(maskedPhone('13800000000'), '138 •••• 0000');
});

test('account UI escapes nicknames and keeps browsing available before login', () => {
  assert.match(accountHeader(null), /data-action="login"/);
  assert.match(accountHeader(null), /不必急着登录/);
  const html = accountHeader({ nickname: '<img onerror="bad">' });
  assert.doesNotMatch(html, /<img onerror/);
  assert.match(html, /&lt;img/);
  assert.match(html, /演示账号/);
  assert.equal(readDemoProfile(), null);
});
