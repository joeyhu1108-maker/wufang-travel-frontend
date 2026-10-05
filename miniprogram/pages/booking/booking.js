const { getRoute, createInquiry } = require('../../services/api');
const config = require('../../config');
const { todayInChina, validateInquiry } = require('../../services/inquiry');
Page({
  data: { route: null, name: '', phone: '', date: '', people: '2', consent: false, submitted: false, submitting: false, loading: true, error: '', today: todayInChina(), inquiryId: '' },
  onLoad(options) { this.routeId = options.id; this.loadRoute(); },
  async loadRoute() {
    this.setData({ loading: true, error: '' });
    try { this.setData({ route: await getRoute(this.routeId) }); }
    catch (error) { this.setData({ error: error.message }); }
    finally { this.setData({ loading: false }); }
  },
  onInput(e) {
    const field = e.currentTarget.dataset.field;
    if (['name', 'phone', 'people'].includes(field)) this.setData({ [field]: e.detail.value });
  },
  onDateChange(e) { this.setData({ date: e.detail.value }); },
  onConsentChange(e) { this.setData({ consent: e.detail.value.includes('consent') }); },
  openPrivacy() { wx.navigateTo({ url: '/pages/privacy/privacy' }); },
  async submit() {
    if (this.data.submitting || this.data.submitted || !this.data.route) return;
    const error = validateInquiry(this.data);
    if (error) { this.setData({ error }); return; }
    const { route, name, phone, date, people } = this.data;
    const payload = { routeId: route.id, name: name.trim(), phone, date, people: Number(people), consent: true, privacyVersion: config.privacyVersion };
    const signature = JSON.stringify(payload);
    // 同一表单在断网重试时保留幂等键，服务端只存一份。
    if (signature !== this.signature) {
      this.signature = signature;
      this.requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 14).padEnd(10, '0')}`;
    }
    this.setData({ submitting: true, error: '' });
    try {
      const result = await createInquiry({ ...payload, requestId: this.requestId });
      this.setData({ submitted: true, inquiryId: result.id });
    } catch (err) { this.setData({ error: err.message }); }
    finally { this.setData({ submitting: false }); }
  },
  backHome() { wx.switchTab({ url: '/pages/home/home' }); },
});
