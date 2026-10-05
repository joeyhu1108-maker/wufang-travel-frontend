# 无方旅行｜工程运行与模块详解

更新：2026-10-06。面向 Shawn 及后续工程协作者。产品现状与责任边界见 [技术接力说明](SHAWN-TECHNICAL-HANDOFF-20261006.md)，所有说明中的「演示」与「待实施」都不能当作生产能力。

## 1. 三套入口不要混淆

| 工程 | 入口 | 定位 |
| --- | --- | --- |
| 最新移动端 H5 | `public/mobile-design/index.html`；开发地址 `/mobile-design/index.html#home` | 当前品牌、UI、交互动线的参考实现 |
| 早期独立 H5 | 根目录 `index.html`、`src/wufang/` | V2.3 历史版本，独立的预订演示逻辑 |
| 原生微信小程序 | `miniprogram/` | 六个基础页面，尚未完整迁移 |
| 三维场景 | `explore-field/index.html`、`src/explore-field/`；开发地址 `/explore-field/` | H5 中按需进入的地图／天气场景，不是原生页面 |

技术栈是标准 HTML／CSS／JavaScript ES Modules + Vite，原生目录和云函数使用 CommonJS。没有完整的 Vue／React／uni-app 转换工程，不能一键生成正式小程序。根 package 的 `private: true` 是阻止 npm 发布，不代表 GitHub 仓库私有。

## 2. 克隆、启动与检查

推荐 Node.js 24。本轮实际运行：Node.js 24.18.0、npm 11.16.0；根 package 要求 Node >= 22.12.0。

```sh
git clone https://github.com/joeyhu1108-maker/wufang-travel-frontend.git
cd wufang-travel-frontend
npm ci
npm run dev
```

Vite 绑定 `127.0.0.1`。按终端实际地址打开 `/mobile-design/index.html#home`，不要写死历史 4178 端口，也不要双击 HTML。桌面展示框不等于手机真机验收。

| 命令 | 检查范围／输出 |
| --- | --- |
| `npm run check` | 已列出的前端模块语法检查，不是全仓库类型检查 |
| `npm test` | 早期 H5 与 `test/` 的 Node 自动测试，目前 109 项 |
| `npm run build` | Vite 打包根 H5、独立三维入口，复制 public 静态资源 |
| `npm run verify` | 语法 → 测试 → 构建 → `scripts/verify-build.mjs` 资源检查 |
| `npm run preview` | 已构建 dist 的本地检查，不是公网部署 |
| `npm run check:miniprogram` | 原生静态完整性及内部主包估算，允许报告上线阻断 |
| `npm run check:release` | 严格发布门禁，当前应失败，不要删检查让它变绿 |
| `npm run audit:cloud` | 独立云函数的生产依赖审计，需要网络 |

本轮 `verify` 的构建在 Vite 模块转换后停滞约 5 分钟，已中止；语法／109 项测试通过不等于 `verify` 通过。Shawn 需记录系统、Node、安装结果、完整构建日志和退出状态，单独排查后复跑。现有 dist 或旧构建记录不能替代新构建成功，不要盲目更新锁文件／升级打包器。

`vite.config.js` 使用相对 base、资源不内联，MapLibre 排除预优化。`public/mobile-design/` 是静态 ES Modules，媒体采用 `../media/...`；发布需保持目录结构。3D／天气仍有外部服务，不是全离线工程。修改后先构建和资源检查，再做目标尺寸及弱网检查；本次只做 GitHub 交接，未部署应用。

## 3. 移动端模块地图：要改什么，找哪里

| 文件 | 责任 |
| --- | --- |
| `public/mobile-design/index.html` | 页面容器、底部导航、弹层、样式与脚本入口 |
| `ui.js` | 页面渲染、共享状态、事件分派、hash 导航与生命周期 |
| `components.mjs`、`design-system.css` | Logo、图标、导航、通用卡片与设计 token／基础控件 |
| `ui.css` | 最新移动端基础布局及视觉 |
| `data.mjs` | 路线、示例团期、价格、搜索规范化与可用团期选择 |
| `group-picker.mjs`、`group-picker.css` | 排序／日期／地区／成团／玩法筛选、快捷条件和团期横滑 |
| `itinerary.mjs` | 逐日行程内容及展开阅读 |
| `booking-model.mjs` | 出行人校验、报价、优惠／退款等演示纯规则 |
| `booking-views.mjs`、`booking-flow.css` | 日期、出行人、确认、指南、文件、签名、退款界面 |
| `payment-flow.mjs` | 可替换适配器的支付控制器和独立的演示适配器 |
| `commerce.mjs`、`commerce.css` | 收银台、结果、订单卡片和倒计时呈现 |
| `auth-demo.mjs`、`journey-account.css` | 模拟登录注册、账户与会话；不是短信／微信认证 |
| `community-model.mjs` | 本地投稿状态、验证、互动与 IndexedDB 持久化 |
| `community.mjs`、`community.css` | 社区浏览、编辑、投稿、我的投稿及回收站 |
| `explore.mjs`、`explore-data.mjs`、`explore.css` | 探索卡片、路线漫游、滚动叙事、参考海拔、三维入口 |
| `opening.mjs`、`opening.css` | 开屏视频、跳过、重播、静音、弱网降级 |
| `companions.mjs`、`companions.css` | 同行照片／短片、首页和路线关联入口、媒体查看器 |
| `src/explore-field/main.js` | MapLibre 场景与交互初始化 |
| `src/explore-field/weather.mjs`、`presentation.mjs`、`styles.css` | 天气数据转换、场景呈现与布局 |

