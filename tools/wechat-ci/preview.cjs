const { readFileSync, realpathSync, statSync, mkdirSync } = require('node:fs');
const { resolve, relative, isAbsolute } = require('node:path');
const { createPrivateKey } = require('node:crypto');

async function main() {
  const root = resolve(__dirname, '../..');
  const projectPath = realpathSync(resolve(root, 'miniprogram'));
  const projectConfig = JSON.parse(readFileSync(resolve(projectPath, 'project.config.json'), 'utf8'));
  const local = JSON.parse(readFileSync(resolve(root, '.wechat-ci.local.json'), 'utf8'));
  const privateKeyPath = realpathSync(local.privateKeyPath);
  const keyRelative = relative(projectPath, privateKeyPath);
  if (!keyRelative.startsWith('../') && !isAbsolute(keyRelative)) throw new Error('私钥必须保存在小程序源码目录外。');
  if (projectConfig.appid !== local.appid) throw new Error('本机配置与项目 AppID 不一致。');
  if (process.platform !== 'win32' && (statSync(privateKeyPath).mode & 0o077)) throw new Error('私钥须设置为仅当前用户可读写（600）。');
  const key = createPrivateKey(readFileSync(privateKeyPath));
  if (key.asymmetricKeyType !== 'rsa' || key.asymmetricKeyDetails.modulusLength < 2048) throw new Error('上传私钥不是有效的 RSA 2048 位或以上密钥。');

  console.log(`本机配置通过：${projectConfig.appid}；私钥有效且不在源码包内。`);
  if (!process.argv.includes('--send')) {
    console.log('未联网、未上传。IP 白名单和开发预览授权确认后，才可执行 preview。');
    return;
  }
  if (local.uploadIpWhitelistConfirmed !== true || local.developmentPreviewAuthorized !== true || local.ciDependencyRiskReviewed !== true) throw new Error('上传白名单、开发预览授权或 CI 依赖风险尚未确认，停止联网。');
  const ci = require('miniprogram-ci');
  const output = resolve(root, 'qa-output/wechat-ci');
  mkdirSync(output, { recursive: true });
  const qrcodeOutputDest = resolve(output, 'development-preview.jpg');
  const project = new ci.Project({
    appid: projectConfig.appid,
    type: 'miniProgram',
    projectPath,
    privateKeyPath,
    ignores: ['node_modules/**/*', '**/*.key', '**/*.pem'],
  });
  await ci.preview({
    project,
    desc: '无方旅行开发验证：非体验版，非正式服务',
    setting: { useProjectConfig: true },
    qrcodeFormat: 'image',
    qrcodeOutputDest,
    onProgressUpdate: () => {},
  });
  console.log(`开发预览二维码：${qrcodeOutputDest}`);
  console.log('仅为开发预览；不等于体验版上传、微信真机验收、提审或发布。');
}

main().catch(() => {
  console.error('检查／预览未完成。请检查本机配置、私钥权限及微信上传授权；未打印密钥或原始响应。');
  process.exitCode = 1;
});
