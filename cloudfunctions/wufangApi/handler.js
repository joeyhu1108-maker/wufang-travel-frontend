const { createHash } = require('node:crypto');
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = code => ({ ok: false, code });
const success = data => ({ ok: true, data });

function normalizeInquiry(input, today, privacyVersion) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const { routeId, requestId, date, phone } = input;
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const parsed = new Date(`${date}T00:00:00Z`);
  if (typeof routeId !== 'string' || !/^[a-z0-9-]{1,64}$/.test(routeId)
    || typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(requestId)
    || !name || name.length > 40 || /[\x00-\x1f]/.test(name)
    || typeof phone !== 'string' || !/^1[3-9]\d{9}$/.test(phone)
    || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)
    || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || date < today
    || !Number.isInteger(input.people) || input.people < 1 || input.people > 6
    || input.consent !== true || input.privacyVersion !== privacyVersion) return null;
  // 白名单：忽略客户端提供的 owner、status、price、routeTitle 等字段。
  return { routeId, requestId, name, phone, date, people: input.people, privacyVersion, consent: true };
}

function publicRoute(route) {
  const fields = ['id', 'title', 'subtitle', 'duration', 'altitude', 'price', 'cover', 'description', 'tags'];
  return Object.fromEntries(fields.map(key => [key, key === 'id' ? route._id : route[key]]));
}

function isPublishedRoute(route) {
  return route && route.published === true && route.approved === true
    && typeof route._id === 'string' && /^[a-z0-9-]{1,64}$/.test(route._id)
    && typeof route.title === 'string' && route.title.trim().length > 0 && route.title.length <= 80
    && Number.isSafeInteger(route.price) && route.price > 0
    && typeof route.cover === 'string' && /^https:\/\//.test(route.cover);
}

function createHandler(repository, settings, now = () => Date.now()) {
  return async (event, identity) => {
    if (!settings.appId || !identity || identity.APPID !== settings.appId || !identity.OPENID) return fail('AUTH_REQUIRED');
    const action = event && event.action;
    const payload = event && event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload) ? event.payload : {};
    const userId = hash(`${identity.APPID}:${identity.OPENID}`);
    if (action === 'login') return success({ authenticated: true, user: { id: userId } });
    if (action === 'listRoutes') return success((await repository.listRoutes()).filter(isPublishedRoute).map(publicRoute));
    if (action === 'getRoute') {
      if (typeof payload.id !== 'string' || !/^[a-z0-9-]{1,64}$/.test(payload.id)) return fail('NOT_FOUND');
      const route = await repository.get('routes', payload.id);
      if (!isPublishedRoute(route)) return fail('NOT_FOUND');
      return success(publicRoute(route));
    }
    if (action !== 'createInquiry') return fail('NOT_FOUND');
    if (!settings.privacyVersion) return fail('POLICY_NOT_READY');
    const timestamp = now();
    const today = new Date(timestamp + 8 * 3600000).toISOString().slice(0, 10);
    const input = normalizeInquiry(payload, today, settings.privacyVersion);
    if (!input) return fail('INVALID_INPUT');
    const id = hash(`${userId}:${input.requestId}`);
    const fingerprint = hash(JSON.stringify(input));
    const receipt = document => document.owner === userId && document.fingerprint === fingerprint
      ? success({ id: document._id, status: 'received' }) : fail('CONFLICT');
    const previous = await repository.get('inquiries', id);
    if (previous) return receipt(previous);
    const route = await repository.get('routes', input.routeId);
    if (!isPublishedRoute(route)) return fail('NOT_FOUND');
    // 每个微信身份一分钟最多一份新咨询；唯一 _id 防止并发穿透。
    const slot = await repository.create('inquiry_limits', {
      _id: hash(`${userId}:${Math.floor(timestamp / 60000)}`), requestId: id, createdAt: timestamp,
    });
    if (slot.requestId !== id) return fail('RATE_LIMITED');
    const document = await repository.create('inquiries', {
      _id: id, owner: userId, _openid: identity.OPENID, fingerprint,
      routeId: input.routeId, routeTitle: route.title, name: input.name, phone: input.phone,
      date: input.date, people: input.people, privacyVersion: input.privacyVersion,
      consentAt: timestamp, createdAt: timestamp, status: 'received',
    });
    return receipt(document);
  };
}

module.exports = { createHandler, normalizeInquiry };