所有上表中未写目录的 `.mjs`／CSS 文件均在 `public/mobile-design/`。不要把同名早期模块改错。

## 4. 导航、状态和刷新行为

主入口固定为 `#home`（发现）、`#list`（路线／选团）、`#explore`、`#mine`（我的行程）。`#route-detail` 映射到内部 detail，`#route-list` 映射到 list。

主要二级页面：

- 路线与报名：detail → booking → traveler → review → checkout → result／order。
- 已付订单服务：guide、documents、document、signature、refund。
- 账户与同行：auth、companions。
- 探索：explore-roam、explore-weather。
- 社区：community、community-mine、community-trash、community-post/ID、community-compose/ID。

订单页不是可独立恢复的真实深链接：缺少内存订单时返回 mine。未完成出行人资料返回 traveler；未付款不能签署／退款，签署还需阅读确认。迁移要保留这些守卫，不能只复制页面外观。

`ui.js` 共享 state 保存所选路线、日期、人数、搜索条件、收藏、报名草稿与当前订单等。日期中含 2026 年 9 月的固定演示数据，如今不保证未来可用；不得自动改成“正式可售团期”。选团页保存纵向位置和横滑位置；迁移后返回应回到用户刚看的团期。

切页会清理探索／社区监听、签名板，关闭弹层并停止弹层视频。保留离开时销毁、按需加载、焦点和返回路径；否则易出现旧监听、重复操作或后台继续播放。签名 Canvas 的结果只是演示笔迹，不代表有效电子签约流程。

| 数据 | 最新移动端实现 | 正式版要求 |
| --- | --- | --- |
| 登录昵称 | sessionStorage；`wufang.demo-profile.v1`，标记 demo | 微信可信身份和经确认的用户资料策略 |
| 订单／付款／退款 | `createDemoPaymentAdapter()` 内存 Map；刷新丢失 | 服务端订单及资金结果，按可信用户恢复 |
| 收藏路线／搜索／报名输入 | 页面 state 内存 | 明确保存范围；真实个人资料仅按已确认政策处理 |
| 社区投稿及图片 | IndexedDB `wufang-community-preview-v1`，`community` store | 私有云存储、用户隔离、内容检查与团队审核 |
| 开屏看过记录 | sessionStorage；开屏仍支持重播 | 平台持久化与可访问降级策略 |

早期 `src/wufang/` 有另一套本地订单持久化，不应拿它解释最新移动端。请勿在公开原型输入真实身份证、健康资料、手机号或旅客照片；仓库模板和测试数据不是客户真实数据。

## 5. 账户、支付、报名规则的复用边界

H5 演示验证码 `246810` 仅用于体验，没有短信发送、密码数据库或身份核验。昵称会话不能授权生产订单／社区操作。

`createPaymentFlow(adapter)` 只有以下三个异步契约：

```js
adapter.preparePayment(orderId)    // 可信后端校验订单，返回平台所需参数
adapter.requestPayment(parameters) // 原生平台层调用 wx.requestPayment
adapter.queryOrder(orderId)        // 后端查单，返回规范化的真实状态
```

取消需规范化为 `error.code === 'PAYMENT_CANCELLED'`。控制器防止并发点击；无论客户端回调成功或失败都尝试查单。成功回调但查单仍 pending，或查单失败，显示 confirming，不据此再收费。服务端确认才是资金状态依据，详细契约见 [账户与支付](PAYMENT-AND-ACCOUNT.md)。

`createDemoPaymentAdapter` 的 `setOutcome`、`confirmDemoPayment`、`completeDemoRefund` 等只是演示工具，不得成为生产接口。创建演示订单也不锁位。正式版不仅换 `requestPayment`：还需服务端创建订单、计价、锁库存、权限、预支付、通知验签、主动查单、超时恢复与退款。

