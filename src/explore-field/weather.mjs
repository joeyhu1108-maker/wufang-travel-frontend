const HOURLY_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'snowfall',
  'snow_depth',
  'cloud_cover',
  'cloud_cover_low',
  'cloud_cover_mid',
  'cloud_cover_high',
  'visibility',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'freezing_level_height',
];

export function buildForecastUrl({ latitude, longitude, elevation }) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('elevation', String(elevation));
  url.searchParams.set('hourly', HOURLY_FIELDS.join(','));
  url.searchParams.set('forecast_hours', '72');
  url.searchParams.set('timezone', 'Asia/Shanghai');
  url.searchParams.set('wind_speed_unit', 'kmh');
  return url.toString();
}

export function normalizeForecast(payload) {
  if (!payload?.hourly?.time?.length) {
    throw new Error('天气接口没有返回逐小时数据');
  }

  const snapshots = payload.hourly.time.map((time, index) => ({
    time,
    temperature: payload.hourly.temperature_2m?.[index] ?? null,
    apparentTemperature: payload.hourly.apparent_temperature?.[index] ?? null,
    snowfall: payload.hourly.snowfall?.[index] ?? null,
    snowDepth: payload.hourly.snow_depth?.[index] ?? null,
    cloudCover: payload.hourly.cloud_cover?.[index] ?? null,
    cloudLow: payload.hourly.cloud_cover_low?.[index] ?? null,
    cloudMid: payload.hourly.cloud_cover_mid?.[index] ?? null,
    cloudHigh: payload.hourly.cloud_cover_high?.[index] ?? null,
    visibility: payload.hourly.visibility?.[index] ?? null,
    windSpeed: payload.hourly.wind_speed_10m?.[index] ?? null,
    windDirection: payload.hourly.wind_direction_10m?.[index] ?? null,
    windGusts: payload.hourly.wind_gusts_10m?.[index] ?? null,
    freezingLevel: payload.hourly.freezing_level_height?.[index] ?? null,
  }));

  return {
    latitude: payload.latitude,
    longitude: payload.longitude,
    modelElevation: payload.elevation,
    timezone: payload.timezone,
    units: payload.hourly_units ?? {},
    snapshots,
  };
}

export function deriveAtmosphere(snapshot) {
  if (!snapshot) {
    return {
      snowIntensity: 0,
      cloudOpacity: 0.12,
      windDrift: 0,
      windEnergy: 0,
      gustEnergy: 0,
      visibilityFog: 0,
      fieldEnergy: 0,
      flowDirection: 180,
    };
  }

  const snowfall = Math.max(0, Number(snapshot.snowfall) || 0);
  const cloudCover = Math.max(0, Math.min(100, Number(snapshot.cloudCover) || 0));
  const windSpeed = Math.max(0, Number(snapshot.windSpeed) || 0);
  const windDirection = Number(snapshot.windDirection) || 0;
  const windGusts = Math.max(windSpeed, Number(snapshot.windGusts) || 0);
  const rawVisibility = snapshot.visibility == null ? NaN : Number(snapshot.visibility);
  const visibility = Number.isFinite(rawVisibility) ? Math.max(0, rawVisibility) : 30000;
  const snowIntensity = Math.min(1, snowfall / 1.4);
  const windEnergy = Math.min(1, windSpeed / 55);
  const gustEnergy = Math.min(1, Math.max(0, windGusts - windSpeed) / 45);
  const visibilityFog = Math.min(1, Math.max(0, (20000 - visibility) / 19000));

  return {
    snowIntensity,
    cloudOpacity: Math.min(0.72, 0.08 + (cloudCover / 100) * 0.58),
    windDrift: Math.sin((windDirection * Math.PI) / 180) * Math.min(2.2, windSpeed / 18),
    windEnergy,
    gustEnergy,
    visibilityFog,
    fieldEnergy: Math.min(
      1,
      windEnergy * 0.42 + gustEnergy * 0.18 + snowIntensity * 0.2 + (cloudCover / 100) * 0.2,
    ),
    flowDirection: (windDirection + 180) % 360,
  };
}

export function formatMetric(value, suffix = '', digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(digits)}${suffix}`;
}

export function formatVisibility(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${(Number(value) / 1000).toFixed(1)} km`;
}

export function formatForecastTime(value) {
  if (!value) return '—';
  const date = new Date(`${value}:00+08:00`);
  const day = new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'Asia/Shanghai',
  }).format(date);
  const hour = new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai',
  }).format(date);
  return { day, hour };
}
