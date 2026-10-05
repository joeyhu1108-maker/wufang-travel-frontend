// Vite copies public/ with blocking fs calls inside renderStart. One file that cannot be read
// (cloud-drive placeholder, pipe, stale mount) freezes the build right after "modules
// transformed" with no output, and Node cannot even exit while that read is pending.
// Copying in a child process lets the build name the file, kill the copy and fail.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const copier = fileURLToPath(new URL('./copy-tree.mjs', import.meta.url));

export function copyPublicDir(source, destination, { stallMs = 30_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [copier, source, destination], { stdio: ['ignore', 'pipe', 'pipe'] });
    let current = source;
    let entries = 0;
    let pending = '';
    let errors = '';
    let timer;
    const watch = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`public copy stalled: no progress for ${stallMs} ms at ${current}. The file cannot be read right now (cloud-drive placeholder not downloaded, pipe, or unreachable mount).`));
      }, stallMs);
    };
    watch();
    child.stdout.setEncoding('utf8').on('data', (chunk) => {
      const lines = (pending + chunk).split('\n');
      pending = lines.pop();
      if (!lines.length) return;
      entries += lines.length;
      current = lines.at(-1);
      watch();
    });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { errors += chunk; });
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ entries });
      else reject(new Error(`public copy failed: ${errors.trim() || `exit ${code}`}`));
    });
  });
}

export function guardedPublicCopy(options) {
  let config;
  return {
    name: 'wufang:guarded-public-copy',
    apply: 'build',
    config: () => ({ build: { copyPublicDir: false } }),
    configResolved(resolved) { config = resolved; },
    // Same order as Vite's own copy: after renderStart has emptied outDir, before chunks are written.
    // Not renderStart itself: Vite 8 does not wait for an async renderStart.
    async generateBundle() {
      const { publicDir, root, build, logger } = config;
      if (!build.write || !publicDir || !existsSync(publicDir)) return;
      const started = Date.now();
      const { entries } = await copyPublicDir(publicDir, path.resolve(root, build.outDir), options);
      logger.info(`public/ copied: ${entries} entries in ${Date.now() - started} ms`);
    },
  };
}
