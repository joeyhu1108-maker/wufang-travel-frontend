const { getRoutes } = require('../../services/api');
Page({
  data: { routes: [], loading: true, error: '' },
  onShow() { this.loadRoutes(); },
  async loadRoutes() {
    this.setData({ loading: true, error: '' });
    try { this.setData({ routes: await getRoutes() }); }
    catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ loading: false }); }
  },
  openDetail(e) { wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` }); },
});
