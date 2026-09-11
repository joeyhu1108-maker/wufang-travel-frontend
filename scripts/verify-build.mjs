import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {assetUrl,routes,stops,galleries,heroScenes,questions} from '../src/wufang/model.mjs';

const root=new URL('../',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('docs/asset-manifest.json',root),'utf8'));
const bundled=new Set(manifest.assets.map((asset)=>`./${asset.file}`));
const used=[
  ...Object.values(routes).map((route)=>route.image),
  ...stops.map((stop)=>stop.image),
  ...Object.values(galleries).flatMap((gallery)=>gallery.images.map(([name])=>name)),
  ...heroScenes.map(([name])=>name),
  ...questions.map((question)=>question.scene),
  'wufang-mark-v36-inkgrain.svg',
];
for(const name of used)assert.ok(bundled.has(assetUrl(name)),`Missing dynamic image: ${name}`);

for(const asset of manifest.assets){
  for(const directory of ['public','dist']){
    const bytes=await readFile(new URL(`${directory}/${asset.file}`,root));
    assert.equal(bytes.length,asset.bytes,`${directory}/${asset.file}: size changed`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,`${directory}/${asset.file}: content changed`);
  }
}

const html=await readFile(new URL('dist/index.html',root),'utf8');
for(const [,url] of html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)){
  assert.ok(url.startsWith('./'),`Resource must work in a subdirectory: ${url}`);
  await readFile(new URL(`dist/${url}`,root));
}

async function inspect(directory){
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const path=new URL(entry.name+(entry.isDirectory()?'/':''),directory);
    if(entry.isDirectory()){await inspect(path);continue;}
    if(!/\.(html|js|css)$/.test(entry.name))continue;
    const text=await readFile(path,'utf8');
    assert.doesNotMatch(text,/\/spark\/|feishuapp\.com|miaoda-git|@lark-apaas/,`Platform dependency in ${fileURLToPath(path)}`);
    assert.doesNotMatch(text,/(?:src|href)=["']https?:|url\(["']?https?:/,`External resource in ${fileURLToPath(path)}`);
  }
}
await inspect(new URL('dist/',root));
console.log(`Portable build verified: ${manifest.assets.length} media files, relative resources, no platform runtime dependency.`);
