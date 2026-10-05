import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import './styles.css';
import { sceneCamera, nextForecastHour } from './presentation.mjs';

import {
  buildForecastUrl,
  deriveAtmosphere,
  formatForecastTime,
  formatMetric,
  formatVisibility,
  normalizeForecast,
} from './weather.mjs';

maplibregl.setWorkerUrl(maplibreWorkerUrl);

const PLACES = [
  {
    id: 'everest',
    index: '01',
    name: '珠穆朗玛峰',
    shortName: '珠峰',
    english: 'QOMOLANGMA',
    coordinates: [86.925, 27.9881],
    elevation: 8849,
    camera: { zoom: 10.82, pitch: 79, bearing: -27 },
  },
  {
    id: 'kailash',
    index: '02',
    name: '冈仁波齐',
    shortName: '冈仁波齐',
    english: 'MOUNT KAILASH',
    coordinates: [81.3119, 31.0675],
    elevation: 6638,
    camera: { zoom: 10.9, pitch: 77, bearing: 36 },
  },
  {
    id: 'namcha',
    index: '03',
    name: '南迦巴瓦峰',
    shortName: '南迦巴瓦',
    english: 'NAMCHA BARWA',
    coordinates: [95.0553, 29.6308],
    elevation: 7782,
    camera: { zoom: 10.52, pitch: 78, bearing: -42 },
  },
];

