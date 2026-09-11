// Design fixtures only. Prices are inherited references, not sellable inventory.
export const routes = {
  ali: {
    id: 'ali', name: '阿里大环线', latin: 'THE GREAT WEST', days: 10, price: 14800,
    image: 'route-ali-hero.jpg', alt: '阿里湖岸与远处的雪山', category: 'road', tags: ['公路旅行', '湖泊与光'],
    summary: '湖泊、雪山与古格，从拉萨向西，去读一部辽阔的大地之书。',
    story: '雪山的倒影，土林的褶皱，长路上突然出现的一束光。沿着一条完整的高原环线，重新感受距离，也重新感受自己。',
    itinerary: ['抵达拉萨 · 接机', '拉萨—羊卓雍措—普莫雍措—康马', '康马—阿玛直米—宗措湖—定结', '定结—马卡鲁峰—珠峰大本营—扎西宗', '扎西宗—希夏邦马峰—佩枯措—萨嘎', '萨嘎—拉昂措—纳木那尼峰—冈仁波齐—塔尔钦', '塔尔钦—古格王朝—土林日落—札达', '札达—札达土林—狮泉河', '狮泉河—物玛措—改则', '改则—色林措—班戈', '班戈—纳木措—拉萨']
  },
  kora: {
    id: 'kora', name: '冈仁波齐转山环线', latin: 'A WALK INWARD', days: 13, price: 18800,
    image: 'region-kora-kailash.jpg', alt: '云层下的冈仁波齐', category: 'trek', tags: ['转山徒步', '雪山与脚步'],
    summary: '穿过旷野，走近冈仁波齐。一步一步，把目光从远方收回心里。',
    story: '在阿里环线之上，多留几天给山，也给自己。转山不是默认的挑战任务；先了解行走负荷、住宿与准备，再决定自己的靠近方式。',
    itinerary: ['抵达拉萨 · 接机', '拉萨—羊卓雍措—普莫雍措—康马', '康马—冲巴雍措—卓木拉日—亚东', '亚东—阿玛直米—宗措湖—定结', '定结—卓奥友峰—远观珠峰—岗嘎', '岗嘎—希夏邦马峰—佩枯措—萨嘎', '萨嘎—玛旁雍措—纳木那尼峰—冈仁波齐—塔尔钦', '塔尔钦—经幡广场—止热寺—天葬台补给点（转山）', '天葬台补给点—卓玛拉垭口—塔尔钦（转山）', '巴嘎—古格王朝—札达', '札达—札达土林—狮泉河', '狮泉河—物玛措—改则', '改则—大地之树—色林措—班戈', '班戈—纳木措—拉萨']
  }
};
export const departures = { '2026-09-22': 4, '2026-09-29': 6, '2026-10-06': 2, '2026-10-13': 5, '2026-10-20': 4 };
export const money = value => `¥${value.toLocaleString('zh-CN')}`;
export const total = (route, people) => routes[route].price * people;
export function endDate(start, days) {
  const date = new Date(`${start}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days - 1);
  return date.toISOString().slice(0, 10);
}
export const shortDate = date => date.slice(5).replace('-', '.');
export function calendarCells(month) {
  const offset = (new Date(Date.UTC(2026, month - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(2026, month, 0)).getUTCDate();
  return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, i) => {
    const date = `2026-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
    return { day: i + 1, date, slots: departures[date] || 0 };
  })];
}
export const validContact = (name, phone) => Boolean(name.trim()) && /^1\d{10}$/.test(phone);

// Search is a draft until the user submits the sheet. Inventory is demo-only.
export function normalizeSearch(values = {}) {
  return {
    query: String(values.query || '').trim(),
    date: Object.hasOwn(departures, values.date) ? values.date : '',
    people: Math.max(1, Math.min(6, Math.trunc(Number(values.people)) || 1))
  };
}
export function firstDeparture(search) {
  return Object.entries(departures).find(([date, slots]) => (!search.date || date === search.date) && slots >= search.people)?.[0] || '';
}
export function matchingRoutes(search, filter = 'all', budget = 'all') {
  if (!firstDeparture(search)) return [];
  return Object.values(routes).filter(r => (filter === 'all' || r.category === filter)
    && (budget === 'all' || r.price <= Number(budget))
    && `${r.name}${r.summary}${r.tags.join('')}`.includes(search.query));
}
export function demoOrder(routeId, date, people) {
  if (!routes[routeId] || !departures[date] || !Number.isInteger(people) || people < 1 || people > departures[date]) return null;
  return { route: routeId, date, people, total: total(routeId, people), status: 'pending' };
}
