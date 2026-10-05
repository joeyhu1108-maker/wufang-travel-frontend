import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { companionMedia, companionsTeaser, companionsPage, routeCompanions, companionViewer } from '../public/mobile-design/companions.mjs';
import { brandLogo } from '../public/mobile-design/components.mjs';

test('journey selection contains four photographs and two real video clips', () => {
  const media = Object.values(companionMedia);
  assert.equal(media.filter(item => item.type === 'image').length, 4);
  assert.equal(media.filter(item => item.type === 'video').length, 2);
  for (const item of media) {
    assert.ok(item.width > 0 && item.height > 0 && item.alt.length > 0);
  }
});

test('home and gallery load posters, not video files, before explicit playback', () => {
  for (const markup of [companionsTeaser(), companionsPage()]) {
    assert.doesNotMatch(markup, /<video|src="[^"]*\.mp4/);
    assert.match(markup, /loading="lazy"/);
  }
  const gallery = companionsPage();
  assert.match(gallery, /aria-label="播放：雪山下，歇一会儿"/);
  assert.match(gallery, /aria-label="播放：天色蓝下来以后"/);
  assert.match(gallery, /companions-rest-poster\.jpg/);
  assert.match(gallery, /companions-bluehour-poster\.jpg/);
});

test('viewer provides native controls, silent inline playback and a readable failure state', () => {
  const markup = companionViewer('rest');
  assert.match(markup, /controls playsinline muted preload="metadata"/);
  assert.match(markup, /aria-describedby="companion-description"/);
  assert.match(markup, /role="status" hidden/);
  assert.equal(companionViewer('unknown'), '');
  assert.doesNotMatch(companionViewer('lakeside'), /<video/);
});

test('gallery preserves originating route and approved brand artwork', () => {
  assert.match(companionsPage('detail'), /data-go="detail" aria-label="返回"/);
  assert.match(companionsPage('mine'), /data-go="mine" aria-label="返回"/);
  assert.ok(companionsPage().includes(brandLogo()));
  assert.match(routeCompanions('ali'), /companions-lakeside\.jpg/);
  assert.match(routeCompanions('kora'), /companions-walking\.jpg/);
});

test('all selected files and posters have verified local bytes and provenance', () => {
  const manifest = JSON.parse(readFileSync(new URL('../docs/asset-manifest.json', import.meta.url), 'utf8'));
  for (const item of Object.values(companionMedia)) {
    for (const file of [item.file, item.poster].filter(Boolean)) {
      const entry = manifest.assets.find(asset => asset.file === `media/${file}`);
      assert.ok(entry, `Missing provenance: ${file}`);
      const data = readFileSync(new URL(`../public/media/${file}`, import.meta.url));
      assert.equal(data.length, entry.bytes);
      assert.equal(createHash('sha256').update(data).digest('hex'), entry.sha256);
      assert.ok(entry.sourceFile && entry.rightsStatus);
    }
  }
});