const state = {
  activePlaceId: PLACES[0].id,
  activeHour: 0,
  activeLayer: 'weather',
  forecasts: new Map(),
  errors: new Map(),
  map: null,
  markers: new Map(),
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelector('#app').innerHTML = `
  <main class="weather-field" data-layer="weather">
    <div id="map" class="terrain-map" aria-label="西藏三维地形与雪山位置"></div>
    <canvas id="atmosphere-canvas" class="atmosphere-canvas" aria-hidden="true"></canvas>
    <div class="temperature-wash" aria-hidden="true"></div>
    <div class="horizon-fog" aria-hidden="true"></div>
    <div class="cloud-field" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <div class="field-scan" aria-hidden="true"><i></i></div>
    <div class="grain" aria-hidden="true"></div>

    <div class="wind-readout" aria-hidden="true">
      <span>LIVE WIND VECTOR</span>
      <div><i></i><b id="field-bearing">—</b></div>
      <small id="field-speed">WAITING FOR MODEL</small>
    </div>

    <header class="field-header">
      <div class="header-status" aria-live="polite">
        <span class="status-dot"></span>
        <span id="terrain-status">三维地形连接中</span>
      </div>
      <button class="reload-field" type="button" aria-label="重新加载地形与天气">重新连接</button>
    </header>

    <section class="field-intro" aria-labelledby="field-title">
      <p class="overline">TIBET · WEATHER IN MOTION</p>
      <h1 id="field-title">珠穆朗玛峰</h1>
      <p class="intro-copy" id="scene-elevation">8,849 m / 峰顶海拔</p>
    </section>

    <nav class="place-rail" aria-label="选择观测雪山">
      ${PLACES.map(
        (place, index) => `
          <button type="button" data-place="${place.id}" aria-pressed="${index === 0}">
            <span>${place.index}</span><b>${place.shortName}</b><small>${place.english}</small>
          </button>`,
      ).join('')}
    </nav>

    <div class="scene-tools" role="group" aria-label="地形视角">
      <button type="button" data-camera="orbit" aria-label="环绕雪山，向右旋转 45 度">↻</button>
      <button type="button" data-camera="in" aria-label="放大地形">＋</button>
      <button type="button" data-camera="out" aria-label="缩小地形">−</button>
      <button type="button" data-camera="reset" aria-label="恢复雪山最佳视角">复位</button>
    </div>
    <p class="map-instruction">拖动探索 · 双指缩放与旋转</p>

    <dialog class="weather-panel" aria-labelledby="place-name">
      <div class="weather-sheet-head"><span>此刻的模型预报</span><button type="button" id="close-weather" aria-label="关闭详细天气数据">×</button></div>
      <div class="panel-rule"><span>MODEL FIELD</span><span id="panel-coordinate">27.988°N · 86.925°E</span></div>
      <div class="place-heading">
        <div>
          <p id="place-english">QOMOLANGMA</p>
          <h2 id="place-name">珠穆朗玛峰</h2>
        </div>
        <div class="summit-height"><span>峰顶海拔</span><b id="place-elevation">8,849 m</b></div>
      </div>

      <div class="forecast-moment">
        <div class="forecast-time"><span id="forecast-day">正在连接</span><b id="forecast-hour">--:--</b></div>
        <div class="temperature"><b id="temperature">—</b><span>峰顶模型温度</span></div>
      </div>

      <dl class="weather-readings" aria-live="polite">
        <div><dt>小时降雪</dt><dd id="snowfall">—</dd><small id="snow-note">模型预报</small></div>
        <div><dt>风 / 阵风</dt><dd id="wind">—</dd><small id="wind-direction">—</small></div>
        <div><dt>总云量</dt><dd id="cloud-cover">—</dd><small id="cloud-levels">低 — / 中 — / 高 —</small></div>
        <div><dt>能见度</dt><dd id="visibility">—</dd><small>水平模型值</small></div>
        <div><dt>0℃层高度</dt><dd id="freezing-level">—</dd><small>海拔高度</small></div>
        <div><dt>地面积雪深度</dt><dd id="snow-depth">—</dd><small>网格模型值</small></div>
      </dl>

      <details class="source-disclosure">
        <summary>数据来源与边界 <span>＋</span></summary>
        <p>天气：Open-Meteo 多模型预报，以山峰海拔做统计降尺度。地形：Mapterhorn 全球 DEM。影像：Esri World Imagery。</p>
        <p>天气网格不能代表具体山壁微气候；画面中的风线、雪粒与云雾是由数据驱动的视觉表达，不是现场观测。</p>
        <p>模型预报不作为出行安全依据。山峰坐标与峰顶温度不代表行程停留点。</p>
      </details>
    </dialog>

    <div class="weather-dock">
      <div class="scene-summary"><div><b id="scene-temperature">—</b><span id="scene-conditions">正在读取模型预报</span></div><button id="open-weather" type="button" aria-haspopup="dialog">详细数据 <span aria-hidden="true">⌃</span></button></div>
      <div class="layer-switch" role="group" aria-label="选择视觉数据层">
        <button type="button" data-layer="weather" aria-pressed="true">综合</button>
        <button type="button" data-layer="snow" aria-pressed="false">风雪</button>
        <button type="button" data-layer="cloud" aria-pressed="false">云层</button>
        <button type="button" data-layer="temperature" aria-pressed="false">温度</button>
      </div>
    <section class="timeline" aria-label="未来 72 小时预报时间轴">
      <div class="timeline-heading">
        <button id="play-forecast" type="button" aria-label="播放风雪变化" aria-pressed="false" disabled>▶</button>
        <p><b id="timeline-label">未来 72 小时</b><small>拖动时间，看风雪流动</small></p>
        <span id="timeline-step">01 / 72</span>
      </div>
      <input id="time-slider" type="range" min="0" max="71" step="1" value="0" disabled aria-label="选择预报小时" />
      <div class="timeline-ticks" aria-hidden="true"><span>首小时</span><span>24</span><span>48</span><span>第 72 小时</span></div>
    </section>
      <button type="button" class="data-state" id="data-state" disabled><span class="data-pulse"></span><span>正在读取 Open-Meteo 模型</span></button>
    </div>
  </main>
`;

const elements = {
  root: document.querySelector('.weather-field'),
  terrainStatus: document.querySelector('#terrain-status'),
  coordinate: document.querySelector('#panel-coordinate'),
  placeEnglish: document.querySelector('#place-english'),
  placeName: document.querySelector('#place-name'),
  placeElevation: document.querySelector('#place-elevation'),
  forecastDay: document.querySelector('#forecast-day'),
  forecastHour: document.querySelector('#forecast-hour'),
  temperature: document.querySelector('#temperature'),
  snowfall: document.querySelector('#snowfall'),
  snowNote: document.querySelector('#snow-note'),
  wind: document.querySelector('#wind'),
  windDirection: document.querySelector('#wind-direction'),
  cloudCover: document.querySelector('#cloud-cover'),
  cloudLevels: document.querySelector('#cloud-levels'),
  visibility: document.querySelector('#visibility'),
  freezingLevel: document.querySelector('#freezing-level'),
  snowDepth: document.querySelector('#snow-depth'),
  dataState: document.querySelector('#data-state'),
  timelineLabel: document.querySelector('#timeline-label'),
  timeSlider: document.querySelector('#time-slider'),
  atmosphereCanvas: document.querySelector('#atmosphere-canvas'),
  fieldBearing: document.querySelector('#field-bearing'),
  fieldSpeed: document.querySelector('#field-speed'),
  sceneName: document.querySelector('#field-title'),
  sceneElevation: document.querySelector('#scene-elevation'),
  sceneTemperature: document.querySelector('#scene-temperature'),
  sceneConditions: document.querySelector('#scene-conditions'),
  playForecast: document.querySelector('#play-forecast'),
  timelineStep: document.querySelector('#timeline-step'),
  dock: document.querySelector('.weather-dock'),
  weatherPanel: document.querySelector('.weather-panel'),
};

let playback = null;
function stopPlayback() {
  clearInterval(playback);
  playback = null;
  elements.playForecast.textContent = '▶';
  elements.playForecast.setAttribute('aria-label', '播放风雪变化');
  elements.playForecast.setAttribute('aria-pressed', 'false');
}

function activeCamera() {
  return sceneCamera(getActivePlace(), { width: window.innerWidth, height: window.innerHeight, dockHeight: elements.dock.offsetHeight });
}

function getActivePlace() {
  return PLACES.find((place) => place.id === state.activePlaceId);
}

function getActiveSnapshot() {
  const forecast = state.forecasts.get(state.activePlaceId);
  return forecast?.snapshots[state.activeHour] ?? null;
}

function getCardinalDirection(degrees) {
  if (degrees === null || degrees === undefined) return '—';
  const points = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  return `${points[Math.round(Number(degrees) / 45) % 8]}风 · ${Math.round(Number(degrees))}°`;
}

function setDataState(type, message) {
  elements.dataState.dataset.state = type;
  elements.dataState.disabled = type !== 'error';
  elements.dataState.querySelector('span:last-child').textContent = message;
}

function updateFlowOrientation(snapshot) {
  if (!snapshot) {
    elements.root.style.setProperty('--flow-angle', '-90deg');
    return;
  }
  const atmosphere = deriveAtmosphere(snapshot);
  const mapBearing = state.map?.getBearing() ?? 0;
  elements.root.style.setProperty(
    '--flow-angle',
    `${atmosphere.flowDirection - mapBearing - 90}deg`,
  );
}

function triggerFieldAcquisition() {
  elements.root.classList.remove('is-acquiring');
  window.requestAnimationFrame(() => {
    elements.root.classList.add('is-acquiring');
    window.setTimeout(() => elements.root.classList.remove('is-acquiring'), 1200);
  });
}

function renderPlace() {
  const place = getActivePlace();
  const [longitude, latitude] = place.coordinates;
  elements.coordinate.textContent = `${latitude.toFixed(3)}°N · ${longitude.toFixed(3)}°E`;
  elements.placeEnglish.textContent = place.english;
  elements.placeName.textContent = place.name;
  elements.placeElevation.textContent = `${place.elevation.toLocaleString('zh-CN')} m`;
  elements.sceneName.textContent = place.name;
  elements.sceneElevation.textContent = `${place.elevation.toLocaleString('zh-CN')} m / 峰顶海拔`;

  document.querySelectorAll('[data-place]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.place === place.id));
  });
  state.markers.forEach((markerElement, id) => {
    markerElement.classList.toggle('is-active', id === place.id);
  });

  renderWeather();
}

