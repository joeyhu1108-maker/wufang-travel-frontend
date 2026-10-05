const { login } = require('../../services/api');
Page({
  data: { logged: false, loading: false, error: '' },
  onShow() { this.setData({ logged: Boolean(getApp().globalData.user) }); },
  async handleLogin() {
    if (this.data.loading || this.data.logged) return;
    this.setData({ loading: true, error: '' });
    try { await login(); this.setData({ logged: true }); }
    catch (error) { this.setData({ error: error.message, logged: false }); }
    finally { this.setData({ loading: false }); }
  },
  openPrivacy() { wx.navigateTo({ url: '/pages/privacy/privacy' }); },
});
