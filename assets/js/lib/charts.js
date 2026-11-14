/**
 * Reusable SVG chart components.
 * Dependency-free, responsive via viewBox, keyboard- and pointer-inspectable.
 *
 *   lineChart(container, {
 *     height, x: { values, format, label }, y: { min, max, format, label },
 *     series: [{ name, values, color, area, dash, stack, width }],
 *     bands: [{ from, to, label }],         // shaded x ranges (e.g. outages)
 *     hLines: [{ y, label, color }],        // reference lines
 *     vLine: xIndex,                        // highlighted x position
 *     tooltip: (i) => html,                 // tooltip body for x index i
 *   })
 */
import { esc } from './dom.js';

const NS = 'http://www.w3.org/2000/svg';
const M = { top: 14, right: 16, bottom: 34, left: 52 };

function niceTicks(min, max, count = 5) {
  const span = max - min || 1;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) || step0;
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

export function lineChart(container, opts) {
  const W = 720;
  const H = opts.height || 280;
  const n = opts.x.values.length;
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;

  // Stack series flagged `stack` on top of each other (in order)
  const base = new Array(n).fill(0);
  const drawn = opts.series.map((s) => {
    if (!s.stack) return { ...s, lo: null, hi: s.values };
    const lo = base.slice();
    const hi = s.values.map((v, i) => (base[i] += v));
    return { ...s, lo, hi };
  });
  const allY = drawn.flatMap((s) => s.hi);
  const yMin = opts.y.min ?? Math.min(0, ...allY);
  const yMax = opts.y.max ?? (Math.max(...allY, ...(opts.hLines || []).map((l) => l.y)) * 1.08 || 1);
  const xs = (i) => M.left + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const ys = (v) => M.top + ih - ((v - yMin) / (yMax - yMin || 1)) * ih;

  const yt = niceTicks(yMin, yMax, 4);
  const xEvery = Math.max(1, Math.ceil(n / 8));
  const yf = opts.y.format || ((v) => v);
  const xf = opts.x.format || ((v) => v);

  const path = (vals) => vals.map((v, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join('');
  const area = (hi, lo) => `${path(hi)}L${xs(n - 1)},${ys(lo ? lo[n - 1] : yMin)}${(lo || new Array(n).fill(yMin)).map((v, i) => [i, v]).reverse().map(([i, v]) => `L${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join('')}Z`;

  let svg = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(opts.ariaLabel || 'Chart')}"><defs><pattern id="band-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="rgba(182,92,58,0.05)"/><line x1="0" y1="0" x2="0" y2="5" stroke="#b65c3a" stroke-width="0.6" stroke-opacity="0.45"/></pattern></defs>`;
  (opts.bands || []).forEach((b) => {
    const x0 = xs(Math.max(0, b.from - 0.5)), x1 = xs(Math.min(n - 1, b.to - 0.5));
    svg += `<rect x="${x0}" y="${M.top}" width="${Math.max(2, x1 - x0)}" height="${ih}" class="chart-band"/>`;
    if (b.label) svg += `<text x="${x0 + 4}" y="${M.top + 12}" class="chart-band-label">${esc(b.label)}</text>`;
  });
  yt.forEach((t) => {
    svg += `<line x1="${M.left}" x2="${W - M.right}" y1="${ys(t)}" y2="${ys(t)}" class="chart-grid"/>`;
    svg += `<text x="${M.left - 8}" y="${ys(t) + 4}" text-anchor="end" class="chart-tick">${esc(yf(t))}</text>`;
  });
  opts.x.values.forEach((v, i) => {
    if (i % xEvery) return;
    svg += `<text x="${xs(i)}" y="${H - M.bottom + 18}" text-anchor="middle" class="chart-tick">${esc(xf(v))}</text>`;
  });
  if (opts.y.label) svg += `<text x="12" y="${M.top + ih / 2}" transform="rotate(-90 12 ${M.top + ih / 2})" text-anchor="middle" class="chart-axis-label">${esc(opts.y.label)}</text>`;
  if (opts.x.label) svg += `<text x="${M.left + iw / 2}" y="${H - 2}" text-anchor="middle" class="chart-axis-label">${esc(opts.x.label)}</text>`;

  svg += `<line x1="${M.left}" x2="${W - M.right}" y1="${M.top + ih}" y2="${M.top + ih}" stroke="var(--ink)" stroke-width="1"/>`;
  drawn.filter((s) => s.area || s.stack).forEach((s) => {
    svg += `<path d="${area(s.hi, s.lo)}" fill="${s.color}" fill-opacity="${s.stack ? 0.85 : 0.12}" stroke="${s.stack ? 'var(--paper)' : 'none'}" stroke-width="${s.stack ? 0.6 : 0}"/>`;
  });
  drawn.filter((s) => !s.stack).forEach((s) => {
    svg += `<path d="${path(s.hi)}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''} stroke-linejoin="round" stroke-linecap="round"/>`;
  });
  (opts.hLines || []).forEach((l) => {
    svg += `<line x1="${M.left}" x2="${W - M.right}" y1="${ys(l.y)}" y2="${ys(l.y)}" stroke="${l.color || 'var(--muted)'}" stroke-dasharray="4 4"/>`;
    if (l.label) svg += `<text x="${W - M.right - 4}" y="${ys(l.y) - 5}" text-anchor="end" class="chart-tick" fill="${l.color || ''}">${esc(l.label)}</text>`;
  });
  if (Number.isInteger(opts.vLine)) svg += `<line x1="${xs(opts.vLine)}" x2="${xs(opts.vLine)}" y1="${M.top}" y2="${M.top + ih}" class="chart-vline"/>`;
  (opts.points || []).forEach((p) => {
    svg += `<circle cx="${xs(p.i)}" cy="${ys(p.y)}" r="${p.r || 5}" fill="${p.color}" stroke="var(--bg)" stroke-width="2"/>`;
  });
  svg += `<line class="chart-cursor" x1="0" x2="0" y1="${M.top}" y2="${M.top + ih}" visibility="hidden"/>`;
  svg += `<rect class="chart-hit" x="${M.left}" y="${M.top}" width="${iw}" height="${ih}" fill="transparent" tabindex="0" aria-label="Inspect values. Use left and right arrow keys."/>`;
  svg += '</svg>';

  const legend = opts.legend === false ? '' : `<ul class="chart-legend">${opts.series.filter((s) => s.name).map((s) =>
    `<li><span class="swatch${s.stack || s.area ? '' : s.dash ? ' is-dash' : ' is-line'}" style="background:${s.color};border-color:${s.color}"></span>${esc(s.name)}</li>`).join('')}</ul>`;

  container.innerHTML = `<div class="chart-wrap">${legend}${svg}<div class="chart-tip" role="status" hidden></div></div>`;

  if (!opts.tooltip) return;
  const svgEl = container.querySelector('svg');
  const tip = container.querySelector('.chart-tip');
  const cursor = container.querySelector('.chart-cursor');
  const hit = container.querySelector('.chart-hit');
  let idx = -1;
  const show = (i) => {
    idx = Math.max(0, Math.min(n - 1, i));
    cursor.setAttribute('x1', xs(idx)); cursor.setAttribute('x2', xs(idx)); cursor.setAttribute('visibility', 'visible');
    tip.innerHTML = opts.tooltip(idx);
    tip.hidden = false;
    const pct = (xs(idx) / W) * 100;
    tip.style.left = `${pct}%`;
    tip.classList.toggle('flip', pct > 60);
  };
  const hide = () => { cursor.setAttribute('visibility', 'hidden'); tip.hidden = true; };
  hit.addEventListener('pointermove', (e) => {
    const r = svgEl.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    show(Math.round(((x - M.left) / iw) * (n - 1)));
  });
  hit.addEventListener('pointerleave', hide);
  hit.addEventListener('focus', () => show(idx < 0 ? 0 : idx));
  hit.addEventListener('blur', hide);
  hit.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { show(idx + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { show(idx - 1); e.preventDefault(); }
  });
}

/** Horizontal bar list — simple, readable comparison of a few values. */
export function barList(container, items, { max = 1, format = (v) => v } = {}) {
  container.innerHTML = `<ul class="bar-list">${items.map((it) => `
    <li><span class="bar-label">${esc(it.label)}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${Math.max(0, Math.min(100, (it.value / max) * 100))}%;background:${it.color || 'var(--teal)'}"></span></span>
      <span class="bar-value">${esc(format(it.value))}</span></li>`).join('')}</ul>`;
}
