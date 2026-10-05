import { brandLogo, icon } from './components.mjs';

// Approved Seedance 2.5 source; brand artwork stays in the page overlay.
export const openingFilm = { src: '../media/wufang-opening-seedance25-v1.mp4', poster: '../media/wufang-opening-seedance25-v1.jpg' };
export const storyBeats = [
  { at: 0, line: '有些远方，\n值得慢慢靠近。' },
  { at: 5, line: '一路向西，\n也一路相伴。' },
  { at: 10, line: '自由，\n有人托底。' },
];
export function storyAt(seconds) { return storyBeats.filter(beat => beat.at <= seconds).at(-1) || storyBeats[0]; }
const seenKey = 'wufang-opening-seen-seedance25-v1';
let seen = false;
export function showOpening({ replay = false } = {}) {
  try { seen ||= sessionStorage.getItem(seenKey) === '1'; } catch { /* Private browsing can disable storage. */ }
  if ((!replay && seen) || document.querySelector('#opening')) return;
  const previousFocus = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.id = 'opening'; dialog.setAttribute('aria-labelledby', 'opening-title');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  dialog.innerHTML = `<img class="opening-poster" src="${openingFilm.poster}" alt="西藏高原晨光，雪山与宁静的湖岸" />
    ${openingFilm.src ? `<video class="opening-film" src="${openingFilm.src}" poster="${openingFilm.poster}" playsinline muted preload="metadata" aria-hidden="true"></video>` : ''}
    <div class="opening-shade"></div><div class="opening-top">${brandLogo()}<button data-opening-close>跳过</button></div>
    <div class="opening-copy"><p>无方 · 西藏序章</p><h1 id="opening-title">${storyBeats[0].line.replace('\n','<br>')}</h1><span>有人托底的自由旅行</span></div>
    <div class="opening-bottom"><button class="opening-enter" data-opening-close>走进无方 ${icon('arrow')}</button>${openingFilm.src ? '<button class="opening-sound" aria-pressed="false">开启声音</button>' : '<small>西藏，等你慢慢走近。</small>'}<div class="opening-progress" aria-hidden="true"><i></i></div></div>`;
  document.body.append(dialog); dialog.showModal();
  const video = dialog.querySelector('video');
  const sound = dialog.querySelector('.opening-sound');
  let closing = false, stalled;
  const fallback = () => {
    clearTimeout(stalled); video?.pause(); dialog.classList.add('is-poster');
    if (sound) { sound.textContent = '重新播放短片'; sound.setAttribute('aria-pressed', 'false'); }
  };
  function close() {
    if (closing) return; closing = true; seen = true;
    try { sessionStorage.setItem(seenKey, '1'); } catch { /* In-memory state is sufficient for this visit. */ }
    clearTimeout(stalled); video?.pause(); dialog.classList.add('is-leaving');
    setTimeout(() => { dialog.close(); dialog.remove(); (previousFocus?.isConnected && previousFocus !== document.body ? previousFocus : document.querySelector('.home-explore'))?.focus({preventScroll:true}); }, reduced ? 0 : 480);
  }
  dialog.querySelectorAll('[data-opening-close]').forEach(button => button.addEventListener('click', close));
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  if (video) {
    video.addEventListener('timeupdate', () => {
      const line = storyAt(video.currentTime).line;
      if (dialog.querySelector('h1').textContent !== line) dialog.querySelector('h1').textContent = line;
      dialog.querySelector('.opening-progress i').style.width = `${Math.min(100, video.currentTime / (video.duration || 15) * 100)}%`;
    });
    video.addEventListener('ended', close);
    video.addEventListener('error', fallback);
    video.addEventListener('waiting', () => { clearTimeout(stalled); stalled = setTimeout(fallback, 5000); });
    video.addEventListener('playing', () => {
      clearTimeout(stalled);
      if (closing || dialog.classList.contains('is-poster')) video.pause();
    });
    const play = () => {
      dialog.classList.remove('is-poster'); clearTimeout(stalled);
      stalled = setTimeout(fallback, 5000);
      video.play().then(() => { if (closing) video.pause(); }).catch(fallback);
    };
    sound.addEventListener('click', () => {
      if (video.paused) { video.muted = false; play(); } else video.muted = !video.muted;
      sound.textContent = video.muted ? '开启声音' : '关闭声音'; sound.setAttribute('aria-pressed', String(!video.muted));
    });
    if (!reduced) play(); else sound.textContent = '播放短片';
  }
}
