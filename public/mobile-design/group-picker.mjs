import { routes, departures, money, shortDate, endDate, demoOrder } from './data.mjs';
import { icon, heroHeader } from './components.mjs';

// Reuse the existing design fixtures. Remaining places do not imply a confirmed group.
export const groupFilters = {
  sort: { label: '排序', options: [['all', '推荐排序'], ['price-up', '价格从低到高'], ['price-down', '价格从高到低'], ['days', '行程从短到长']] },
  date: { label: '日期', options: [['all', '不限日期'], ['2026-09', '9 月出发'], ['2026-10', '10 月出发'], ...Object.keys(departures).map(date => [date, `${shortDate(date)} 出发`])] },
  region: { label: '地区', options: [['all', '全部地区'], ['tibet', '西藏 · 阿里']] },
  availability: { label: '余位', options: [['all', '不限余位'], ['few', '余位 1–2 人'], ['roomy', '余位 4 人及以上']] },
  style: { label: '玩法', options: [['all', '全部玩法'], ['road', '公路旅行'], ['trek', '转山徒步']] }
};
export const emptyGroupFilters = () => Object.fromEntries(Object.keys(groupFilters).map(key => [key, 'all']));
export const quickGroups = [
  ['date', '2026-09', '9 月出发'], ['date', '2026-10', '10 月出发'],
  ['style', 'road', '公路旅行'], ['style', 'trek', '转山徒步'], ['availability', 'few', '余位 ≤ 2']
];

export function groupResults(filters = emptyGroupFilters(), search = { query: '', people: 1 }) {
  const dates = Object.entries(departures).filter(([date, slots]) =>
    (filters.date === 'all' || date.startsWith(filters.date)) && slots >= search.people &&
    (filters.availability !== 'few' || slots <= 2) && (filters.availability !== 'roomy' || slots >= 4)
  ).map(([date]) => date);
  if (!dates.length) return [];
  const items = Object.values(routes).filter(r =>
    (filters.style === 'all' || r.category === filters.style) &&
    // Both existing routes are in Tibet. Do not invent additional destinations.
    ['all', 'tibet'].includes(filters.region) &&
    `${r.name}${r.summary}${r.tags.join('')}`.includes(search.query)
  );
  if (filters.sort === 'price-up') items.sort((a, b) => a.price - b.price);
  if (filters.sort === 'price-down') items.sort((a, b) => b.price - a.price);
  if (filters.sort === 'days') items.sort((a, b) => a.days - b.days);
  return items.map(route => ({ route, dates }));
}

export function groupBooking(routeId, date, people) {
  if (!demoOrder(routeId, date, people)) return null;
  return { route: routeId, date, month: Number(date.slice(5, 7)), people };
}

export function departureCard({ route: r, dates }, saved = false) {
  return `<article class="group-card" aria-labelledby="group-${r.id}">
    <div class="group-cover">
      <button class="group-cover-link" data-action="route" data-route="${r.id}" aria-label="查看${r.name}详情"><img src="../media/${r.image}" alt="${r.alt}" width="800" height="440" ${r.id === 'ali' ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" /></button>
      <button class="save-button group-save" data-action="save" data-route="${r.id}" aria-label="${saved ? '取消收藏' : '收藏'} ${r.name}" aria-pressed="${saved}">${icon(saved ? 'heartOn' : 'heart')}</button>
    </div>
    <div class="group-card-heading"><button data-action="route" data-route="${r.id}"><h2 id="group-${r.id}">${r.name}</h2><span>${r.days} 天 · 拉萨集合</span></button><span class="group-style">${r.tags[0]}</span></div>
    <div class="departure-rail" data-rail="${r.id}" role="group" aria-label="${r.name}团期，可左右滑动">
      ${dates.map(date => `<button class="departure-tile" data-action="group-book" data-route="${r.id}" data-date="${date}" aria-label="预订${r.name}，${shortDate(date)}至${shortDate(endDate(date, r.days))}，${money(r.price)}每人起，余${departures[date]}位">
        <span class="departure-month">${Number(date.slice(5, 7))} 月出发</span>
        <strong class="departure-dates">${shortDate(date)}<span>—</span>${shortDate(endDate(date, r.days))}</strong>
        <span class="departure-price">${money(r.price)}<small>/人起</small></span>
        <span class="departure-places ${departures[date] <= 2 ? 'is-few' : ''}">余 ${departures[date]} 位</span>
      </button>`).join('')}
    </div>
  </article>`;
}

export function groupFilterSheet(key, filters) {
  const filter = groupFilters[key];
  if (!filter) return '';
  const hints = {
    sort: '先按适合自己的方式看路线。', date: '2026 年出发团期，可先选月份，也可选具体日期。',
    region: '当前资料包含西藏路线，其他地区待补充。',
    availability: '按演示余位筛选；是否成团，需向无方确认。', style: '两种走法，都保留充足的了解与准备。'
  };
  return `<div class="group-filter-sheet"><div class="sheet-head"><h2>选择${filter.label}</h2><button class="close-sheet" data-action="close">${icon('close')}</button></div>
    <p class="group-filter-hint">${hints[key]}${key === 'region' ? '<button class="group-map-link" data-action="map">查看路线概览</button>' : ''}</p>
    <fieldset class="group-options"><legend class="group-sr-only">${filter.label}</legend>${filter.options.map(([value, label]) => `<label><input type="radio" name="group-option" value="${value}" ${filters[key] === value ? 'checked' : ''} /><span>${label}</span>${icon('check')}</label>`).join('')}</fieldset>
    <div class="group-filter-actions"><button data-action="group-reset-one">重置</button><button data-action="group-apply" data-key="${key}">查看结果</button></div></div>`;
}

export function groupBookingPage(r, date, people) {
  return `<section class="screen is-active group-confirm">
    ${heroHeader('list')}
    <div class="group-confirm-body"><h1>确认这一程</h1><p class="group-confirm-intro">团期已选好，再看看和谁一起出发。</p>
      <div class="group-confirm-route"><img src="../media/${r.image}" alt="${r.alt}" width="76" height="76" /><div><h2>${r.name}</h2><p>${r.days} 天行程 · 拉萨集合</p></div></div>
      <div class="group-confirm-date"><div><span>出发团期 · 2026</span><strong>${shortDate(date)} — ${shortDate(endDate(date, r.days))}</strong></div><button data-action="group-change-date">更换日期</button></div>
      <div class="people-row"><div><span>同行人数</span><small>当前余 ${departures[date]} 位</small></div><div class="stepper"><button data-action="people" data-delta="-1" aria-label="减少人数" ${people <= 1 ? 'disabled' : ''}>−</button><b aria-live="polite">${people}</b><button data-action="people" data-delta="1" aria-label="增加人数" ${people >= departures[date] ? 'disabled' : ''}>＋</button></div></div>
      <div class="group-confirm-cost"><span>${money(r.price)} × ${people} 人</span><strong>${money(r.price * people)}<small>参考总价</small></strong></div>
      <button class="wide-button" data-go="traveler">下一步，填写出行人 ${icon('arrow')}</button>
      <p class="group-confirm-note">抵达日另列，请以完整行程为准。<br>当前为演示团期，余位与费用需无方最终确认。</p>
    </div>
  </section>`;
}
