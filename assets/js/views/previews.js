/**
 * Small live previews for the lab index, drawn from the same models the labs use,
 * so each thumbnail is a real (default-settings) output rather than decoration.
 */
import { thresholdSweep, DEFAULT_POLICY } from '../models/safety-model.js';
import { seasonSeries, PARCELS, DEFAULT_CONDITIONS } from '../models/ndvi-model.js';
import { simulate } from '../models/energy-model.js';
import { BARRIER_DIMENSIONS, PERSONAS, assessBarriers } from '../models/agrione-model.js';

const W = 300, H = 150;
const line = (vals, min, max, color, width = 1.6, dash = '') => {
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${(i / (vals.length - 1)) * W},${(H - 6 - ((v - min) / (max - min)) * (H - 12)).toFixed(1)}`).join('');
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''} vector-effect="non-scaling-stroke"/>`;
};
const area = (vals, min, max, color) => {
  const pts = vals.map((v, i) => `L${(i / (vals.length - 1)) * W},${(H - 6 - ((v - min) / (max - min)) * (H - 12)).toFixed(1)}`).join('');
  return `<path d="M0,${H - 6}${pts}L${W},${H - 6}Z" fill="${color}" fill-opacity="0.14"/>`;
};
const svg = (inner) => `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${[0.25, 0.5, 0.75].map((f) => `<line x1="0" x2="${W}" y1="${(H * f).toFixed(1)}" y2="${(H * f).toFixed(1)}" stroke="#d1cdc3" stroke-width="0.6"/>`).join('')}<line x1="0" x2="${W}" y1="${H - 6}" y2="${H - 6}" stroke="#252722" stroke-width="0.8"/>${inner}</svg>`;

let cache = {};
export function labPreview(id) {
  if (cache[id]) return cache[id];
  let out = '';
  if (id === 'safety') {
    const s = thresholdSweep({ policy: DEFAULT_POLICY, overconfidence: 0.1, samples: 600 });
    const maxH = Math.max(...s.map((x) => x.residualHarm));
    out = svg(line(s.map((x) => x.automationRate), 0, 1, '#252722', 1.4) + line(s.map((x) => x.residualHarm / maxH), 0, 1, '#b65c3a', 1.4, '4 3'));
  } else if (id === 'skyacres') {
    const p = PARCELS[3];
    const dry = seasonSeries(p, { ...DEFAULT_CONDITIONS, rainfall: -40, temperature: 2 });
    out = svg(line(dry.map((d) => d.baseline), 0.1, 0.9, '#252722', 1.1, '3 3') + area(dry.map((d) => d.ndvi), 0.1, 0.9, '#777c58') + line(dry.map((d) => d.ndvi), 0.1, 0.9, '#777c58', 1.5));
  } else if (id === 'energy') {
    const { hours } = simulate({});
    const max = Math.max(...hours.map((h) => Math.max(h.demand, h.solar)));
    out = svg(area(hours.map((h) => h.solar), 0, max, '#617b89') + line(hours.map((h) => h.solar), 0, max, '#617b89', 1.2) + line(hours.map((h) => h.demand), 0, max, '#252722', 1.4) + line(hours.map((h) => h.soc), 0, 100, '#b65c3a', 1.1, '3 3'));
  } else if (id === 'agrione') {
    const { scores } = assessBarriers(PERSONAS[0].answers);
    const bw = W / BARRIER_DIMENSIONS.length;
    out = svg(scores.map((s, i) => `<rect x="${i * bw + bw * 0.3}" y="${H - 6 - s.score * (H - 14)}" width="${bw * 0.4}" height="${s.score * (H - 14)}" fill="${s.score >= 0.7 ? '#b65c3a' : '#777c58'}"/>`).join(''));
  }
  return (cache[id] = out);
}
