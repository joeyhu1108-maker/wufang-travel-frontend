const config = require('../config');
const previewRoutes = require('./preview-routes');
const messages = {
  SERVICE_UNAVAILABLE: '服务暂时无法连接，请稍后重试',
  NOT_CONFIGURED: '服务尚未开通，暂时无法提交',
  NOT_FOUND: '这条路线已下架，请选择其他路线',
  AUTH_REQUIRED: '登录未完成，请重试',
  INVALID_INPUT: '请检查填写的信息',
  POLICY_NOT_READY: '隐私说明尚未确认，暂时无法提交',
  CONFLICT: '信息发生变化，请重新提交',
  RATE_LIMITED: '提交过于频繁，请稍后重试',
};

function serviceError(code) {
  const error = new Error(messages[code] || messages.SERVICE_UNAVAILABLE);
  error.code = code;
  return error;
}

async function call(action, payload = {}) {
  const app = getApp();
  if (!app.globalData.cloudReady || !wx.cloud) throw serviceError('NOT_CONFIGURED');
  let response;
  let deadline;
  try {
    response = await Promise.race([
      wx.cloud.callFunction({ name: config.functionName, data: { action, payload } }),
      new Promise((_, reject) => { deadline = setTimeout(() => reject(serviceError('SERVICE_UNAVAILABLE')), 15000); }),
    ]);
  } catch (_) {
    throw serviceError('SERVICE_UNAVAILABLE');
  } finally { clearTimeout(deadline); }
  if (!response || !response.result || response.result.ok !== true) throw serviceError(response && response.result && response.result.code);
  return response.result.data;
}

async function getRoutes() {
  if (getApp().globalData.runtime.preview) return previewRoutes;
  const data = await call('listRoutes');
  if (!Array.isArray(data)) throw serviceError('SERVICE_UNAVAILABLE');
  return data;
}

async function getRoute(id) {
  if (getApp().globalData.runtime.preview) {
    const route = previewRoutes.find(item => item.id === id);
    if (!route) throw serviceError('NOT_FOUND');
    return route;
  }
  const data = await call('getRoute', { id });
  if (!data || data.id !== id) throw serviceError('NOT_FOUND');
  return data;
}

async function createInquiry(payload) {
  if (!config.privacyVersion) throw serviceError('POLICY_NOT_READY');
  const data = await call('createInquiry', payload);
  if (!data || !data.id || data.status !== 'received') throw serviceError('SERVICE_UNAVAILABLE');
  return data;
}

async function login() {
  // 云函数从微信可信上下文获得身份；wx.login 的 code 不等于认证成功。
  const data = await call('login');
  if (!data || data.authenticated !== true || !data.user || !data.user.id) throw serviceError('AUTH_REQUIRED');
  getApp().globalData.user = data.user;
  return data.user;
}

module.exports = { getRoutes, getRoute, createInquiry, login, serviceError };
