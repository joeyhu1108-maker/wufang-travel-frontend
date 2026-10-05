// Child of guarded-public-copy.mjs. Names each entry on stdout before touching it,
// so the parent knows which path a blocking fs call is stuck on.
import { copyFileSync, mkdirSync, readdirSync, statSync, writeSync } from 'node:fs';
import path from 'node:path';

const [source, destination] = process.argv.slice(2);

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from)) {
    const entry = path.join(from, name);
    if (entry === destination) continue;
    writeSync(1, `${entry}\n`);
    if (statSync(entry).isDirectory()) copyTree(entry, path.join(to, name));
    else copyFileSync(entry, path.join(to, name));
  }
}

try {
  copyTree(source, destination);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