function renderWeather() {
  const forecast = state.forecasts.get(state.activePlaceId);
  const error = state.errors.get(state.activePlaceId);
  const snapshot = getActiveSnapshot();

  if (!forecast || !snapshot) {
    stopPlayback();
    elements.timeSlider.disabled = true;
    elements.timeSlider.value = '0';
    elements.timeSlider.removeAttribute('aria-valuetext');
    elements.playForecast.disabled = true;
    elements.sceneTemperature.textContent = '—';
    elements.sceneConditions.textContent = error ? '天气暂不可用，可在下方重试' : '正在读取模型预报';
    elements.timelineStep.textContent = '— / 72';
    elements.forecastDay.textContent = error ? '数据暂时不可用' : '正在连接';
    elements.forecastHour.textContent = '--:--';
    elements.temperature.textContent = '—';
    elements.snowfall.textContent = '—';
    elements.wind.textContent = '—';
    elements.windDirection.textContent = '—';
    elements.cloudCover.textContent = '—';
    elements.cloudLevels.textContent = '低 — / 中 — / 高 —';
    elements.visibility.textContent = '—';
    elements.freezingLevel.textContent = '—';
    elements.snowDepth.textContent = '—';
    elements.timelineLabel.textContent = error ? '预报加载失败' : '未来 72 小时';
    elements.fieldBearing.textContent = '—';
    elements.fieldSpeed.textContent = 'WAITING FOR MODEL';
    elements.root.style.setProperty('--field-energy', '0');
    elements.root.style.setProperty('--gust-energy', '0');
    elements.root.style.setProperty('--visibility-fog', '0');
    elements.root.style.setProperty('--timeline-progress', '0%');
    elements.root.style.setProperty('--cloud-opacity', '0');
    updateFlowOrientation(null);
    atmosphereRenderer.setWeather(null);
    if (error) setDataState('error', '没有使用模拟值 · 点击此处重试');
    return;
  }

  const time = formatForecastTime(snapshot.time);
  const atmosphere = deriveAtmosphere(snapshot);
  elements.timeSlider.disabled = false;
  elements.timeSlider.max = String(forecast.snapshots.length - 1);
  elements.timeSlider.value = String(state.activeHour);
  elements.timeSlider.setAttribute('aria-valuetext', `${time.day} ${time.hour}，第 ${state.activeHour + 1} 小时`);
  elements.playForecast.disabled = false;
  elements.sceneTemperature.textContent = formatMetric(snapshot.temperature, '°', 1);
  elements.sceneConditions.textContent = `风 ${formatMetric(snapshot.windSpeed, ' km/h', 0)} · 雪 ${formatMetric(snapshot.snowfall, ' cm', 1)}`;
  elements.timelineStep.textContent = `${String(state.activeHour + 1).padStart(2, '0')} / ${forecast.snapshots.length}`;
  elements.forecastDay.textContent = time.day;
  elements.forecastHour.textContent = time.hour;
  elements.temperature.textContent = formatMetric(snapshot.temperature, '°', 1);
  elements.snowfall.textContent = formatMetric(snapshot.snowfall, ' cm', 1);
  elements.snowNote.textContent = snapshot.snowfall > 0 ? '此时段有降雪' : '此时段无降雪';
  elements.wind.textContent = `${formatMetric(snapshot.windSpeed, '', 0)} / ${formatMetric(snapshot.windGusts, ' km/h', 0)}`;
  elements.windDirection.textContent = getCardinalDirection(snapshot.windDirection);
  elements.cloudCover.textContent = formatMetric(snapshot.cloudCover, '%', 0);
  elements.cloudLevels.textContent = `低 ${formatMetric(snapshot.cloudLow, '%')} / 中 ${formatMetric(snapshot.cloudMid, '%')} / 高 ${formatMetric(snapshot.cloudHigh, '%')}`;
  elements.visibility.textContent = formatVisibility(snapshot.visibility);
  elements.freezingLevel.textContent = formatMetric(snapshot.freezingLevel, ' m', 0);
  elements.snowDepth.textContent = formatMetric(snapshot.snowDepth, ' m', 2);
  elements.timelineLabel.textContent = `${time.day} · ${time.hour}`;
  elements.fieldBearing.textContent = `${Math.round(snapshot.windDirection ?? 0)}°`;
  elements.fieldSpeed.textContent = `${Math.round(snapshot.windSpeed ?? 0)} KM/H · ${getCardinalDirection(snapshot.windDirection).split(' · ')[0]}`;
  elements.root.style.setProperty('--cloud-opacity', atmosphere.cloudOpacity.toFixed(2));
  elements.root.style.setProperty('--field-energy', atmosphere.fieldEnergy.toFixed(2));
  elements.root.style.setProperty('--gust-energy', atmosphere.gustEnergy.toFixed(2));
  elements.root.style.setProperty('--visibility-fog', atmosphere.visibilityFog.toFixed(2));
  elements.root.style.setProperty('--scan-duration', `${Math.max(7, 12 - atmosphere.windEnergy * 5).toFixed(1)}s`);
  elements.root.style.setProperty(
    '--timeline-progress',
    `${(state.activeHour / Math.max(1, forecast.snapshots.length - 1)) * 100}%`,
  );
  elements.root.style.setProperty(
    '--temperature-shift',
    String(Math.max(0, Math.min(1, ((snapshot.temperature ?? 0) * -1) / 35))),
  );
  updateFlowOrientation(snapshot);
  atmosphereRenderer.setWeather(snapshot);
  const activeMarker = state.markers.get(state.activePlaceId);
  const markerReading = activeMarker?.querySelector('small');
  if (markerReading) {
    markerReading.textContent = `${Math.round(snapshot.windDirection ?? 0)}° · ${Math.round(snapshot.windSpeed ?? 0)} KM/H`;
  }
  setDataState('ready', '模型预报 · 非现场实况，不作安全判断');
}