金额规则：H5 显示价单位元；报价和订单 `amountCents` 用整数分。当前云路线 price 是正整数元，交易迁移需要显式转换。房型、优惠、定金／尾款、退团与名额释放政策必须由运营确认，不将演示规则默认当成甲方商业规则。

## 6. 社区：哪些成立，哪些不成立

已确认产品方向：团友投稿 → 团队审核 → 公开。官方种子内容明确标注无方旅途影像，不伪装旅客评价。

本地限制：标题 40 字、正文 2000 字（提交至少 10 字）、最多 6 张照片、每文件 10 MiB、评论 300 字；接收 JPEG／PNG／WebP。草稿允许继续编辑；pending 可撤回到 draft；移除进入 removed／回收站，恢复成 draft。点赞收藏针对公开内容，评论本地进入 pending。

当前只有本地浏览与状态演示，没有真实上传、后台审核通过、跨用户发布、云端评论检查或举报处理。`requireProfile` 只检查演示昵称，本地私有内容未实现多账号服务端隔离；IndexedDB 容量错误也不代表已上传云端。换浏览器或清除网站数据会失去本地内容，不要把它当可靠备份。

正式实施需服务端身份和资源归属、私有附件授权、类型大小校验、内容安全、团队审核／拒绝理由、公开副本、用户撤回删除、举报责任人和保存期限。上传未审核附件不能先放公开路径；不要把图片 base64 塞进小程序代码包。

## 7. 原生小程序与已编写云 API

`miniprogram/app.json` 只有 home、routes、detail、booking、mine、privacy 六页，目前三项 Tab。booking 是预约咨询，不是支付结算。原生探索／社区／checkout／orders／order-detail／refund 未完成；主导航也未与 H5 四项对齐。

实际 AppID 已在 `project.config.json` 配置，它不是密钥也不是授权证明。`config.js` 仍 preview，develop／trial／release 环境为空，隐私正文／版本／客服为空。只有开发版允许参考路线；体验、正式或未知版本不能回退演示数据。不得关闭合法域名校验来宣称正式可用。

云调用链：原生页面 → `services/api.js` → `wx.cloud.callFunction({ name, data: { action, payload } })` → `cloudfunctions/wufangApi/index.js` → `handler.js`。15 秒客户端超时不取消服务端执行；咨询重试保留 requestId。

| action | 输入 | 成功 data |
| --- | --- | --- |
| login | 无 | `{ authenticated: true, user: { id } }` |
| listRoutes | 无 | 白名单路线数组，无实时团期库存 |
| getRoute | `{ id }` | 对应批准路线；未知／下架不回退别的路线 |
| createInquiry | routeId、requestId、name、phone、date、people、consent、privacyVersion | `{ id, status: 'received' }`，仅咨询回执 |

响应包：`{ ok: true, data }` 或 `{ ok: false, code }`。客户端错误映射包含 SERVICE_UNAVAILABLE、NOT_CONFIGURED、NOT_FOUND、AUTH_REQUIRED、INVALID_INPUT、POLICY_NOT_READY、CONFLICT、RATE_LIMITED；失败不显示成功。

安全细节：

- 身份仅来自 `cloud.getWXContext()` 的 APPID／OPENID，并核对 `WUFANG_APP_ID`；用户 id 为 APPID:OPENID 的 SHA-256。摘要不是角色权限。
- 路线仅返回已发布／已批准且满足标题、ID、正整数 price、HTTPS cover 校验的记录；白名单字段为 id、title、subtitle、duration、altitude、price、cover、description、tags。H5 的 name／days 等结构不同，迁移需明确映射，不直接混用对象。
- listRoutes 当前查询最多 50 条，未实现分页；公开读取也要求可信微信上下文。
- 咨询校验大陆手机号、1–6 人、北京时间今天及之后有效日期、称呼与隐私版本。客户端 owner、价格、状态、routeTitle 不可信，不落入白名单。
- 幂等键派生自可信用户 + requestId：同键同内容恢复原回执；同键改内容冲突。每身份每分钟允许一个新咨询，同键可恢复重试；尚需平台级防滥用和限流记录清理。
- `routes`／`inquiries`／`inquiry_limits` 尚未实际创建联调。数据库规则默认拒绝客户端读写，但云函数仍须逐动作授权；后续管理角色不能靠页面隐藏保护。
- `inquiries` 包含个人信息与私有 OPENID，不能公开读写、打印原文或导出到仓库。现有日志只输出固定失败提示。

