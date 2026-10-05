import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildForecastUrl,
  deriveAtmosphere,
  formatVisibility,
  normalizeForecast,
} from '../src/explore-field/weather.mjs';

const fixture = {
  latitude: 27.99,
  longitude: 86.93,
  elevation: 8849,
  generationtime_ms: 0.2,
  utc_offset_seconds: 28800,
  timezone: 'Asia/Shanghai',
  hourly_units: {
    temperature_2m: '°C',
    snowfall: 'cm',
    snow_depth: 'm',
    cloud_cover: '%',
    visibility: 'm',
    wind_speed_10m: 'km/h',
    wind_direction_10m: '°',
    wind_gusts_10m: 'km/h',
    freezing_level_height: 'm',
  },
  hourly: {
    time: ['2026-09-04T00:00', '2026-09-04T01:00'],
    temperature_2m: [-16.2, -15.7],
    apparent_temperature: [-25.1, -24.4],
    snowfall: [0.3, 0],
    snow_depth: [1.21, 1.21],
    cloud_cover: [86, 40],
    cloud_cover_low: [10, 8],
    cloud_cover_mid: [76, 30],
    cloud_cover_high: [55, 22],
    visibility: [12400, 20100],
    wind_speed_10m: [31, 22],
    wind_direction_10m: [245, 270],
    wind_gusts_10m: [52, 39],
    freezing_level_height: [4780, 4860],
  },
};

test('buildForecastUrl requests 72 hours and the exact summit elevation', () => {
  const url = new URL(
    buildForecastUrl({ latitude: 27.9881, longitude: 86.925, elevation: 8849 }),
  );

  assert.equal(url.hostname, 'api.open-meteo.com');
  assert.equal(url.searchParams.get('forecast_hours'), '72');
  assert.equal(url.searchParams.get('elevation'), '8849');
  assert.match(url.searchParams.get('hourly'), /freezing_level_height/);
});

test('normalizeForecast creates one readable snapshot per timestamp', () => {
  const forecast = normalizeForecast(fixture);

  assert.equal(forecast.snapshots.length, 2);
  assert.equal(forecast.snapshots[0].temperature, -16.2);
  assert.equal(forecast.snapshots[0].snowfall, 0.3);
  assert.equal(forecast.snapshots[1].windDirection, 270);
  assert.equal(forecast.timezone, 'Asia/Shanghai');
});

test('deriveAtmosphere keeps effects bounded and responds to real values', () => {
  const snowy = deriveAtmosphere(normalizeForecast(fixture).snapshots[0]);
  const clear = deriveAtmosphere(normalizeForecast(fixture).snapshots[1]);

  assert.ok(snowy.snowIntensity > clear.snowIntensity);
  assert.ok(snowy.cloudOpacity > clear.cloudOpacity);
  assert.ok(snowy.windEnergy > 0);
  assert.ok(snowy.gustEnergy > 0);
  assert.ok(snowy.visibilityFog > clear.visibilityFog);
  assert.equal(snowy.flowDirection, 65);
  assert.ok(snowy.snowIntensity >= 0 && snowy.snowIntensity <= 1);
  assert.ok(snowy.cloudOpacity >= 0 && snowy.cloudOpacity <= 0.72);
  assert.ok(snowy.fieldEnergy >= 0 && snowy.fieldEnergy <= 1);
});

test('formatVisibility uses kilometres without fake precision', () => {
  assert.equal(formatVisibility(12400), '12.4 km');
  assert.equal(formatVisibility(null), '—');
});

test('missing visibility does not fabricate a dense fog event', () => {
  assert.equal(deriveAtmosphere({visibility:null}).visibilityFog, 0);
  assert.equal(deriveAtmosphere({visibility:0}).visibilityFog, 1);
});
