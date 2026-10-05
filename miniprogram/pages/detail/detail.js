const { getRoute } = require('../../services/api');
Page({
  data: { route: null, loading: true, error: '' },
  onLoad(options) { this.routeId = options.id; this.loadRoute(); },
  async loadRoute() {
    this.setData({ loading: true, error: '' });
    try { this.setData({ route: await getRoute(this.routeId) }); }
    catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ loading: false }); }
  },
  startBooking() {
    if (this.data.route) wx.navigateTo({ url: `/pages/booking/booking?id=${encodeURIComponent(this.data.route.id)}` });
  },
  backRoutes() { wx.switchTab({ url: '/pages/routes/routes' }); },
});
