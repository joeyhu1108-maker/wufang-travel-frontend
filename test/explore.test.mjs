import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { routes, stops } from '../src/wufang/model.mjs';
import { exploreRoutes } from '../public/mobile-design/explore-data.mjs';
import { profilePoints, exploreHandbook, mountExplore, roamingChapters, chapterAtReadingLine } from '../public/mobile-design/explore.mjs';
import { sceneCamera, nextForecastHour } from '../src/explore-field/presentation.mjs';
import { navMarkup } from '../public/mobile-design/components.mjs';
import { openingFilm, storyAt } from '../public/mobile-design/opening.mjs';

test('explore retains source itineraries, overnight elevations, stop mapping and images', () => {
  for (const [mobile,source] of [['ali','ten'],['kora','thirteen']]) {
    const route = exploreRoutes[mobile];
    assert.deepEqual(route.days, routes[source].days);
    assert.deepEqual(route.stops, stops.map(stop => ({ ...stop, day: stop.day[source] })));
    for (const stop of route.stops) assert.ok(existsSync(new URL('../public/media/'+stop.image, import.meta.url)));
    assert.equal(route.days.length, route.daysCount+1);
    assert.ok(profilePoints(route.days).every(([x,y]) => x >= 20 && x <= 320 && y > 0 && y < 128));
  }
});

test('four tabs preserve existing destinations and expose exactly one current page', () => {
  for (const page of ['home','list','explore','mine']) {
    const nav = navMarkup(page);
    assert.equal((nav.match(/<button /g) || []).length, 4);
    assert.equal((nav.match(/aria-current="page"/g) || []).length, 1);
    assert.match(nav, new RegExp('aria-current="page" data-go="'+page+'"'));
  }
});

test('story captions follow the planned sequence and never reference a nonexistent film', () => {
  assert.match(storyAt(0).line, /远方/);
  assert.match(storyAt(5).line, /相伴/);
  assert.match(storyAt(15).line, /托底/);
  assert.ok(existsSync(new URL('../public/mobile-design/'+openingFilm.poster, import.meta.url)));
  assert.match(openingFilm.src, /^\.\.\/media\/wufang-opening-seedance25-v1\.mp4$/);
  const film = readFileSync(new URL('../public/mobile-design/'+openingFilm.src, import.meta.url));
  assert.equal(film.toString('ascii', 4, 8), 'ftyp');
  assert.ok(film.length > 1000000, 'the real video is bundled, not a placeholder');
});

test('explore lazily mounts the 3D field and preserves the original purchase-demo boundary', () => {
  const ui = readFileSync(new URL('../public/mobile-design/ui.js', import.meta.url), 'utf8');
  const explore = readFileSync(new URL('../public/mobile-design/explore.mjs', import.meta.url), 'utf8');
  const commerce = readFileSync(new URL('../public/mobile-design/commerce.mjs', import.meta.url), 'utf8');
  assert.match(ui, /page === 'explore'\) mountExplore\(app\)/);
  assert.match(ui, /createDemoPaymentAdapter/);
  assert.match(commerce, /支付沙盒 · 不会真实扣款/);
  assert.match(explore, /mode === 'weather'/);
  assert.match(explore, /loading="lazy"/);
  assert.match(explore, /非导航轨迹/);
});

test('handbook presents roaming first, highlights 3D second and loads no map until entry', () => {
  const html = exploreHandbook();
  assert.ok(html.indexOf('href="#explore-roam"') < html.indexOf('href="#explore-weather"'));
  assert.match(html, /chapter-weather/);
  assert.match(html, /wufang-lockup-final-v1-transparent.svg/);
  assert.doesNotMatch(html, /iframe|maplibre/i);
  for (const image of html.matchAll(/src="\.\.\/media\/([^"]+)"/g)) {
    assert.ok(existsSync(new URL('../public/media/' + image[1], import.meta.url)));
  }
});

