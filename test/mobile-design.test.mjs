import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { routes, departures, money, shortDate, normalizeSearch, firstDeparture, matchingRoutes, demoOrder } from '../public/mobile-design/data.mjs';
import { routeCard, icon, brandLogo, heroHeader } from '../public/mobile-design/components.mjs';

const card = search => routeCard(routes.ali, { money, shortDate, departures, search });

test('mobile itineraries retain the established separate arrival day', () => {
  for (const route of Object.values(routes)) {
    assert.match(route.itinerary[0], /抵达/);
    assert.equal(route.itinerary.length, route.days + 1);
  }
});

test('search preserves party size when a selected departure has insufficient places', () => {
  const search = normalizeSearch({ date: '2026-10-06', people: 6 });
  assert.equal(search.people, 6);
  assert.equal(firstDeparture(search), '');
  assert.deepEqual(matchingRoutes(search), []);
});

test('six travelers see the first departure that can accommodate all of them', () => {
  const search = normalizeSearch({ people: 6 });
  assert.equal(firstDeparture(search), '2026-09-29');
  assert.match(card(search), /最近：09\.29 · 余 6/);
});

test('a selected departure is reflected on route cards', () => {
  const search = normalizeSearch({ date: '2026-10-13', people: 2 });
  assert.match(card(search), /所选：10\.13 · 余 5/);
});

test('route cards expose separate named route and save buttons', () => {
  const markup = card(normalizeSearch());
  assert.match(markup, /class="route-card-open"[^>]*aria-label="查看阿里大环线"/);
  assert.match(markup, /aria-label="收藏 阿里大环线" aria-pressed="false"/);
  assert.equal((markup.match(/<button /g) || []).length, 2);
});

test('shared navigation uses a mobile forward chevron and the complete approved logo', () => {
  assert.match(icon('arrow'), /m9 5 7 7-7 7/);
  assert.ok(heroHeader('list').includes(brandLogo()));
  assert.doesNotMatch(heroHeader('list'), /top-brand-copy|WUFANG TRAVEL|<strong>/);
  assert.match(heroHeader('list'), /aria-label="分享"/);
});

test('brand logo preserves the approved self-contained artwork without a typeset substitute', () => {
  assert.match(brandLogo(), /wufang-lockup-final-v1-transparent\.svg/);
  assert.match(brandLogo(), /width="84" height="84" alt="无方旅行"/);
  const artwork = readFileSync(new URL('../public/media/wufang-lockup-final-v1-transparent.svg', import.meta.url));
  assert.equal(createHash('sha256').update(artwork).digest('hex'), '6ee40794996c6f5974cffd35d1c456e605603574159ace315f2da58bd756e266');
  const ui = readFileSync(new URL('../public/mobile-design/ui.js', import.meta.url), 'utf8');
  assert.match(ui, /class="home-identity">\$\{brandLogo\(\)\}/);
  const commerce = readFileSync(new URL('../public/mobile-design/commerce.mjs', import.meta.url), 'utf8');
  assert.match(commerce, /class="commerce-brand">\$\{brandLogo\(\)\}/);
  assert.doesNotMatch(ui, /wufang-mark-micro|top-brand-copy/);
});

test('invalid inventory is rejected instead of fabricating a demo order', () => {
  assert.equal(demoOrder('ali', '2026-10-06', 6), null);
  assert.equal(demoOrder('ali', '2026-10-06', 0), null);
  assert.equal(demoOrder('ali', '2026-10-06', 2).total, 29600);
});
