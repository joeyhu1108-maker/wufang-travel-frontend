import { routes } from './data.mjs';

export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const blankTraveler = () => ({ name: '', documentType: 'passport', document: '', gender: '', birthday: '', phone: '' });
export const createBookingDetails = () => ({ travelers: [], emergencyName: '', emergencyPhone: '', room: 'random', roommate: '', coupon: '', note: '' });
export const demoTraveler = index => ({ name: `演示旅人${index + 1}`, documentType: 'passport', document: `DEMO000${index + 1}`, gender: index % 2 ? 'male' : 'female', birthday: '1995-06-15', phone: '13800000000' });
export const maskDocument = value => value.length > 4 ? `${value.slice(0, 2)}${'•'.repeat(4)}${value.slice(-2)}` : '••••';
export const maskPhone = value => /^1\d{10}$/.test(value) ? `${value.slice(0, 3)} •••• ${value.slice(-4)}` : value;
export function validBirthday(value) {
  const parsed = new Date(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(+parsed) && parsed.toISOString().slice(0, 10) === value && +parsed <= Date.now() && value >= '1900-01-01';
}
export function identityInfo(document) {
  if (!/^\d{17}[\dX]$/i.test(document)) return null;
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const sum = weights.reduce((n, w, i) => n + Number(document[i]) * w, 0);
  const birthday = `${document.slice(6, 10)}-${document.slice(10, 12)}-${document.slice(12, 14)}`;
  if ('10X98765432'[sum % 11] !== document[17].toUpperCase() || !validBirthday(birthday)) return null;
  return { birthday, gender: Number(document[16]) % 2 ? 'male' : 'female' };
}
export function travelerErrors(person) {
  const errors = {};
  if (!person.name.trim()) errors.name = '请填写出行人姓名';
  if (!['passport', 'id'].includes(person.documentType)) errors.documentType = '请选择证件类型';
  if (person.documentType === 'id' ? !identityInfo(person.document) : !/^[A-Z0-9]{6,20}$/i.test(person.document)) errors.document = person.documentType === 'id' ? '请核对 18 位身份证号码' : '请填写 6–20 位字母或数字证件号';
  if (!['female', 'male'].includes(person.gender)) errors.gender = '请选择性别';
  if (!validBirthday(person.birthday)) errors.birthday = '请填写有效的出生日期';
  if (!/^1\d{10}$/.test(person.phone)) errors.phone = '请填写 11 位手机号码';
  return errors;
}
export function bookingError(details, people) {
  if (details.travelers.length !== people) return `请补齐 ${people} 位出行人，或返回调整人数`;
  if (details.travelers.some(p => Object.keys(travelerErrors(p)).length)) return '请检查出行人资料';
  if (new Set(details.travelers.map(p => p.document.toUpperCase())).size !== people) return '同一证件不能重复添加';
  if (!details.emergencyName.trim() || !/^1\d{10}$/.test(details.emergencyPhone)) return '请填写紧急联系人姓名和 11 位手机号码';
  if (!['random', 'friend'].includes(details.room)) return '请选择拼房方式';
  if (details.room === 'friend' && !details.roommate.trim()) return '请填写希望同住的室友姓名';
  if (details.coupon && details.coupon !== 'DEMO100') return '优惠码无效，演示可使用 DEMO100';
  return '';
}
// Explicit design fixtures, not Wufang commercial promises. All amounts are cents.
export function bookingQuote(route, people, coupon = '', withDemoOffer = true) {
  if (!routes[route] || !Number.isInteger(people) || people < 1 || people > 6) throw new Error('无效路线或人数');
  const grossCents = routes[route].price * people * 100;
  const groupDiscountCents = withDemoOffer && people >= 2 ? people * 5000 : 0;
  const couponDiscountCents = withDemoOffer && coupon === 'DEMO100' ? 10000 : 0;
  return { grossCents, groupDiscountCents, couponDiscountCents, totalCents: grossCents - groupDiscountCents - couponDiscountCents };
}
export function refundQuote(order, indexes) {
  if (order.status !== 'paid') throw new Error('当前订单不可申请退款');
  const ids = [...new Set(indexes)];
  if (!ids.length || ids.some(i => !Number.isInteger(i) || i < 0 || i >= order.people || order.refundedTravelers?.includes(i))) throw new Error('请选择可退款的出行人');
  // Allocate rounding residue by traveler index so partial refunds never exceed paid money.
  const each = Math.floor(order.amountCents / order.people), residue = order.amountCents % order.people;
  const paidCents = ids.reduce((sum, i) => sum + each + (i < residue ? 1 : 0), 0);
  return { indexes: ids, paidCents, deductionCents: 0, refundCents: paidCents };
}
