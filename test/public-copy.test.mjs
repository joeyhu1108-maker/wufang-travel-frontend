import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { copyPublicDir } from '../scripts/guarded-public-copy.mjs';

async function workspace(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'wufang-public-copy-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'public');
  await mkdir(path.join(source, 'media'), { recursive: true });
  await writeFile(path.join(source, 'index.html'), '<!doctype html>');
  await writeFile(path.join(source, 'media/clip.bin'), Buffer.from([0, 1, 2, 255]));
  return { source, destination: path.join(root, 'dist') };
}

test('public copy reproduces nested files byte for byte', async (t) => {
  const { source, destination } = await workspace(t);
  const result = await copyPublicDir(source, destination);
  assert.equal(result.entries, 3);
  assert.equal(await readFile(path.join(destination, 'index.html'), 'utf8'), '<!doctype html>');
  assert.deepEqual(await readFile(path.join(destination, 'media/clip.bin')), Buffer.from([0, 1, 2, 255]));
});

test('public copy names the file it is stuck on and fails instead of hanging', { skip: process.platform === 'win32' }, async (t) => {
  const { source, destination } = await workspace(t);
  const blocked = path.join(source, 'media/placeholder.mp4');
  // A FIFO with no writer blocks a read forever, like a cloud-drive file that never downloads.
  execFileSync('mkfifo', [blocked]);
  const started = Date.now();
  await assert.rejects(
    copyPublicDir(source, destination, { stallMs: 300 }),
    (error) => error.message.includes('stalled') && error.message.includes(blocked),
  );
  assert.ok(Date.now() - started < 5000);
});
