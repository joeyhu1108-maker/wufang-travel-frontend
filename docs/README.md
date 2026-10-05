# 无方旅行｜文档索引

更新：2026-10-06。先读当前交接，再查功能说明；带日期的评审／验证记录只证明当次状态。它们不是已部署、已验收或已过审证明。

## 接手必读

| 顺序 | 文档 | 回答的问题 |
| --- | --- | --- |
| 1 | [Shawn 技术接力说明](SHAWN-TECHNICAL-HANDOFF-20261006.md) | 当前进度、全部限制、产品方向、责任分工、接手优先级、甲方配合 |
| 2 | [工程运行与模块详解](ENGINEERING-GUIDE.md) | 如何启动、改哪里、页面与状态、接口契约、迁移边界、协作方法 |
| 3 | [当前验证记录](VERIFICATION-20261006.md) | 本轮通过什么、失败什么、哪些完全没有验证 |
| 4 | [上线准备包](../launch/README.md) | 真实上线全流程、资料模板、开发与甲方分别补什么 |

技术跟进：[Issue #1](https://github.com/joeyhu1108-maker/wufang-travel-frontend/issues/1)。私密凭证及真实旅客信息不要写入 Issue／PR。

## 业务接口、安全与发布

| 文档／模板 | 用途 |
| --- | --- |
| [原生小程序状态](MINIPROGRAM-NATIVE.md) | 六页基础工程、导入方法与尚未迁移部分 |
| [接口与交易规范](../launch/API-AND-TRANSACTIONS.md) | 已编写的四个动作；待实现的库存、订单、支付退款、后台与社区 |
| [云部署与存储](../launch/CLOUD-DEPLOYMENT.md) | 客户云账号、购买路径、独立函数部署、数据保护与联调标准 |
| [依赖安全](../launch/SECURITY-DEPENDENCIES.md) | 云 SDK 的发布风险与复核原则 |
| [凭证配置与安全交接](CREDENTIALS-HANDOFF.md) | 密钥清单、最小权限、配置位置及 Shawn 私密交接步骤，不包含密钥 |
| [本机上传准备记录](../launch/LOCAL-UPLOAD-SETUP-20261005.md) | CI 工具、私钥保护、开发预览门槛；不是平台授权证明 |
| [真实验收与发布](../launch/TEST-AND-RELEASE.md) | 真机、交易、审核材料、发布、回滚、运营交接 |
| [条款确认模板](../launch/POLICY-DRAFTS.md) | 隐私、报名、退款、投稿及素材授权的待确认字段 |
| [验收清单](../launch/acceptance.json) | 11 类真实验收，当前全部 pending |
| [甲方资料表](../launch/甲方资料填写表.csv) / [团期资料表](../launch/团期资料模板.csv) | 空白填写模板；不要将填入隐私后的版本公开提交 |
| [路线模板](../launch/routes-template.json) | 待运营补齐、批准的路线数据，不默认上架 |
| [集合计划](../launch/cloud-collections.json) / [安全规则](../launch/database-rules.json) | 数据结构计划及客户端默认拒绝规则；不代表已经创建集合 |

## 移动端功能与设计记录

| 文档 | 用途与注意 |
| --- | --- |
| [移动端设计与设计系统](MOBILE-DESIGN.md) | 品牌、组件、图标、首页、移动端检查及历史迭代 |
| [简洁选团](GROUP-PICKER-REVIEW.md) | 筛选、横滑团期及卡片交互 |
| [逐日行程](UX-ITINERARY-REVIEW.md) | 行程阅读、每日展开与内容口径 |
| [账户与支付](PAYMENT-AND-ACCOUNT.md) | 演示账户、支付状态机和正式适配器契约 |
| [报名及服务](BOOKING-SERVICES-REVIEW.md) | 出行人、确认、出行指南、文件签署与退款演示 |
| [探索移动端](EXPLORE-MOBILE-REVIEW.md) | 漫游／三维分卡、独立场景与手机适配 |
| [社区](COMMUNITY-REVIEW.md) | 投稿、审核前私有状态、互动与本地存储边界 |
| [同行媒体](COMPANION-MEDIA.md) | 团队／旅途照片短片的位置、来源与展示边界 |
| [素材清单](asset-manifest.json) | 文件名、来源、校验值；不授予第三方素材使用权 |
| [客户反馈评审](CLIENT-FEEDBACK-20260923.md) | 历史 UX 问题及建议；其中“不增加社区”已被后续确认覆盖 |
| [探索与开屏初始记录](explore-opening.md) | 早期“视频尚未生成”记录已过时；当前开屏文件在 public/media |

## 历史版本与发布记录

- [2026-09-16 H5 发布记录](DEPLOYMENT-PREVIEW-20260916.md)、[2026-09-24 H5 发布记录](DEPLOYMENT-PREVIEW-20260924.md)：历史甲方预览，不是微信体验版。本轮没有重新部署或核验远端预览。
- [2026-10-05 验证记录](../launch/VERIFICATION-20261005.md)：历史构建与阻断快照；当前事实见 2026-10-06 记录。
- [早期 H5 交接](HANDOFF.md)、[早期预订演示](BOOKING-DEMO.md)、[V2.3 视觉](TIBET-UI.md)、[早期验证](VERIFICATION.md)：对应根路径旧 H5，不代表最新移动端或原生完成度。

若历史文字与当前源码／交接冲突，先核对文件和实际检查，再在 Issue 中指出差异；不要靠删发布门槛或改验收状态解决冲突。
