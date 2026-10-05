// Package the verified static build for the existing Miaoda host; portable sources stay unchanged.
import { readFile, readdir, mkdir, writeFile, rename } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';

const appId = 'app_17d6fc497ns';
const origin = 'https://hvl3us5nps.feishuapp.com';
const release = 'mobile-preview-20260924';
const publicBase = `/app/${appId}/${release}/`;
const target = path.resolve('../wufang-travel-h5-hosted/public', release);
const manifest = JSON.parse(await readFile('docs/asset-manifest.json', 'utf8'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function cli(...args) {
  const result = JSON.parse(execFileSync('lark-cli', ['apps', ...args, '--app-id', appId, '--as', 'user'], {
    encoding: 'utf8', maxBuffer: 5_000_000,
    env: { ...process.env, LARKSUITE_CLI_NO_UPDATE_NOTIFIER: '1', LARKSUITE_CLI_NO_SKILLS_NOTIFIER: '1' }
  }));
  if (!result.ok) throw new Error('Miaoda operation failed');
  return result.data;
}
const listing = cli('+file-list', '--page-size', '200');
if (listing.has_more) throw new Error('Resolve all existing media pages before uploading');
const urls = {};
for (const asset of manifest.assets) {
  const name = path.basename(asset.file);
  const bytes = await readFile(path.join('dist', asset.file));
  if (digest(bytes) !== asset.sha256) throw new Error(`Build media changed: ${name}`);
  const matches = listing.items.filter(item => item.file_name === name && item.size_bytes === bytes.length);
  let remote = matches.at(-1);
  if (!remote) {
    console.log(`Uploading ${name} (${(bytes.length / 1e6).toFixed(2)} MB)`);
    remote = cli('+file-upload', '--file', path.join('dist', asset.file));
  }
  const url = new URL(remote.download_url, origin).href;
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok || digest(Buffer.from(await response.arrayBuffer())) !== asset.sha256) {
    throw new Error(`Anonymous media integrity check failed: ${name}`);
  }
  urls[name] = url;
  console.log(`Verified ${name}`);
}

await mkdir(target, { recursive: true });
async function copyText(source, destination) {
  let text = await readFile(source, 'utf8');
  let usesResolver = false;
  text = text.replace(/\.\.\/media\/\$\{([^}]+)\}/g, (_, expression) => {
    usesResolver = true;
    return '${mediaUrl(' + expression + ')}';
  });
  text = text.replace(/\.\.\/media\/([\w.-]+)/g, (_, name) => {
    if (!urls[name]) throw new Error(`Missing media mapping: ${name}`);
    return urls[name];
  });
  if (usesResolver) text = "import { mediaUrl } from './media-urls.mjs';\n" + text;
  if (source.startsWith('dist/mobile-design/')) {
    text = text.replaceAll('../explore-field/index.html', `${publicBase}explore-field/index.html`);
  }
  // The host canonicalizes index.html to a path without a trailing slash.
  if (source === 'dist/mobile-design/index.html') {
    text = text.replace(/((?:href|src)=["'])\.\//g, `$1${publicBase}`);
  }
  if (source === 'dist/explore-field/index.html') {
    text = text.replace(/((?:href|src)=["'])\.\.\/assets\//g, `$1${publicBase}assets/`);
  }
  if (/^dist\/assets\/field-.*\.js$/.test(source)) {
    text = text.replace(/(["'`])\.\/(modulepreload-polyfill-[\w-]+\.js)\1/g, `$1${origin}${publicBase}assets/$2$1`);
    text = text.replace(/new URL\((["'`])(maplibre-gl-worker-[\w-]+\.js)\1,\s*import\.meta\.url\)\.href/g, (_, quote, name) =>
      `(await (async () => { const response = await fetch("${origin}${publicBase}assets/${name}"); if (!response.ok) throw new Error("Unable to load map worker"); return URL.createObjectURL(new Blob([await response.text()], {type: "text/javascript"})); })())`);
  }
  if (text.includes('../media/')) throw new Error(`Unmapped media reference: ${source}`);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, text);
}
for (const name of await readdir('dist/mobile-design')) {
  if (!/\.(html|css|m?js)$/.test(name)) throw new Error(`Unexpected public file: ${name}`);
  await copyText(`dist/mobile-design/${name}`, path.join(target, name));
}
await writeFile(path.join(target, 'media-urls.mjs'), `const urls = ${JSON.stringify(urls, null, 2)};\nexport const mediaUrl = name => urls[name];\n`);
await copyText('dist/explore-field/index.html', path.join(target, 'explore-field/index.html'));
for (const name of await readdir('dist/assets')) {
  if (/^(field-|maplibre-gl-worker-|modulepreload-polyfill-)/.test(name)) {
    await copyText(`dist/assets/${name}`, path.join(target, 'assets', name));
  }
}
// Miaoda serves .mjs as octet-stream; .js preserves ES modules with the correct MIME type.
for (const name of await readdir(target)) {
  if (name !== 'ui.js' && !name.endsWith('.mjs')) continue;
  const file = path.join(target, name);
  const source = await readFile(file, 'utf8');
  // Each module must request its own signed CDN redirect through the stable app URL.
  await writeFile(file, source.replace(/(['"])\.\/([\w-]+)\.mjs\1/g, `$1${origin}${publicBase}$2.js$1`));
  if (name.endsWith('.mjs')) await rename(file, file.replace(/\.mjs$/, '.js'));
}
await mkdir('qa-output', { recursive: true });
await writeFile('qa-output/miaoda-preview-media.json', JSON.stringify({ appId, release, urls }, null, 2));
console.log(`Prepared ${target}; source app, old H5, and original media unchanged.`);
