import { brandLogo, icon } from './components.mjs';
import { exploreRoutes } from './explore-data.mjs';

const state = { route: 'ali', stop: 0, day: 0, scrollTop: 0, discovered: new Set([0]) };
export function profilePoints(days) {
  return days.map((day, i) => [20 + i / (days.length - 1) * 300, 112 - (parseInt(day[1]) - 3000) / 3000 * 88]);
}

export function exploreHandbook() {
  return `<section class="screen is-active explore-screen explore-handbook">
    <header class="explore-header">${brandLogo()}<span>高原探索手册</span></header>
    <div class="explore-heading"><p>出发之前，先与西藏相遇</p><h1>换个角度，看见西藏。</h1></div>
    <nav class="explore-chapters" aria-label="选择探索体验">
      <a class="explore-chapter chapter-roam" href="#explore-roam" aria-label="路线漫游，进入路线探索">
        <img src="../media/region-ali-terrain.jpg" alt="" width="900" height="600" />
        <span class="chapter-index">01 / 路线漫游</span>
        <span class="chapter-copy"><strong>沿着好奇，向西。</strong><span>向下滑动，让一条路慢慢展开。</span></span>
        <span class="chapter-enter">开始漫游 ${icon('arrow')}</span>
      </a>
      <a class="explore-chapter chapter-weather" href="#explore-weather" aria-label="风雪脉动，进入三维雪山">
        <img src="../media/region-everest-panorama.jpg" alt="" width="1200" height="800" />
        <span class="chapter-index">02 / 风雪脉动 <span>3D 交互体验</span></span>
        <span class="chapter-weather-title"><strong>雪山的呼吸，<br>在你指间。</strong><span>转动雪山，拨动未来 72 小时的风雪。</span></span>
        <svg class="chapter-wind" viewBox="0 0 360 140" fill="none" aria-hidden="true"><path d="M-30 90Q70 0 180 62T400 24M-30 110Q70 20 180 82T400 44M-30 130Q70 40 180 102T400 64"/></svg>
        <span class="chapter-weather-foot"><span>3 座雪山 · 4 种数据视角</span><span class="chapter-enter">进入雪山 ${icon('arrow')}</span></span>
      </a>
    </nav>
    <p class="handbook-foot">不急着出发，先让好奇走在前面。</p>
  </section>`;
}

function experienceHeader(title, dark = false, action = '') {
  return `<header class="explore-experience-header${dark ? ' is-dark' : ''}"><a href="#explore" aria-label="返回探索手册">${icon('back')}<span>手册</span></a><h1>${title}</h1>${action || `<span>${dark ? '3D' : '01'}</span>`}</header>`;
}

export function chapterAtReadingLine(tops, line) {
  let current = 0;
  tops.forEach((top, index) => { if (top <= line) current = index; });
  return current;
}

export function roamingChapters(route) {
  return route.stops.map((stop, index) => `<article class="roam-chapter" data-story-stop="${index}" tabindex="-1" aria-labelledby="roam-title-${index}">
    <figure class="roam-photo"><img src="../media/${stop.image}" alt="${stop.alt}" width="900" height="700" loading="${index === 0 ? 'eager' : 'lazy'}" decoding="async" /><figcaption><span>${String(index + 1).padStart(2,'0')} / ${String(route.stops.length).padStart(2,'0')}</span><h2 id="roam-title-${index}">${stop.name}</h2><span>${stop.day === 0 ? '抵达日' : `DAY ${String(stop.day).padStart(2,'0')}`}</span></figcaption></figure>
    <div class="roam-chapter-copy"><h3>${stop.kicker}</h3><p>${stop.description}</p><div class="roam-chapter-foot"><span>${stop.day === 0 ? '抵达日' : `D${stop.day}`} · 当晚停留参考海拔 ${route.days[stop.day][1]}</span><span>${index < route.stops.length - 1 ? `下一站 · ${route.stops[index + 1].name}` : '回到拉萨，带着故事返程'}</span></div></div>
  </article>`).join('');
}

