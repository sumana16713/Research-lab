/**
 * Synthetic vegetation-index model for the SkyAcres demonstration.
 *
 * All data here is SYNTHETIC. Field shapes, crop parameters and reflectances are
 * generated to illustrate a remote-sensing workflow; they are not observations.
 *
 *   NDVI = (NIR − Red) / (NIR + Red)
 *
 * Canopy development follows a double-logistic curve (green-up × senescence),
 * a common simplification in phenology studies. Water and heat stress reduce
 * canopy vigour through a simple seasonal water-balance factor.
 */
import { clamp, valueNoise2D } from '../lib/rng.js';

export const GRID_W = 96;
export const GRID_H = 64;
export const SEASON_DAYS = 150;

const CROPS = {
  peanut: { label: 'Peanut', max: 0.82, greenHalf: 45, senDay: 128, k: 0.11 },
  cotton: { label: 'Cotton', max: 0.80, greenHalf: 55, senDay: 135, k: 0.09 },
  corn: { label: 'Corn', max: 0.88, greenHalf: 38, senDay: 110, k: 0.14 },
  soy: { label: 'Soybean', max: 0.85, greenHalf: 48, senDay: 125, k: 0.12 },
};

/** Parcels are rectangles in grid coordinates [x0, y0, x1, y1]. Names are fictional. */
export const PARCELS = [
  { id: 'P1', name: 'North pivot', crop: 'corn', rect: [4, 4, 30, 28], whc: 0.9, irrigated: true },
  { id: 'P2', name: 'Creek bottom', crop: 'soy', rect: [34, 4, 60, 22], whc: 1.15, irrigated: false },
  { id: 'P3', name: 'Ridge field', crop: 'cotton', rect: [64, 4, 92, 30], whc: 0.7, irrigated: false },
  { id: 'P4', name: 'South forty', crop: 'peanut', rect: [4, 33, 34, 60], whc: 0.85, irrigated: false },
  { id: 'P5', name: 'Mill road', crop: 'peanut', rect: [38, 27, 62, 60], whc: 1.0, irrigated: true },
  { id: 'P6', name: 'East terrace', crop: 'cotton', rect: [66, 35, 92, 60], whc: 0.8, irrigated: false },
];

export const DEFAULT_CONDITIONS = { day: 75, rainfall: 0, temperature: 0, cloud: 15, irrigation: {} };

const logistic = (x) => 1 / (1 + Math.exp(-x));

/** Water-stress factor in [0.35, 1]. 1 = unstressed. */
export function stressFactor(parcel, { rainfall, temperature, irrigation }) {
  const irrigated = irrigation[parcel.id] ?? parcel.irrigated;
  const demand = 1 + 0.05 * temperature;              // ~5 % more crop water demand per °C
  const supply = (1 + rainfall / 100) * parcel.whc + (irrigated ? 0.6 : 0);
  const deficit = Math.max(0, demand - supply);
  const heat = temperature > 2 ? 0.04 * (temperature - 2) : 0; // heat stress during reproductive stage
  return clamp(1 - 0.75 * deficit - heat, 0.35, 1);
}

/** Field-mean NDVI for a parcel on a given day. */
export function parcelNdvi(parcel, day, conditions) {
  const c = CROPS[parcel.crop];
  const soil = 0.16;
  const green = logistic(c.k * (day - c.greenHalf));
  const senesce = logistic(-0.12 * (day - c.senDay));
  const f = stressFactor(parcel, conditions);
  const ramp = clamp((day - 25) / 55, 0, 1);           // stress accumulates through the season
  const vigour = 1 - (1 - f) * ramp;
  return soil + (c.max - soil) * green * senesce * vigour;
}

export function baselineNdvi(parcel, day) {
  return parcelNdvi(parcel, day, { rainfall: 0, temperature: 0, irrigation: {} });
}

export function seasonSeries(parcel, conditions) {
  const out = [];
  for (let d = 0; d <= SEASON_DAYS; d += 5) {
    out.push({ day: d, ndvi: parcelNdvi(parcel, d, conditions), baseline: baselineNdvi(parcel, d) });
  }
  return out;
}

export function classifyRisk(anomaly) {
  if (anomaly <= -0.1) return { level: 'high', label: 'High stress risk' };
  if (anomaly <= -0.05) return { level: 'moderate', label: 'Moderate stress risk' };
  return { level: 'low', label: 'Within normal range' };
}

const noise = valueNoise2D(1729);
const cloudNoise = valueNoise2D(4242);

export function parcelAt(x, y) {
  return PARCELS.find(({ rect: [x0, y0, x1, y1] }) => x >= x0 && x < x1 && y >= y0 && y < y1) || null;
}

/**
 * Render the synthetic scene: per-pixel NIR, Red, NDVI and a cloud mask.
 * Returns typed arrays so the canvas layer can draw quickly.
 */
export function renderScene(conditions) {
  const n = GRID_W * GRID_H;
  const ndvi = new Float32Array(n), nir = new Float32Array(n), red = new Float32Array(n);
  const cloud = new Uint8Array(n), parcelIdx = new Int8Array(n).fill(-1);
  const threshold = 1 - conditions.cloud / 100;
  const shift = conditions.day * 0.07; // clouds drift with the acquisition date
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const i = y * GRID_W + x;
      const p = parcelAt(x, y);
      const texture = noise(x / 6, y / 6) - 0.5;
      let v;
      if (p) {
        parcelIdx[i] = PARCELS.indexOf(p);
        // Crop rows: a faint periodic pattern whose direction alternates by field
        const rows = Math.sin(((parcelIdx[i] % 2 ? x : y) + parcelIdx[i]) * 1.9) * 0.025;
        v = parcelNdvi(p, conditions.day, conditions) + texture * 0.09 + rows;
      } else {
        v = 0.32 + texture * 0.35; // hedgerows, roads, bare ground
      }
      v = clamp(v, -0.05, 0.95);
      const n_ = 0.22 + 0.32 * clamp(v, 0, 1);
      ndvi[i] = v; nir[i] = n_; red[i] = n_ * (1 - v) / (1 + v);
      const cv = cloudNoise(x / 14 + shift, y / 14) * 0.7 + cloudNoise(x / 5, y / 5 + shift) * 0.3;
      cloud[i] = conditions.cloud > 0 && cv > threshold ? 1 : 0;
    }
  }
  return { ndvi, nir, red, cloud, parcelIdx };
}

/** Zonal statistics over clear pixels for each parcel. */
export function zonalStats(scene, conditions) {
  return PARCELS.map((p, k) => {
    let sum = 0, sumSq = 0, clear = 0, total = 0;
    for (let i = 0; i < scene.ndvi.length; i++) {
      if (scene.parcelIdx[i] !== k) continue;
      total++;
      if (scene.cloud[i]) continue;
      clear++; sum += scene.ndvi[i]; sumSq += scene.ndvi[i] ** 2;
    }
    const clearFraction = total ? clear / total : 0;
    const valid = clearFraction >= 0.2;
    const mean = clear ? sum / clear : NaN;
    const sd = clear ? Math.sqrt(Math.max(0, sumSq / clear - mean * mean)) : NaN;
    const baseline = baselineNdvi(p, conditions.day);
    const anomaly = mean - baseline;
    return {
      parcel: p, crop: CROPS[p.crop].label, mean, sd, clearFraction, valid, baseline, anomaly,
      stress: stressFactor(p, conditions), risk: valid ? classifyRisk(anomaly) : { level: 'unknown', label: 'Too cloudy to assess' },
    };
  });
}

export { CROPS };
