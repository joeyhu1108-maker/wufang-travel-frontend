const { getRoutes } = require('../../services/api');

Page({
  data: { featured: [], loading: true, error: '' },
  onLoad() { this.loadRoutes(); },
  async loadRoutes() {
    this.setData({ loading: true, error: '' });
    try { this.setData({ featured: await getRoutes() }); }
    catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ loading: false }); }
  },
  openRoutes() { wx.switchTab({ url: '/pages/routes/routes' }); },
  openDetail(e) { wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` }); },
});