export function mountExplore(container, mode = 'handbook') {
  if (mode === 'handbook') { container.innerHTML = exploreHandbook(); return; }
  if (mode === 'weather') {
    container.innerHTML = `<section class="explore-immersive">${experienceHeader('风雪脉动', true)}
      <iframe class="explore-field-frame" src="../explore-field/index.html?embedded=1" title="西藏三维地形与 72 小时风雪预报" loading="lazy"></iframe>
    </section>`;
    return;
  }
  container.innerHTML = `<section class="screen is-active explore-screen explore-roaming">
    ${experienceHeader('路线漫游', false, `<button class="roam-skip" data-action="route" data-route="${state.route}" data-origin="explore-roam">看行程 ${icon('arrow')}</button>`)}
    <div class="roaming-intro"><p>一条路，六次相遇</p><h2>往下滑，<br>西藏慢慢展开。</h2><span>从拉萨出发，沿着风景向西。不用赶路。</span></div>
    <div id="explore-content"></div>
  </section>`;
  const content = container.querySelector('#explore-content');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let chapters = [], progress, frame = 0, disposed = false;
  function renderMode() {
    const route = exploreRoutes[state.route];
    content.innerHTML = `<div class="explore-route-switch" role="group" aria-label="漫游路线">${Object.entries(exploreRoutes).map(([id,r]) => `<button data-explore-route="${id}" aria-pressed="${id === state.route}">${r.daysCount} 天 · ${id === 'ali' ? '阿里环线' : '冈仁波齐'}</button>`).join('')}</div>
      <div class="roam-progress" aria-label="当前漫游位置">
        <div class="roam-position"><div><span id="roam-counter"></span><strong id="roam-place"></strong><small id="roam-day"></small></div><div class="roam-mini-map"><svg viewBox="0 12 100 80" aria-hidden="true"><polyline class="roam-path-base" points="${route.stops.map(s => `${s.x},${s.y}`).join(' ')}"/><polyline class="roam-path-done"/>${route.stops.map(s => `<circle cx="${s.x}" cy="${s.y}" r="2"/>`).join('')}<circle class="roam-map-dot" r="4"/></svg><small>路线示意 · 非导航轨迹</small></div></div>
        <nav class="roam-stops" aria-label="跳转到沿途地点">${route.stops.map((stop,i) => `<button type="button" data-explore-stop="${i}" aria-label="跳到${stop.name}">${stop.name}</button>`).join('')}</nav>
      </div>
      <div class="roam-story">${roamingChapters(route)}</div>
      <div class="roam-ending"><span>路在这里继续</span><h2>看见的风景，<br>可以成为你的这一程。</h2><p>${route.daysCount} 天 · ${route.shortTitle}</p></div>
      <button class="explore-route-cta" data-action="route" data-route="${state.route}" data-origin="explore-roam"><span>看看完整行程<small>安排、团期与出发准备</small></span>${icon('arrow')}</button>
      <details class="roam-elevation"><summary>想再了解每天的海拔？<span><span class="elevation-expand">展开查看</span><span class="elevation-collapse">收起</span> ${icon('arrow')}</span></summary><section class="elevation-section" aria-labelledby="elevation-title"><div class="elevation-heading"><div><p>让每一天，都有自己的起伏</p><h2 id="elevation-title">这一路的海拔</h2></div><span>米</span></div>
        <div class="elevation-day" aria-live="polite"></div><div class="elevation-chart"></div>
        <input class="elevation-slider" type="range" min="0" max="${route.daysCount}" step="1" value="${state.day}" aria-label="查看每日停留海拔" />
        <div class="elevation-labels"><span>抵达拉萨</span><span>D${route.daysCount} · 返回拉萨</span></div>
        <p class="explore-source">来自现有行程资料：当晚停留参考海拔，非全天最高海拔或实测轨迹；具体安排以出发前确认为准。</p>
      </section></details>
      <a class="roaming-weather-link" href="#explore-weather"><span>再换一个视角<strong>去雪山里，看风雪脉动。</strong></span>${icon('arrow')}</a>`;
    chapters = [...content.querySelectorAll('[data-story-stop]')];
    progress = content.querySelector('.roam-progress');
    container.querySelector('.roam-skip').dataset.route = state.route;
    content.querySelectorAll('[data-explore-route]').forEach(button => button.addEventListener('click', () => {
      if (state.route === button.dataset.exploreRoute) return;
      state.route = button.dataset.exploreRoute; state.stop = 0; state.day = 0; state.scrollTop = 0; state.discovered = new Set([0]);
      renderMode(); window.scrollTo({ top: 0, behavior: 'instant' }); content.querySelector(`[data-explore-route="${state.route}"]`).focus({preventScroll:true});
    }));
    content.querySelectorAll('[data-explore-stop]').forEach(button => button.addEventListener('click', () => {
      const chapter = chapters[Number(button.dataset.exploreStop)];
      const offset = container.querySelector('.explore-experience-header').offsetHeight + progress.offsetHeight + 12;
      window.scrollTo({ top: chapter.getBoundingClientRect().top + window.scrollY - offset, behavior: reducedMotion ? 'instant' : 'smooth' });
      chapter.focus({ preventScroll: true });
    }));
    content.querySelector('.elevation-slider').addEventListener('input', event => { state.day = Number(event.target.value); renderDay(); });
    renderPosition(); renderDay();
  }
  function renderPosition() {
    const route = exploreRoutes[state.route], stop = route.stops[state.stop];
    content.querySelector('#roam-counter').textContent = `沿途 ${String(state.stop + 1).padStart(2,'0')} / ${String(route.stops.length).padStart(2,'0')}`;
    content.querySelector('#roam-place').textContent = stop.name;
    content.querySelector('#roam-day').textContent = `${stop.day === 0 ? '抵达日' : `D${stop.day}`} · ${state.discovered.size === route.stops.length ? '六处风景，都遇见了' : '随滚动向前，也能轻点跳站'}`;
    content.querySelector('.roam-path-done').setAttribute('points', route.stops.slice(0, state.stop + 1).map(s => `${s.x},${s.y}`).join(' '));
    content.querySelector('.roam-map-dot').style.transform = `translate(${stop.x}px, ${stop.y}px)`;
    content.querySelectorAll('[data-explore-stop]').forEach(button => {
      const index = Number(button.dataset.exploreStop);
      button.setAttribute('aria-current', index === state.stop ? 'step' : 'false');
      button.classList.toggle('is-discovered', state.discovered.has(index));
    });
  }
  function updateScroll() {
    frame = 0;
    if (disposed) return;
    const next = chapterAtReadingLine(chapters.map(chapter => chapter.getBoundingClientRect().top), progress.getBoundingClientRect().bottom + 40);
    if (next !== state.stop) {
      state.stop = next; state.discovered.add(next); state.day = exploreRoutes[state.route].stops[next].day;
      renderPosition(); renderDay();
    }
  }
  function scheduleScroll() {
    if (!frame) frame = requestAnimationFrame(updateScroll);
  }
  function renderDay() {
    const route = exploreRoutes[state.route], day = route.days[state.day], points = profilePoints(route.days), [x,y] = points[state.day];
    content.querySelector('.elevation-day').innerHTML = `<span>${state.day === 0 ? '抵达日' : 'D'+state.day} · ${day[0].split('—').at(-1)}</span><b>${parseInt(day[1]).toLocaleString('en-US')} <small>m</small></b>`;
    content.querySelector('.elevation-chart').innerHTML = `<svg viewBox="0 0 340 140" role="img" aria-label="${state.day === 0 ? '抵达日' : '第'+state.day+'天'}，当晚停留参考海拔${day[1]}"><path class="elevation-grid" d="M20 24H320M20 68H320M20 112H320"/><polygon class="elevation-area" points="20,128 ${points.map(p=>p.join(',')).join(' ')} 320,128"/><polyline class="elevation-line" points="${points.map(p=>p.join(',')).join(' ')}"/><path class="elevation-cursor" d="M${x} 8V128"/><circle cx="${x}" cy="${y}" r="5"/></svg>`;
    const slider = content.querySelector('.elevation-slider');
    slider.value = state.day; slider.setAttribute('aria-valuetext', `${state.day === 0 ? '抵达日' : '第'+state.day+'天'}，${day[1]}`);
  }
  renderMode();
  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('resize', scheduleScroll);
  frame = requestAnimationFrame(() => { window.scrollTo({ top: state.scrollTop, behavior: 'instant' }); updateScroll(); });
  return () => {
    state.scrollTop = window.scrollY; disposed = true; cancelAnimationFrame(frame);
    window.removeEventListener('scroll', scheduleScroll); window.removeEventListener('resize', scheduleScroll);
  };
}
