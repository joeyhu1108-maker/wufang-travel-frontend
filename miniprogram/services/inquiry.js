function todayInChina(now = Date.now()) {
  return new Date(now + 8 * 3600000).toISOString().slice(0, 10);
}

function validateInquiry(values, today = todayInChina()) {
  if (!String(values.name || '').trim() || String(values.name).trim().length > 40) return '请填写 1–40 字的称呼';
  if (!/^1[3-9]\d{9}$/.test(String(values.phone || ''))) return '请填写正确的 11 位手机号码';
  const date = String(values.date || '');
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || date < today) return '请选择今天或之后的日期';
  const people = Number(values.people);
  if (!Number.isInteger(people) || people < 1 || people > 6) return '同行人数请填写 1–6 人';
  if (values.consent !== true) return '请阅读隐私说明并同意保存咨询信息';
  return '';
}

module.exports = { todayInChina, validateInquiry };
