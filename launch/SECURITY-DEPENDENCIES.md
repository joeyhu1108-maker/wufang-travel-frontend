# 云 SDK 依赖安全｜当前发布阻断

检查日期：2026-10-05。未部署该 SDK 到正式云环境。

本轮按 npm 官方 registry 元数据固定 `wx-server-sdk@4.0.2` 并生成锁文件。其依赖 `@cloudbase/node-sdk@3.17.2`，进一步引入 `@cloudbase/database@1.4.3`、`axios@0.27.2`、`lodash.set@4.3.2` 和 `lodash.unset@4.5.2`。

当前生产依赖审计报告 **6 项：5 项 high、1 项 moderate**（包括直接／传递影响，不代表 6 个独立业务漏洞）。涉及 Axios 安全问题及 Lodash 原型污染风险。`@cloudbase/node-sdk` 当前最新 registry 版本的依赖仍包含这些旧版本，因此不能仅升级 SDK 名称便宣称修复。

## 处理原则

1. 保留官方锁定版本和审计证据，禁止 `npm audit fix --force` 盲目降级或强行 override 不兼容的大版本。
2. 由交付方核对具体调用路径及厂商兼容说明，选择正式修复版本，或经过验证的补丁／替代服务端接入。
3. 若采用依赖替换，必须完成 SDK 导入、数据库读取／写入／事务、可信上下文、异常及真实云运行时回归。仅 `npm audit` 变绿不代表兼容。
4. 不用前端白名单或“没有对公网”当依赖修复证明；它们仅降低部分攻击面。
5. 高风险未处理前不得生产发布。低风险例外也应由有责任的安全／甲方负责人书面批准并保留理由与期限，不擅自豁免。

## 重跑

```sh
npm run audit:cloud
npm run check:release
```

严格检查即时审计并记录脱敏摘要到 `qa-output/miniprogram-release.json`。离线／registry 故障时判为未验证，不当作零漏洞。风险处理记录放在单独证据文件，再完成 `acceptance.json` 的安全项。

SDK 官方代码：[wechat-miniprogram/wx-server-sdk](https://github.com/wechat-miniprogram/wx-server-sdk)。registry 版本与审计结果可能变化，每次发布必须重新检查。