async function loadForecast(place, { force = false } = {}) {
  if (!force && state.forecasts.has(place.id)) return;
  state.errors.delete(place.id);
  if (place.id === state.activePlaceId) setDataState('loading', '正在读取 Open-Meteo 模型');

  try {
    const response = await fetch(
      buildForecastUrl({
        latitude: place.coordinates[1],
        longitude: place.coordinates[0],
        elevation: place.elevation,
      }),
      { signal: AbortSignal.timeout(20000) },
    );
    if (!response.ok) throw new Error(`天气接口返回 ${response.status}`);
    state.forecasts.set(place.id, normalizeForecast(await response.json()));
  } catch (error) {
    state.errors.set(place.id, error instanceof Error ? error.message : '天气接口请求失败');
  }

  if (place.id === state.activePlaceId) renderWeather();
}

function selectPlace(placeId, { moveCamera = true } = {}) {
  const place = PLACES.find((candidate) => candidate.id === placeId);
  if (!place) return;
  stopPlayback();
  state.activePlaceId = place.id;
  state.activeHour = 0;
  renderPlace();
  triggerFieldAcquisition();

  if (moveCamera && state.map) {
    state.map.flyTo({
      ...activeCamera(),
      duration: reducedMotion ? 0 : 1600,
      essential: false,
    });
  }
  loadForecast(place);
}

