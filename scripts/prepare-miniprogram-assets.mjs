import { createRequire } from 'node:module';
import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const sharp = require(process.env.WUFANG_SHARP_MODULE || 'sharp');
const source = fileURLToPath(new URL('../public/media/', import.meta.url));
const destination = fileURLToPath(new URL('../miniprogram/assets/', import.meta.url));
mkdirSync(destination, { recursive: true });
for (const name of ['route-ali-hero.jpg', 'region-kora-kailash.jpg']) copyFileSync(`${source}${name}`, `${destination}${name}`);
// 只做格式转换，不重绘、不改变已采用的标志比例。
await sharp(`${source}wufang-lockup-final-v1-transparent.svg`).resize(256, 256).png().toFile(`${destination}wufang-logo.png`);
console.log('Native assets prepared from existing approved artwork.');
