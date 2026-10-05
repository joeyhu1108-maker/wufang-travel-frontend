import { readFileSync, readdirSync, existsSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const native = resolve(root, 'miniprogram');
const strict = process.argv.includes('--release');
const require = createRequire(import.meta.url);
const config = require('../miniprogram/config.js');
const errors = [], blockers = [];
const json = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
function filesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) return [];
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : [path];
  });
}
const files = [...filesIn(native), ...filesIn(resolve(root, 'cloudfunctions/wufangApi'))];
for (const file of files) {
  if (file.endsWith('.json')) {
    try { JSON.parse(readFileSync(file, 'utf8')); } catch (_) { errors.push(`JSON 无法解析：${relative(root, file)}`); }
  }
  if (file.endsWith('.js')) {
    const check = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (check.status !== 0) errors.push(`JS 语法失败：${relative(root, file)}`);
    if (file.startsWith(native) && /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|(?:apiV3Key|merchantSecret|SecretKey)\s*[:=]\s*['"][^'"]+/.test(readFileSync(file, 'utf8'))) errors.push(`客户端疑似含私密凭证：${relative(root, file)}`);
  }
  if (file.endsWith('.wxml')) {
    const source = readFileSync(file, 'utf8');
    const js = file.replace(/\.wxml$/, '.js');
    const page = existsSync(js) ? readFileSync(js, 'utf8') : '';
    for (const [, handler] of source.matchAll(/(?:bind|catch):?\w+="([a-zA-Z_$][\w$]*)"/g)) {
      if (!new RegExp(`\\b${handler}\\s*\\(`).test(page)) errors.push(`事件未实现：${relative(root, file)} → ${handler}`);
    }
    for (const [, asset] of source.matchAll(/src="(\/assets\/[^"{]+)"/g)) {
      if (!existsSync(resolve(native, `.${asset}`))) errors.push(`素材缺失：${asset}`);
    }
    if (/<\/?(?:div|span|br|img|iframe|video-js)\b/.test(source)) errors.push(`混入 Web 标签：${relative(root, file)}`);
  }
}
const app = json('miniprogram/app.json'), project = json('miniprogram/project.config.json');
for (const page of app.pages) {
  for (const extension of ['js', 'wxml', 'wxss']) {
    if (!existsSync(resolve(native, `${page}.${extension}`))) errors.push(`页面文件缺失：${page}.${extension}`);
  }
}
for (const tab of app.tabBar.list) if (!app.pages.includes(tab.pagePath)) errors.push(`Tab 页面未注册：${tab.pagePath}`);
if (project.setting.urlCheck !== true) errors.push('合法域名校验不得关闭');
for (const asset of ['route-ali-hero.jpg', 'region-kora-kailash.jpg', 'wufang-logo.png']) {
  if (!existsSync(resolve(native, 'assets', asset))) errors.push(`原生素材缺失：${asset}`);
}
if (existsSync(resolve(native, 'assets/wufang-logo.png'))) {
  if (!readFileSync(resolve(native, 'assets/wufang-logo.png')).subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) errors.push('Logo 必须为有效 PNG');
}
const packageBytes = filesIn(native).filter(path => !path.endsWith('/package.json')).reduce((total, path) => total + statSync(path).size, 0);
// 内部资源预算，不代替开发者工具对主包／分包的实际校验。
if (packageBytes > 2 * 1024 * 1024) errors.push(`超出当前内部主包预算 2 MiB：${packageBytes} bytes`);
if (!/^wx[a-fA-F0-9]{16}$/.test(project.appid)) blockers.push('尚未配置甲方真实 AppID（当前为测试身份）');
if (config.mode !== 'cloud') blockers.push('仍为本地预览模式，不能发布体验／正式服务');
for (const version of ['develop', 'trial', 'release']) {
  if (typeof config.environments[version] !== 'string' || !config.environments[version].trim() || /REPLACE|PLACEHOLDER/i.test(config.environments[version])) blockers.push(`${version} 云环境未配置`);
}
if (!config.privacyVersion || !config.privacyText || !config.supportPhone) blockers.push('正式隐私文本、版本和客服电话尚未确认配置');
const requiredPages = ['explore', 'community', 'checkout', 'orders', 'order-detail', 'refund'];
for (const name of requiredPages) if (!app.pages.includes(`pages/${name}/${name}`)) blockers.push(`原生 ${name} 功能尚未完成（H5 演示不能替代）`);
const acceptance = json('launch/acceptance.json');
for (const check of acceptance.checks) {
  const evidencePath = resolve(root, check.evidence || '');
  const withinProject = evidencePath.startsWith(`${root}/`) || evidencePath.startsWith(root);
  if (check.status !== 'passed' || !check.evidence || !withinProject || !existsSync(evidencePath) || !statSync(evidencePath).isFile()) blockers.push(`待真实验收：${check.title}；负责：${check.owner}`);
}
let audit = { status: 'not_run', note: '严格发布检查时运行云函数生产依赖审计' };
if (strict) {
  const result = spawnSync('npm', ['audit', '--omit=dev', '--json'], { cwd: resolve(root, 'cloudfunctions/wufangApi'), encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024 });
  try {
    const data = JSON.parse(result.stdout);
    audit = { status: data.metadata ? 'checked' : 'unavailable', vulnerabilities: data.metadata?.vulnerabilities || null };
    if (!data.metadata) blockers.push('云函数依赖审计不可用，不能跳过安全门槛');
    else if (data.metadata.vulnerabilities.total > 0) blockers.push(`云函数依赖存在 ${data.metadata.vulnerabilities.total} 项已知漏洞，需复核处理后发布`);
  } catch (_) { audit = { status: 'unavailable' }; blockers.push('云函数依赖审计失败，需恢复后重跑'); }
}
const report = {
  generatedAt: new Date().toISOString(), mode: strict ? 'release' : 'local',
  scope: '本地静态检查，不等于微信开发者工具编译、云端联调、真机或审核通过',
  nativePages: app.pages.length, nativePackageBytes: packageBytes,
  sourceFingerprint: createHash('sha256').update(files.sort().map(path => `${relative(root, path)}:${createHash('sha256').update(readFileSync(path)).digest('hex')}`).join('\n')).digest('hex'),
  technicalPassed: errors.length === 0, releaseReady: errors.length === 0 && blockers.length === 0 && strict,
  errors, blockers, audit,
};
const destination = resolve(root, `qa-output/miniprogram-${strict ? 'release' : 'local'}.json`);
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(destination, `${JSON.stringify(report, null, 2)}\n`);
console.log(`原生本地检查：${report.technicalPassed ? '通过' : '失败'}；${report.nativePages} 页；主包估算 ${(packageBytes / 1024).toFixed(0)} KiB。`);
console.log(`正式发布：${report.releaseReady ? '可继续审核流程' : '未就绪'}；${blockers.length} 项阻断。`);
for (const message of [...errors, ...blockers]) console.log(`- ${message}`);
console.log(`报告：${destination}`);
if (errors.length || (strict && blockers.length)) process.exitCode = 1;
