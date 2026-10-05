import { icon, brandLogo } from './components.mjs';

// Client-provided journey imagery; names and staff roles have not been verified.
export const companionMedia = Object.freeze({
  lakeside: { type: 'image', file: 'companions-lakeside.jpg', width: 3420, height: 1924, title: '一起坐一会儿', alt: '一行旅人在湖岸并肩坐着，望向湖面', caption: '不用赶路的时候，就把时间留给湖边。' },
  walking: { type: 'image', file: 'companions-walking.jpg', width: 2566, height: 1444, title: '一步一步，走在一起', alt: '背着行囊的旅人沿山谷小路步行', caption: '山很远，脚下的每一步很近。' },
  dusk: { type: 'image', file: 'companions-dusk.jpg', width: 2566, height: 1444, title: '把这一刻，留给彼此', alt: '暮色中，几位同行者牵手张开双臂', caption: '回头想起的，除了风景，还有一起看风景的人。' },
  mountain: { type: 'image', file: 'companions-mountain.jpg', width: 2566, height: 1444, title: '雪山前的小小庆祝', alt: '雪山前，一群同行者抛起帽子', caption: '那些计划之外的小事，也成了旅程。' },
  rest: { type: 'video', file: 'companions-rest.mp4', poster: 'companions-rest-poster.jpg', width: 720, height: 960, duration: '00:11', title: '雪山下，歇一会儿', alt: '同行者在雪山下围坐休息', caption: '坐下来，山就在身后。', description: '短片画面：几位同行者在雪山前的草地上围坐、休息。' },
  bluehour: { type: 'video', file: 'companions-bluehour.mp4', poster: 'companions-bluehour-poster.jpg', width: 1280, height: 720, duration: '00:13', title: '天色蓝下来以后', alt: '蓝色暮光中，同行者张开双臂走向远处', caption: '天还没有全黑，我们还不想回去。', description: '短片画面：暮色下，同行者在开阔的地面上走动，张开双臂。' }
});

function picture(media, { poster = false } = {}) {
  return `<img src="../media/${poster ? media.poster : media.file}" alt="${media.alt}" width="${media.width}" height="${media.height}" loading="lazy" decoding="async" />`;
}

export function companionFigure(id) {
  const media = companionMedia[id];
  const video = media.type === 'video';
  return `<figure class="companion-figure ${video ? 'companion-film' : ''}">
    <button class="companion-visual" data-action="companion-media" data-media="${id}" aria-label="${video ? '播放' : '放大查看'}：${media.title}">
      ${picture(media, { poster: video })}
      ${video ? `<span class="companion-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 5 11 7-11 7Z" fill="currentColor"/></svg></span><span class="companion-duration">短片 · ${media.duration}</span>` : ''}
    </button>
    <figcaption><strong>${media.title}</strong><span>${media.caption}</span></figcaption>
  </figure>`;
}

export function companionsTeaser() {
  return `<section class="companions-teaser" aria-labelledby="companions-home-title">
    <p class="companion-kicker">与无方同行</p><h2 id="companions-home-title">旅途里的我们。</h2>
    <button class="companion-visual" data-action="companions" aria-label="看看旅途里的我们">${picture(companionMedia.lakeside)}</button>
    <p>一起坐一会儿，也一起走远一点。</p>
    <button class="companion-link" data-action="companions">看看同行的日常 ${icon('arrow')}</button>
  </section>`;
}

export function routeCompanions(id) {
  return `<section class="route-companions" aria-label="路上的同行片段"><div class="companion-section-head"><h2>这一路，不只风景。</h2><span>旅途影像</span></div>
    ${companionFigure(id === 'ali' ? 'lakeside' : 'walking')}
    <button class="companion-link" data-action="companions">更多同行片段 ${icon('arrow')}</button>
  </section>`;
}

export function companionsPage(back = 'home') {
  return `<section class="screen is-active companions-screen">
    <header class="topbar companions-topbar"><button class="icon-btn" data-go="${back}" aria-label="返回">${icon('back')}</button><span>与无方同行</span><span aria-hidden="true"></span></header>
    <div class="companions-intro"><p class="companion-kicker">旅途影像 · 西藏</p><h1>风景之外，<br>还有同行的人。</h1><p>一起出发，一起停留。<br>这是路上留下的一些日常。</p></div>
    <div class="companions-gallery">
      ${companionFigure('lakeside')}
      <div class="companion-section-head"><h2>把片刻，留在这里。</h2><span>实拍短片</span></div>
      <div class="companion-video-pair">${companionFigure('rest')}${companionFigure('bluehour')}</div>
      ${companionFigure('walking')}${companionFigure('dusk')}${companionFigure('mountain')}
      <p class="companion-source">影像来自无方提供的阿里路线素材。</p>
      <div class="companions-outro">${brandLogo()}<p>下一段路，<br>也许就有你。</p><button class="home-explore" data-go="list">找一程，一起出发 ${icon('arrow')}</button></div>
    </div>
  </section>`;
}

export function companionViewer(id) {
  const media = companionMedia[id];
  if (!media) return '';
  return `<div class="sheet-head"><div><span class="eyebrow">旅途影像 · 西藏</span><h2>${media.title}</h2></div><button class="close-sheet" data-action="close">${icon('close')}</button></div>
    ${media.type === 'video' ? `<video class="companion-player" src="../media/${media.file}" poster="../media/${media.poster}" width="${media.width}" height="${media.height}" controls playsinline muted preload="metadata" aria-label="${media.title}" aria-describedby="companion-description"></video><p class="companion-description" id="companion-description">${media.description}</p><p class="companion-media-error" role="status" hidden>视频暂时加载不了，可以关闭后再试，或继续浏览照片。</p>` : `<img class="companion-full-image" src="../media/${media.file}" alt="${media.alt}" width="${media.width}" height="${media.height}" />`}
    <p class="companion-viewer-caption">${media.caption}</p>`;
}
