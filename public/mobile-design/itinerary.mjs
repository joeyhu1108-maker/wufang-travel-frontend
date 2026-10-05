import { exploreRoutes } from './explore-data.mjs';

const chapters = {
  ali: [[1, 3, '从湖泊走向雪山'], [4, 7, '向西，走进阿里'], [8, 10, '沿着湖泊回到拉萨']],
  kora: [[1, 5, '一路湖泊，一路雪山'], [6, 8, '走近冈仁波齐'], [9, 13, '古格、土林与归途']]
};

export function itineraryDays(route) {
  return route.itinerary.map((original, day) => {
    const stops = original.split('—');
    const [, elevation, lodging] = exploreRoutes[route.id].days[day];
    return {
      day, original, stops, elevation, lodging,
      title: day === 0 ? '抵达拉萨 · 接机' : stops.slice(1, -1).join(' · '),
      start: stops[0], end: stops.at(-1)
    };
  });
}

function dayRow(day) {
  return `<details class="journey-day">
    <summary><span class="journey-day-number">第 ${day.day} 天</span><span class="journey-day-copy"><strong>${day.title}</strong><span>${day.start} <i aria-hidden="true">→</i><span class="sr-only">至</span> ${day.end}</span></span><svg class="journey-day-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary>
    <div class="journey-day-body"><p class="journey-day-label">当天怎么走</p><ol class="journey-stops">${day.stops.map(stop => `<li>${stop}</li>`).join('')}</ol>
      <dl class="journey-stay"><div><dt>资料所列住宿</dt><dd>${day.lodging}</dd></div><div><dt>停留点参考海拔</dt><dd>${day.elevation}</dd></div></dl>
      <p class="journey-day-note">住宿与安排以出发前确认为准；海拔为停留点参考，并非当天最高点。</p>
    </div></details>`;
}

export function itineraryPanel(route) {
  const days = itineraryDays(route);
  return `<section class="journey-itinerary" aria-label="逐日行程">
    <div class="journey-overview"><p>${route.days} 天正式行程 · 抵达日另列</p><h2>从拉萨出发，<br>再回到拉萨。</h2><span>先看每天的重点，点开了解途经地点与住宿。</span></div>
    <div class="journey-arrival"><span>抵达日</span><div><strong>${days[0].title}</strong><p>${days[0].lodging}</p></div></div>
    ${chapters[route.id].map(([start, end, title], index) => `<section class="journey-chapter"><header><span>0${index + 1}</span><h3>${title}</h3><small>第 ${start}–${end} 天</small></header>${days.slice(start, end + 1).map(dayRow).join('')}</section>`).join('')}
  </section>`;
}