云部署步骤、环境变量、模板、账号归属、安全审计、恢复验收见 [云部署](../launch/CLOUD-DEPLOYMENT.md)。源码只编写了四个动作；所有订单、支付、退款、审核及管理 API 都仍待实施。完整资金／库存规范见 [接口与交易](../launch/API-AND-TRANSACTIONS.md)。

## 8. 媒体、品牌、地图天气与外链

品牌入口统一调用 `brandLogo()`，引用 `public/media/wufang-lockup-final-v1-transparent.svg` 完整原稿；原生 `assets/wufang-logo.png` 是格式转换，不重新绘制或用字库代替 Logo。历史 mark 文件不当作最新主 Logo。

配套媒体及来源在 `public/media/` 和 [素材清单](asset-manifest.json)。当前开屏为 `wufang-opening-seedance25-v1.mp4`（约 18 MB）及同名海报；`companions-bluehour.mp4` 约 15 MB，另有 rest 短片及实拍照片。原始客户通讯／参考录屏不公开。公开文件不授予第三方再分发、肖像或音乐商业权利，正式运营需核实。

开屏支持跳过、静音、重播、减少动态偏好和停滞海报降级；同行视频按需打开而不是全部自动下载。原生迁移需云存储/CDN、转码、流量预算、加载失败及真机验证，不把全部媒体复制进主包。

三维依赖 MapLibre，地形／影像／预报涉及 Mapterhorn、Esri、Open-Meteo；中国网络、服务许可、地图合规与低端机性能未验收。海拔是路线停留参考，不是手机实时测量；天气是模型预报，不是现场安全实况。验证 WebGL／网络失败和离开销毁，再选原生承载方式，不预先保证 H5 iframe 可以直接搬进微信。

小红书需求指向微信中的目标小程序：缺少目标 AppID、准确 pagePath／参数和真机证据，当前未接通。公众号活动也需正式文章、素材及接入许可；演示弹层不代表真实文章跳转。保持四个主导航，社区／同行是明确的二级入口。

## 9. 本机 CI、凭证与公开边界

Git 忽略 node_modules、dist、qa-output、`.env*`、`.wechat-ci.local.json`、`*.key`、`*.pem`。没有上传 AppSecret、上传私钥、商户 API v3 密钥、证书或云 SecretKey；新凭证由授权人安全配置，不发 GitHub／聊天。

`tools/wechat-ci/` 是隔离开发工具，不属于原生／云运行依赖。若在新机器选择使用，先阅读安全记录并复核依赖；安装用该目录锁文件及 `npm ci --ignore-scripts`。优先保留受控凭证在源码目录外且权限 600，不复用 Joey 的本机路径。

`preview.cjs` 读取仓库根目录被忽略的 `.wechat-ci.local.json`，字段为 appid、privateKeyPath、uploadIpWhitelistConfirmed、developmentPreviewAuthorized、ciDependencyRiskReviewed。三个确认项只有在真实证据与授权存在时才可 true；不是为跑通而填的占位字段。

`npm --prefix tools/wechat-ci run check` 仅本机校验；`run preview` 才调用官方开发预览。当前未获得三项确认，未生成二维码；该工具没有自动体验版上传、提审或正式发布入口。后台自动化此前受到工具安全限制，不用其他浏览器／会话／接口绕过。

云生产依赖当前 6 项已知漏洞；隔离 CI 在 2026-10-05 的审计为 77 项，不能混算成前端运行风险，也不能忽略。定位可达性、兼容升级和回归后再决定部署；不运行盲目 audit fix --force。

## 10. GitHub 协作及第一个里程碑

Write 邀请已向 ShawnRyan2365 发出；接手人先接受并在 [Issue #1](https://github.com/joeyhu1108-maker/wufang-travel-frontend/issues/1) 回复，而不是假定已被通知或已读。仓库公开不会自动授予写权限。

推荐小步分支／PR：每个 PR 写目标、变更范围、测试结果、真实证据、未解决风险、部署及回滚影响。保留用户已有内容，不顺手重构品牌或改业务规则；使用 `codex/` 前缀建立工作分支，主分支不强推。已脱敏验证记录可提交，原始旅客资料和敏感日志不可提交。

首个里程碑是「开发环境可运行 + 构建问题有结论 + 原生导入编译 + 获授权的开发云中可信登录、批准路线与幂等咨询可联调」。它不是上线完成。之后分原生迁移／后台与内容／库存资金／真实验收四类推进，明确每类工程量和甲方依赖。

甲方所需资料、权限、费用承担及最终审核发布责任见主交接与 [甲方空白资料表](../launch/甲方资料填写表.csv)。收到 AppID／私钥不等于授权齐备，管理员扫码与采购仍在相应节点由授权人确认。未经确认不购买资源、不收真实款、不导入真实旅客数据、不提审或发布。
