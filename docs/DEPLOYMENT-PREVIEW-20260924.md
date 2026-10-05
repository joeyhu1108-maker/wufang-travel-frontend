# 最新移动端预览发布记录

## 可转发链接

- 首页：https://hvl3us5nps.feishuapp.com/app/app_17d6fc497ns/mobile-preview-20260924#home
- 社区：https://hvl3us5nps.feishuapp.com/app/app_17d6fc497ns/mobile-preview-20260924#community
- 访问范围：All，require_login=false；沿用原有公开范围，未扩大权限。

## 发布证据

- 妙搭应用：app_17d6fc497ns。
- 发布分支：sprint/default。
- 提交：de4ca56bd3ae9daad70db58fb37d7eadb8550aa4。
- Release：7688786334782262233。
- release-get 返回 finished，commit_id 与本次推送一致。
- 新增独立 public/mobile-preview-20260924 目录，未覆盖 20260916 预览及原 H5。

## 本次验证

- 源项目 npm run verify：98 项测试通过，构建和可迁移资源检查通过。
- 托管项目 lint、typecheck、build 通过。
- 25 个图片、视频及 Logo 文件经匿名请求校验 SHA-256，与本地素材一致。
- 33 个本次发布的 HTML/CSS/JavaScript 文件经匿名请求校验，与生成文件逐一一致；JavaScript MIME 正确。
- 浏览器已打开公网链接，验证开屏进入首页、首页进入社区、公开游记列表及详情、关联路线、团期选择、探索首页、路线滚动叙事页面。
- 三维探索已显示“地形与影像已加载”，天气数值及 72 小时时间轴已加载；上述路径未捕获控制台错误或警告。
- 原 H5 首页及旧预览链接仍返回 200；托管仓库工作区干净。

## 交付边界

这是可分享的设计和交互预览，不是已上线的微信小程序。登录、订单与支付仍为演示；社区投稿、草稿和互动仍保存在访问者当前浏览器，没有提交到团队审核后台或云端。不要填写真实证件、支付或其他敏感资料。

此次未新增真实支付、审核后台、云端同步或小程序发布。三维地图和天气依赖第三方服务；未完成不同中国运营商网络与微信真机全覆盖验证。
