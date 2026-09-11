/*
 * Wufang Mobile Design System
 * Framework-free render primitives. Each component returns semantic HTML so the
 * same contract can be ported to Vue, React, or a mini-program template later.
 */
const paths = {
  arrow: 'M5 19 19 5M5 5h14v14',
  share: 'M18 8a3 3 0 1 0-2.83-4A3 3 0 0 0 18 8ZM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm12 5a3 3 0 1 0-2.83-4A3 3 0 0 0 18 20ZM8.6 10.7l6.8-3.4M8.6 13.3l6.8 3.4',
  back: 'M19 12H5m7-7-7 7 7 7',
  close: 'm6 6 12 12M18 6 6 18',
  heart: 'M12 20S3 15 3 8a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 7-9 12-9 12Z',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  check: 'm5 12 4 4L19 6',
  home: 'm3 10 9-7 9 7v11H3V10Zm6 11v-8h6v8',
  route: 'm4 4 6 2 4-2 6 2v14l-6-2-4 2-6-2V4Zm6 2v14m4-16v14',
  user: 'M19 21v-2a7 7 0 0 0-14 0v2m11-14a4 4 0 1 1-8 0 4 4 0 0 1 8 0'
};

export const designTokens = Object.freeze({
  color: Object.freeze({ ink: '#222222', paper: '#ffffff', blue: '#245b64', red: '#d85b4e', muted: '#6f716d' }),
  spacing: Object.freeze({ xs: 4, sm: 8, md: 16, lg: 24, xl: 32 }),
  radius: Object.freeze({ control: 10, card: 16, pill: 999 }),
  motion: Object.freeze({ fast: 160, base: 240, slow: 420 })
});

export function icon(name, { label = '' } = {}) {
  const key = name === 'heartOn' ? 'heart' : name;
  return `<svg class="icon ds-icon" viewBox="0 0 24 24" fill="${name === 'heartOn' ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}><path d="${paths[key] || paths.arrow}"/></svg>`;
}

export function heroHeader(back = '') {
  return `<header class="topbar ds-topbar"><button class="icon-btn ds-icon-button" data-go="${back || 'home'}" aria-label="返回">${icon('back')}</button><div class="top-title"><span class="eyebrow">WUFANG TRAVEL</span><strong>${back ? '无方旅行' : '无方'}</strong></div><button class="icon-btn ds-icon-button" data-action="share" aria-label="分享">${icon('share')}</button></header>`;
}

export function navMarkup(page) {
  return ['home', 'list', 'mine'].map((item, i) => `<button class="ds-nav-item ${page === item ? 'is-active' : ''}" ${page === item ? 'aria-current="page"' : ''} data-go="${item}"><span>${icon(['home', 'route', 'user'][i])}</span>${['发现', '路线', '我的行程'][i]}</button>`).join('');
}

export function routeCard(route, { saved = false, money, shortDate, departures } = {}) {
  const next = Object.entries(departures || {}).find(([, slots]) => slots);
  const date = next ? shortDate(next[0]) : '待定';
  const slots = next ? next[1] : 0;
  return `<article class="route-card ds-route-card" data-route="${route.id}" data-action="route"><div class="route-card-image"><img src="../media/${route.image}" alt="${route.alt}" loading="lazy" /><span class="route-no">${route.id === 'ali' ? '01' : '02'}</span><button class="save-button ds-icon-button" data-action="save" data-route="${route.id}" aria-label="${saved ? '取消收藏' : '收藏'} ${route.name}" aria-pressed="${saved}">${saved ? icon('heartOn') : icon('heart')}</button></div><div class="route-card-info"><div><span class="eyebrow">${route.latin} · ${route.days} DAYS</span><h2>${route.name}</h2><p>${route.summary}</p><div class="tag-line">${route.tags.map(tag => `<span>${tag}</span>`).join('')}</div></div><div class="route-card-bottom"><strong>${money(route.price)}</strong><span>起 / 人</span><small>最近：${date} · 余 ${slots}</small></div></div></article>`;
}