function createAtmosphereRenderer(canvas) {
  const context = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let fieldWidth = 0;
  let snowParticles = [];
  let windParticles = [];
  let weather = null;
  let frame = null;
  let lastFrameTime = 0;
  const isMobile = window.matchMedia('(max-width: 720px)').matches;
  const frameInterval = isMobile ? 1000 / 24 : 1000 / 30;

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    fieldWidth = width;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function seedSnowParticle(fromTop = false) {
    return {
      x: Math.random() * fieldWidth,
      y: fromTop ? -20 : Math.random() * height,
      size: 0.7 + Math.random() * 1.8,
      speed: 0.6 + Math.random() * 1.8,
      phase: Math.random() * Math.PI * 2,
    };
  }

  function seedWindParticle(atmosphere) {
    return {
      x: Math.random() * fieldWidth,
      y: Math.random() * height,
      length: 34 + Math.random() * 52,
      width: 0.55 + Math.random() * 0.7,
      opacity: 0.2 + Math.random() * 0.22,
      curve: (Math.random() - 0.5) * 18,
      phase: Math.random() * Math.PI * 2,
      tracer: Math.random() < 0.08 + atmosphere.gustEnergy * 0.14,
    };
  }

  function drawWind(atmosphere, deltaSeconds) {
    const enabled = weather && (state.activeLayer === 'weather' || state.activeLayer === 'snow');
    const maximum = isMobile ? 60 : 130;
    const target = enabled
      ? Math.round((isMobile ? 28 : 62) + atmosphere.windEnergy * (maximum - (isMobile ? 28 : 62)))
      : 0;

    while (windParticles.length < target) windParticles.push(seedWindParticle(atmosphere));
    if (windParticles.length > target) windParticles.length = target;
    if (!target) return;

    const mapBearing = state.map?.getBearing() ?? 0;
    const angle = ((atmosphere.flowDirection - mapBearing) * Math.PI) / 180;
    const directionX = Math.sin(angle);
    const directionY = -Math.cos(angle);
    const normalX = -directionY;
    const normalY = directionX;
    const baseSpeed = 20 + atmosphere.windEnergy * 74;

    context.lineCap = 'round';
    windParticles.forEach((particle) => {
      const tracerBoost = particle.tracer ? 1 + atmosphere.gustEnergy * 1.15 : 1;
      const speed = baseSpeed * tracerBoost;
      particle.phase += deltaSeconds * (0.8 + atmosphere.windEnergy * 1.2);
      particle.x += directionX * speed * deltaSeconds;
      particle.y += directionY * speed * deltaSeconds;

      const bend = Math.sin(particle.phase) * particle.curve;
      const tailX = particle.x - directionX * particle.length;
      const tailY = particle.y - directionY * particle.length;
      const middleX = (particle.x + tailX) / 2 + normalX * bend;
      const middleY = (particle.y + tailY) / 2 + normalY * bend;

      context.lineWidth = particle.width + (particle.tracer ? 0.25 : 0);
      context.strokeStyle = particle.tracer
        ? `rgba(240, 90, 53, ${0.2 + atmosphere.gustEnergy * 0.28})`
        : `rgba(242, 232, 216, ${particle.opacity})`;
      context.beginPath();
      context.moveTo(tailX, tailY);
      context.quadraticCurveTo(middleX, middleY, particle.x, particle.y);
      context.stroke();

      if (particle.tracer) {
        context.fillStyle = `rgba(255, 202, 177, ${0.38 + atmosphere.gustEnergy * 0.34})`;
        context.beginPath();
        context.arc(particle.x, particle.y, 1.1, 0, Math.PI * 2);
        context.fill();
      }

      const margin = particle.length + 30;
      if (
        particle.x < -margin ||
        particle.x > fieldWidth + margin ||
        particle.y < -margin ||
        particle.y > height + margin
      ) {
        Object.assign(particle, seedWindParticle(atmosphere));
      }
    });
  }

  function drawSnow(atmosphere, deltaScale) {
    const enabled = weather && (state.activeLayer === 'weather' || state.activeLayer === 'snow');
    const target = enabled ? Math.round(atmosphere.snowIntensity * 210) : 0;

    while (snowParticles.length < target) snowParticles.push(seedSnowParticle());
    if (snowParticles.length > target) snowParticles.length = target;

    context.strokeStyle = 'rgba(241, 232, 216, 0.72)';
    context.lineCap = 'round';
    snowParticles.forEach((particle) => {
      particle.phase += 0.025 * deltaScale;
      particle.x += (atmosphere.windDrift + Math.sin(particle.phase) * 0.18) * deltaScale;
      particle.y += particle.speed * (1.2 + atmosphere.snowIntensity * 2.4) * deltaScale;
      if (particle.y > height + 20 || particle.x < -30 || particle.x > fieldWidth + 30) {
        Object.assign(particle, seedSnowParticle(true));
      }
      context.lineWidth = particle.size;
      context.beginPath();
      context.moveTo(particle.x, particle.y);
      context.lineTo(
        particle.x + atmosphere.windDrift * 2.3,
        particle.y + particle.size * 3.4,
      );
      context.stroke();
    });
  }

  function draw(time = performance.now()) {
    if (!reducedMotion && time - lastFrameTime < frameInterval) {
      frame = requestAnimationFrame(draw);
      return;
    }

    const deltaSeconds = lastFrameTime ? Math.min((time - lastFrameTime) / 1000, 0.05) : 1 / 30;
    const deltaScale = deltaSeconds * 60;
    lastFrameTime = time;
    context.clearRect(0, 0, width, height);
    const atmosphere = deriveAtmosphere(weather);
    drawWind(atmosphere, deltaSeconds);
    drawSnow(atmosphere, deltaScale);

    if (!reducedMotion) frame = requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  if (!reducedMotion) frame = requestAnimationFrame(draw);

  return {
    setWeather(nextWeather) {
      weather = nextWeather;
      if (reducedMotion) draw();
    },
    destroy() {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    },
  };
}

const atmosphereRenderer = createAtmosphereRenderer(elements.atmosphereCanvas);

function initializeMap() {
  const map = new maplibregl.Map({
    container: 'map',
    ...activeCamera(),
    attributionControl: false,
    maxPitch: 85,
    style: {
      version: 8,
      sources: {
        basemap: {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
          attribution: 'Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community',
        },
        terrainSource: {
          type: 'raster-dem',
          url: 'https://tiles.mapterhorn.com/tilejson.json',
          tileSize: 512,
          encoding: 'terrarium',
          maxzoom: 12,
        },
        terrainShade: {
          type: 'raster-dem',
          url: 'https://tiles.mapterhorn.com/tilejson.json',
          tileSize: 512,
          encoding: 'terrarium',
          maxzoom: 12,
        },
      },
      layers: [
        {
          id: 'basemap',
          type: 'raster',
          source: 'basemap',
          paint: {
            'raster-saturation': -0.3,
            'raster-contrast': 0.32,
            'raster-brightness-min': 0.035,
            'raster-brightness-max': 0.9,
          },
        },
        {
          id: 'terrain-hillshade',
          type: 'hillshade',
          source: 'terrainShade',
          paint: {
            'hillshade-shadow-color': '#020403',
            'hillshade-highlight-color': '#f0e8d9',
            'hillshade-accent-color': '#4a2822',
            'hillshade-exaggeration': 0.94,
            'hillshade-illumination-direction': 318,
          },
        },
      ],
      terrain: { source: 'terrainSource', exaggeration: 1.38 },
      sky: {},
    },
  });

  map.addControl(
    new maplibregl.AttributionControl({ compact: true, customAttribution: '天气 Open-Meteo' }),
    'bottom-right',
  );

  map.once('style.load', () => {
    elements.terrainStatus.textContent = '正在加载地形与影像';
    PLACES.forEach((place) => {
      const marker = document.createElement('button');
      marker.type = 'button';
      marker.className = 'mountain-marker';
      marker.setAttribute('aria-label', `查看${place.name}`);
      marker.innerHTML = `<i></i><span>${place.shortName}<small></small></span>`;
      marker.addEventListener('click', () => selectPlace(place.id));
      new maplibregl.Marker({ element: marker, anchor: 'bottom' })
        .setLngLat(place.coordinates)
        .addTo(map);
      state.markers.set(place.id, marker);
    });
    renderPlace();

    window.setTimeout(() => {
      selectPlace(state.activePlaceId);
    }, reducedMotion ? 0 : 650);
  });

  map.on('error', () => {
    elements.terrainStatus.textContent = '部分地形暂未加载 · 可重载';
  });

  map.on('rotate', () => updateFlowOrientation(getActiveSnapshot()));
  map.on('idle', () => {
    if (map.isSourceLoaded('basemap') && map.isSourceLoaded('terrainSource')) elements.terrainStatus.textContent = '三维地形与影像已加载';
  });

  state.map = map;
}

document.querySelectorAll('[data-place]').forEach((button) => {
  button.addEventListener('click', () => selectPlace(button.dataset.place));
});

document.querySelectorAll('.layer-switch [data-layer]').forEach((button) => {
  button.addEventListener('click', () => {
    state.activeLayer = button.dataset.layer;
    elements.root.dataset.layer = state.activeLayer;
    document.querySelectorAll('.layer-switch [data-layer]').forEach((candidate) => {
      candidate.setAttribute('aria-pressed', String(candidate === button));
    });
    atmosphereRenderer.setWeather(getActiveSnapshot());
  });
});

elements.timeSlider.addEventListener('input', (event) => {
  stopPlayback();
  state.activeHour = Number(event.currentTarget.value);
  renderWeather();
});

elements.dataState.addEventListener('click', () => {
  if (!state.errors.has(state.activePlaceId)) return;
  loadForecast(getActivePlace(), { force: true });
});

elements.playForecast.addEventListener('click', () => {
  if (playback) { stopPlayback(); return; }
  const length = state.forecasts.get(state.activePlaceId)?.snapshots.length;
  if (!length) return;
  if (state.activeHour >= length - 1) { state.activeHour = 0; renderWeather(); }
  elements.playForecast.textContent = 'Ⅱ';
  elements.playForecast.setAttribute('aria-label', '暂停风雪变化');
  elements.playForecast.setAttribute('aria-pressed', 'true');
  playback = setInterval(() => {
    state.activeHour = nextForecastHour(state.activeHour, length);
    renderWeather();
    if (state.activeHour >= length - 1) stopPlayback();
  }, 1000);
});

document.querySelector('#open-weather').addEventListener('click', () => { stopPlayback(); elements.weatherPanel.showModal(); });
document.querySelector('#close-weather').addEventListener('click', () => elements.weatherPanel.close());
elements.weatherPanel.addEventListener('click', event => { if (event.target === elements.weatherPanel && event.clientY < elements.weatherPanel.getBoundingClientRect().top) elements.weatherPanel.close(); });
document.querySelectorAll('[data-camera]').forEach(button => button.addEventListener('click', () => {
  if (!state.map) return;
  const action = button.dataset.camera, duration = reducedMotion ? 0 : 550;
  if (action === 'reset') state.map.flyTo({ ...activeCamera(), duration });
  if (action === 'orbit') state.map.easeTo({ bearing: state.map.getBearing() + 45, duration });
  if (action === 'in') state.map.zoomIn({ duration });
  if (action === 'out') state.map.zoomOut({ duration });
}));
function resizeStage() {
  elements.root.style.setProperty('--dock-height', `${elements.dock.offsetHeight}px`);
  state.map?.resize();
  state.map?.jumpTo(activeCamera());
}
const dockObserver = new ResizeObserver(resizeStage);
dockObserver.observe(elements.dock);
window.addEventListener('resize', resizeStage);
document.addEventListener('visibilitychange', () => { if (document.hidden) stopPlayback(); });
document.querySelector('.reload-field').addEventListener('click', () => location.reload());
try { initializeMap(); } catch {
  elements.terrainStatus.textContent = '此设备暂不支持三维地形';
  document.querySelector('#map').innerHTML = '<p class="field-unavailable">三维地形暂不可用<br><small>仍可选择雪山、查看下方天气数据</small></p>';
  document.querySelectorAll('[data-camera]').forEach(button => { button.disabled = true; });
}
PLACES.forEach((place) => loadForecast(place));

window.addEventListener('beforeunload', () => { stopPlayback(); atmosphereRenderer.destroy(); dockObserver.disconnect(); state.map?.remove(); });