test('3D entry has a direct handbook return and leaves no iframe on returning to handbook', () => {
  const container = { innerHTML: '' };
  mountExplore(container, 'weather');
  assert.match(container.innerHTML, /href="#explore"/);
  assert.match(container.innerHTML, /explore-immersive/);
  assert.equal((container.innerHTML.match(/<iframe/g) || []).length, 1);
  mountExplore(container);
  assert.doesNotMatch(container.innerHTML, /iframe/);
  const ui = readFileSync(new URL('../public/mobile-design/ui.js', import.meta.url), 'utf8');
  assert.match(ui, /page === 'explore-roam'\) cleanupExplore = mountExplore\(app, 'route'\)/);
  assert.match(ui, /page === 'explore-weather'\) mountExplore\(app, 'weather'\)/);
});

test('summit framing reserves space for top and bottom or landscape side controls', () => {
  const place = { coordinates: [86.925,27.9881], camera: {zoom:10.82,pitch:79,bearing:-27} };
  for (const viewport of [{width:320,height:510,dockHeight:224},{width:390,height:786,dockHeight:256},{width:844,height:332,dockHeight:332}]) {
    const camera = sceneCamera(place, viewport);
    assert.deepEqual(camera.center, place.coordinates);
    assert.ok(viewport.height - camera.padding.top - camera.padding.bottom >= 150);
    assert.ok(viewport.width - camera.padding.left - camera.padding.right >= 240);
    assert.ok(camera.pitch < 79);
  }
});

test('forecast playback reaches the last real hour without wrapping or exceeding data', () => {
  assert.equal(nextForecastHour(0,72),1);
  assert.equal(nextForecastHour(70,72),71);
  assert.equal(nextForecastHour(71,72),71);
  assert.equal(nextForecastHour(0,1),0);
});

test('scroll chapters retain all six source stories and route-specific day and overnight heights', () => {
  for (const route of Object.values(exploreRoutes)) {
    const html = roamingChapters(route);
    assert.equal((html.match(/<article /g) || []).length, 6);
    assert.equal((html.match(/loading="lazy"/g) || []).length, 5);
    for (const [i, stop] of route.stops.entries()) {
      assert.match(html, new RegExp(`data-story-stop="${i}"`));
      assert.ok(html.includes(stop.description));
      assert.ok(html.includes(`当晚停留参考海拔 ${route.days[stop.day][1]}`));
      assert.ok(html.includes(`id="roam-title-${i}">${stop.name}</h2>`));
    }
    assert.match(html, /抵达日/);
    assert.ok(html.includes(`DAY ${String(route.daysCount).padStart(2,'0')}`));
  }
});

test('scroll reading line handles forward, reverse, first, last and a fast multi-chapter jump', () => {
  assert.equal(chapterAtReadingLine([460,1100,1740,2380,3020,3660],240),0);
  assert.equal(chapterAtReadingLine([-420,220,860,1500,2140,2780],240),1);
  assert.equal(chapterAtReadingLine([-100,540,1180,1820,2460,3100],240),0);
  assert.equal(chapterAtReadingLine([-2340,-1700,-1060,-420,220,860],240),4);
  assert.equal(chapterAtReadingLine([-4000,-3360,-2720,-2080,-1440,-800],240),5);
});

test('roaming uses native passive scrolling, removes listeners and restores reading position', () => {
  const explore = readFileSync(new URL('../public/mobile-design/explore.mjs', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../public/mobile-design/ui.js', import.meta.url), 'utf8');
  assert.match(explore, /addEventListener\('scroll', scheduleScroll, \{ passive: true \}\)/);
  assert.match(explore, /removeEventListener\('scroll', scheduleScroll\)/);
  assert.match(explore, /top: state.scrollTop/);
  assert.match(explore, /behavior: reducedMotion \? 'instant' : 'smooth'/);
  assert.doesNotMatch(explore, /preventDefault|addEventListener\(['"](?:wheel|touchmove)/);
  assert.match(ui, /cleanupExplore\?\.\(\)/);
});
