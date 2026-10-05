const config = require('./config');
const { resolveRuntime } = require('./services/runtime');

App({
  globalData: {
    cloudReady: false,
    user: null,
    runtime: null,
  },
  onLaunch() {
    const version = wx.getAccountInfoSync().miniProgram.envVersion;
    const runtime = resolveRuntime(config, version);
    this.globalData.runtime = runtime;
    if (runtime.configured && wx.cloud) {
      try {
        wx.cloud.init({ env: runtime.env, traceUser: false });
        this.globalData.cloudReady = true; // 仅表示 SDK 初始化，不表示云端健康检查通过。
      } catch (_) {
        this.globalData.cloudReady = false;
      }
    }
  },
});
