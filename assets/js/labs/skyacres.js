/**
 * Lab: SkyAcres — geospatial agricultural intelligence (synthetic data).
 * UI layer; the vegetation model lives in models/ndvi-model.js.
 */
import { PARCELS, GRID_W, GRID_H, DEFAULT_CONDITIONS, CROPS, SEASON_DAYS, renderScene, zonalStats, seasonSeries, parcelAt, stressFactor } from '../models/ndvi-model.js';
import { esc, $, $$, slider, select, toggle, readControl, syncOutputs, details, download, announce, fmt } from '../lib/dom.js';
import { lineChart } from '../lib/charts.js';

const SCALE = 8;
const SEASON_START = new Date(2025, 3, 1); // 1 April — illustrative planting date
const dateOf = (day) => new Date(SEASON_START.getTime() + day * 864e5).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// NDVI colour ramp: bare soil → sparse → healthy canopy
const RAMP = [[-0.05, [92, 64, 44]], [0.2, [165, 128, 82]], [0.35, [205, 190, 112]], [0.5, [140, 178, 86]], [0.65, [70, 150, 72]], [0.8, [28, 110, 58]], [0.95, [10, 70, 42]]];
function rampColor(v) {
  for (let i = 1; i < RAMP.length; i++) {
    if (v <= RAMP[i][0]) {
      const [a, ca] = RAMP[i - 1], [b, cb] = RAMP[i];
      const t = Math.max(0, (v - a) / (b - a));
      return ca.map((c, k) => Math.round(c + (cb[k] - c) * t));
    }
  }
  return RAMP[RAMP.length - 1][1];
}
const RAMP_CSS = `linear-gradient(90deg, ${RAMP.map(([v, c]) => `rgb(${c}) ${((v + 0.05) / 1) * 100}%`).join(', ')})`;

const PIPELINE = [
  ['Acquire', 'Download multispectral scenes for the area of interest and date range.', 'Generates a synthetic 96 × 64 pixel scene with red and near-infrared reflectance for the chosen date.'],
  ['Mask clouds', 'Flag pixels contaminated by cloud or shadow so they are excluded from statistics.', 'Draws a cloud field from smooth noise; the cloud-cover slider controls how much is masked.'],
  ['Compute index', 'Calculate NDVI = (NIR − Red) / (NIR + Red) for every clear pixel.', 'Computes NDVI from the synthetic reflectances. Hover the map to see NIR, Red and NDVI for a pixel.'],
  ['Zonal statistics', 'Summarise pixel values within each field boundary: mean, spread, and clear-pixel share.', 'Calculates mean, standard deviation and clear fraction per parcel. Under 20 % clear means no estimate.'],
  ['Compare to baseline', 'Compare the field to what is expected for that crop and date under normal conditions.', 'Baseline is the same phenology model with zero rainfall and temperature anomaly.'],
  ['Alert', 'Turn anomalies into a small number of clear, explainable alerts.', 'Anomaly ≤ −0.05 is moderate risk, ≤ −0.10 is high risk. The thresholds are illustrative.'],
];

const METHODS = [
  ['Vegetation index', '<p>NDVI = (NIR − Red) / (NIR + Red). Healthy leaves reflect strongly in near-infrared and absorb red light, so dense green canopy gives values around 0.7–0.9 and bare soil around 0.1–0.2.</p>'],
  ['Crop phenology model', '<p>Field-mean NDVI follows a double-logistic curve: <code>NDVI(t) = soil + (max − soil) · green(t) · senesce(t) · vigour(t)</code>, where green-up and senescence are logistic functions with crop-specific timing. Parameters are illustrative, loosely shaped like peanut, cotton, corn and soybean seasons.</p>'],
  ['Water and heat stress', '<p>A seasonal water-balance factor compares demand (rising ~5 % per °C of warming) with supply (rainfall anomaly × the field\'s water-holding factor, plus irrigation). The deficit reduces canopy vigour progressively from day 25 to day 80. Temperatures more than 2 °C above normal add a small heat penalty.</p>'],
  ['Cloud masking and missing data', '<p>Masked pixels are excluded from zonal statistics. If fewer than 20 % of a field\'s pixels are clear, the lab reports “too cloudy to assess” rather than a misleading average. Honest abstention is part of the method.</p>'],
  ['Limitations', '<ul><li>All data is synthetic. Field shapes, crop parameters, reflectances and clouds are generated, not observed.</li><li>No atmospheric correction, soil-background or saturation effects are modelled; NDVI saturates in dense canopy in reality.</li><li>The stress model is a teaching simplification, not an agronomic model, and the alert thresholds are not calibrated against yield.</li><li>This is a new, independent demonstration of the workflow, not Sky Acres platform code.</li></ul>'],
];

export function mount(root) {
  const cond = { ...DEFAULT_CONDITIONS, irrigation: {} };
  let layer = 'ndvi';
  let selected = PARCELS[3].id;
  let scene, stats;

  root.innerHTML = `
  <header class="lab-head">
    <p class="lab-kicker"><span class="tag tag-synthetic">Synthetic data</span> <span class="tag tag-demo">Independent demonstration</span></p>
    <h1>SkyAcres: geospatial crop intelligence</h1>
    <p class="lab-question">Can satellite-derived indicators give farmers an early, honest warning of crop stress, and say plainly when the data is too poor to tell?</p>
    <p class="notice"><strong>About this lab.</strong> As a Software Engineer at Sky Acres (USG) I built backend features for an agricultural land platform that integrates satellite-derived data. This lab is a new, independent demonstration of a remote-sensing workflow, built for this portfolio with synthetic fields and imagery. It is not Sky Acres code or data.</p>
  </header>

  <section class="lab-block" aria-labelledby="map-h">
    <h2 id="map-h" class="block-h">Field monitor</h2>
    <div class="instrument">
      <form class="controls" aria-label="Scene controls" onsubmit="return false">
        <fieldset><legend>Acquisition</legend>
          ${slider({ key: 'day', label: 'Image date', min: 0, max: SEASON_DAYS, step: 1, value: cond.day })}
          ${slider({ key: 'cloud', label: 'Cloud cover', min: 0, max: 100, step: 1, value: cond.cloud, unit: '%' })}
          ${select({ key: 'layer', label: 'Map layer', options: { ndvi: 'NDVI (vegetation index)', rgb: 'Simulated true colour', mask: 'Cloud mask' }, value: layer })}
        </fieldset>
        <fieldset><legend>Season conditions</legend>
          ${slider({ key: 'rainfall', label: 'Rainfall vs normal', min: -60, max: 40, step: 5, value: cond.rainfall, unit: '%' })}
          ${slider({ key: 'temperature', label: 'Temperature vs normal', min: -2, max: 4, step: 0.5, value: cond.temperature, unit: ' °C' })}
        </fieldset>
        <div class="control-actions">
          <button type="button" class="btn btn-small" data-preset="drought">Drought preset</button>
          <button type="button" class="btn btn-small" data-preset="wet">Wet season</button>
          <button type="button" class="btn btn-small" data-preset="reset">Reset</button>
        </div>
      </form>
      <div class="readout">
        <div class="panel">
          <div class="map-toolbar"><h3 class="panel-h" id="map-title"></h3><span class="small dim">Select a field on the map or in the table</span></div>
          <div class="map-wrap"><canvas id="map" width="${GRID_W * SCALE}" height="${GRID_H * SCALE}" role="img" aria-label="Synthetic satellite map of six fields"></canvas><div class="map-tip" hidden></div></div>
          <div class="map-legend" id="legend"></div>
        </div>
        <div class="panel" id="parcel-panel" aria-live="polite"></div>
      </div>
    </div>
  </section>

  <section class="lab-block" aria-labelledby="tbl-h">
    <h2 id="tbl-h" class="block-h">All fields</h2>
    <div id="parcel-table"></div>
  </section>

  <section class="lab-block" aria-labelledby="pipe-h">
    <h2 id="pipe-h" class="block-h">Processing pipeline</h2>
    <p class="dim">Select a step to see what it does in a production system and how this lab implements it.</p>
    <ol class="pipeline">${PIPELINE.map((p, i) => `<li><button class="pipe-step" data-pipe="${i}" aria-pressed="${i === 0}"><span class="n">${i + 1}</span>${esc(p[0])}</button></li>`).join('')}</ol>
    <div class="pipe-detail" id="pipe-detail" aria-live="polite"></div>
  </section>

  <section class="lab-block research" aria-labelledby="meth-h">
    <h2 id="meth-h" class="block-h">Methodology</h2>
    <div class="themes">${METHODS.map(([t, b], i) => details(esc(t), b, i === 0)).join('')}</div>
    <div class="control-actions"><button class="btn" data-action="download">Download methodology and current results</button></div>
  </section>`;

  const canvas = $('#map', root);
  const ctx = canvas.getContext('2d');
  const off = Object.assign(document.createElement('canvas'), { width: GRID_W, height: GRID_H });
  const offCtx = off.getContext('2d');
  const tip = $('.map-tip', root);

  function drawMap() {
    const img = offCtx.createImageData(GRID_W, GRID_H);
    for (let i = 0; i < scene.ndvi.length; i++) {
      let c;
      const v = scene.ndvi[i];
      if (layer === 'ndvi') c = scene.cloud[i] ? [214, 220, 228] : rampColor(v);
      else if (layer === 'rgb') {
        const veg = Math.max(0, Math.min(1, (v - 0.15) / 0.7));
        c = [150 - veg * 110, 130 - veg * 40, 95 - veg * 55].map(Math.round);
        if (scene.cloud[i]) c = [232, 236, 240];
      } else c = scene.cloud[i] ? [227, 178, 91] : [24, 40, 68];
      img.data.set([...c, 255], i * 4);
    }
    offCtx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0, canvas.width, canvas.height);

    // Field boundaries and labels
    for (const p of PARCELS) {
      const [x0, y0, x1, y1] = p.rect.map((v) => v * SCALE);
      const sel = p.id === selected;
      const z = stats.find((s) => s.parcel.id === p.id);
      ctx.lineWidth = sel ? 3 : 1.5;
      ctx.strokeStyle = sel ? '#eee9dd' : 'rgba(238,233,221,0.55)';
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0 - 1, y1 - y0 - 1);
      const label = `${p.id} ${p.name}`;
      ctx.font = '600 13px "Public Sans", system-ui, sans-serif';
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(7,16,31,0.82)';
      ctx.fillRect(x0 + 6, y0 + 6, tw + 30, 22);
      ctx.fillStyle = { low: '#79c98f', moderate: '#e3b25b', high: '#e27b78', unknown: '#8592a8' }[z.risk.level];
      ctx.beginPath(); ctx.arc(x0 + 16, y0 + 17, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#eee9dd';
      ctx.fillText(label, x0 + 25, y0 + 21.5);
    }
    $('#map-title', root).textContent = `${dateOf(cond.day)}, day ${cond.day} of the season`;
    $('#legend', root).innerHTML = layer === 'ndvi'
      ? `<span>NDVI</span><span>0.0</span><span class="ramp" style="background:${RAMP_CSS}"></span><span>0.9</span><span class="swatch" style="background:#d6dce4"></span><span>Cloud (masked)</span>`
      : layer === 'mask' ? '<span class="swatch" style="background:#e3b25b"></span><span>Masked pixel</span><span class="swatch" style="background:#182844"></span><span>Clear pixel</span>'
        : '<span>Simulated true colour, for orientation only. Analysis uses NDVI.</span>';
  }

  function renderParcel() {
    const z = stats.find((s) => s.parcel.id === selected);
    const p = z.parcel;
    const irrigated = cond.irrigation[p.id] ?? p.irrigated;
    const series = seasonSeries(p, cond);
    const curIdx = Math.round(cond.day / 5);
    const panel = $('#parcel-panel', root);
    panel.innerHTML = `
      <div class="map-toolbar"><h3 class="panel-h">${esc(p.id)} ${esc(p.name)} <span class="dim">— ${esc(z.crop)}, synthetic field</span></h3><span class="pill ${z.risk.level}">${esc(z.risk.label)}</span></div>
      <dl class="kpis">
        <div class="kpi"><dt>Mean NDVI (clear pixels)</dt><dd>${z.valid ? z.mean.toFixed(2) : '—'}</dd></div>
        <div class="kpi"><dt>Expected for date</dt><dd>${z.baseline.toFixed(2)}</dd></div>
        <div class="kpi ${z.valid ? (z.risk.level === 'low' ? 'good' : z.risk.level === 'moderate' ? 'warn' : 'bad') : ''}"><dt>Anomaly</dt><dd>${z.valid ? (z.anomaly >= 0 ? '+' : '') + z.anomaly.toFixed(2) : '—'}</dd></div>
        <div class="kpi"><dt>Clear pixels</dt><dd>${fmt.pct(z.clearFraction)}</dd></div>
        <div class="kpi"><dt>Water-stress factor</dt><dd>${stressFactor(p, cond).toFixed(2)}<small>of 1.00</small></dd></div>
      </dl>
      ${!z.valid ? '<p class="notice" style="margin-top:1rem"><strong>No estimate.</strong> Fewer than 20 % of this field\'s pixels are cloud-free on this date. Choose another date or reduce cloud cover.</p>' : ''}
      <div style="margin-top:1rem">${toggle({ key: 'irrigate', label: `Irrigate this field (${p.irrigated ? 'irrigated by default' : 'rain-fed by default'})`, checked: irrigated })}</div>
      <div id="ndvi-chart"></div>
      <p class="small dim">Dashed line: expected NDVI under normal conditions. Solid line: modelled NDVI under the current season conditions. Values are field means without noise.</p>`;
    lineChart($('#ndvi-chart', panel), {
      height: 240, ariaLabel: `NDVI over the season for ${p.name}`,
      x: { values: series.map((s) => s.day), format: (d) => dateOf(d), label: 'Date' },
      y: { min: 0, max: 1, format: (v) => v.toFixed(1), label: 'NDVI' },
      series: [
        { name: 'Expected (normal season)', values: series.map((s) => s.baseline), color: 'var(--ivory-dim)', dash: '5 4', width: 1.5 },
        { name: 'Current conditions', values: series.map((s) => s.ndvi), color: 'var(--teal)', area: true },
      ],
      vLine: curIdx,
      points: z.valid ? [{ i: curIdx, y: series[curIdx].ndvi, color: 'var(--cyan)' }] : [],
      tooltip: (i) => `<strong>${dateOf(series[i].day)}</strong> (day ${series[i].day})<br>Expected: ${series[i].baseline.toFixed(2)}<br>Current: ${series[i].ndvi.toFixed(2)}<br>Difference: ${(series[i].ndvi - series[i].baseline).toFixed(2)}`,
    });
  }

  function renderTable() {
    $('#parcel-table', root).innerHTML = `<div class="table-wrap"><table class="data-table"><thead><tr>
      <th scope="col">Field</th><th scope="col">Crop</th><th scope="col">Water</th><th scope="col">Mean NDVI</th><th scope="col">± SD</th><th scope="col">Expected</th><th scope="col">Anomaly</th><th scope="col">Clear</th><th scope="col">Status</th></tr></thead><tbody>
      ${stats.map((z) => `<tr data-row="${z.parcel.id}" class="${z.parcel.id === selected ? 'is-selected' : ''}" tabindex="0" aria-selected="${z.parcel.id === selected}">
        <td>${esc(z.parcel.id)} ${esc(z.parcel.name)}</td><td>${esc(z.crop)}</td><td>${(cond.irrigation[z.parcel.id] ?? z.parcel.irrigated) ? 'Irrigated' : 'Rain-fed'}</td>
        <td>${z.valid ? z.mean.toFixed(2) : '—'}</td><td>${z.valid ? z.sd.toFixed(2) : '—'}</td><td>${z.baseline.toFixed(2)}</td>
        <td>${z.valid ? (z.anomaly >= 0 ? '+' : '') + z.anomaly.toFixed(2) : '—'}</td><td>${fmt.pct(z.clearFraction)}</td>
        <td><span class="pill ${z.risk.level}">${esc(z.risk.label)}</span></td></tr>`).join('')}
      </tbody></table></div>`;
  }

  let pipeStep = 0;
  function renderPipe() {
    const [name, prod, lab] = PIPELINE[pipeStep];
    $$('.pipe-step', root).forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.pipe) === pipeStep)));
    $('#pipe-detail', root).innerHTML = `<div class="two-col"><div><p class="small dim">In a production pipeline</p><p>${esc(prod)}</p></div><div><p class="small dim">In this lab</p><p>${esc(lab)}</p></div></div>`;
  }

  function update() {
    syncOutputs(root, { day: (d) => dateOf(d), rainfall: (v) => `${v > 0 ? '+' : ''}${v}%`, temperature: (v) => `${v > 0 ? '+' : ''}${v} °C` });
    scene = renderScene(cond);
    stats = zonalStats(scene, cond);
    drawMap(); renderParcel(); renderTable();
  }

  const select_ = (id) => { selected = id; drawMap(); renderParcel(); renderTable(); announce(`Selected ${id}`); };

  root.addEventListener('input', (e) => {
    const k = e.target.dataset.key;
    if (!k) return;
    const v = readControl(e.target);
    if (k === 'layer') { layer = v; drawMap(); return; }
    if (k === 'irrigate') { cond.irrigation[selected] = v; update(); return; }
    cond[k] = v; update();
  });
  root.addEventListener('click', (e) => {
    const row = e.target.closest('[data-row]');
    if (row) { select_(row.dataset.row); return; }
    const pipe = e.target.closest('[data-pipe]');
    if (pipe) { pipeStep = Number(pipe.dataset.pipe); renderPipe(); return; }
    const pre = e.target.closest('[data-preset]');
    if (pre) {
      const presets = { drought: { rainfall: -45, temperature: 2.5, cloud: 10 }, wet: { rainfall: 30, temperature: -0.5, cloud: 45 }, reset: { rainfall: 0, temperature: 0, cloud: DEFAULT_CONDITIONS.cloud, day: DEFAULT_CONDITIONS.day } };
      Object.assign(cond, presets[pre.dataset.preset]);
      if (pre.dataset.preset === 'reset') cond.irrigation = {};
      $$('input[type=range]', root).forEach((el) => { if (el.dataset.key in cond) el.value = cond[el.dataset.key]; });
      update(); announce(`Applied ${pre.textContent}`);
      return;
    }
    if (e.target.closest('[data-action="download"]')) {
      const lines = ['# SkyAcres lab — methodology and current results', '', 'All data is synthetic. Independent demonstration; not Sky Acres platform code.', '',
        `Date: ${dateOf(cond.day)} (day ${cond.day}); rainfall ${cond.rainfall}% vs normal; temperature ${cond.temperature} °C vs normal; cloud cover ${cond.cloud}%`, '',
        '| Field | Crop | Mean NDVI | Expected | Anomaly | Clear | Status |', '|---|---|---|---|---|---|---|',
        ...stats.map((z) => `| ${z.parcel.id} ${z.parcel.name} | ${z.crop} | ${z.valid ? z.mean.toFixed(3) : '—'} | ${z.baseline.toFixed(3)} | ${z.valid ? z.anomaly.toFixed(3) : '—'} | ${(z.clearFraction * 100).toFixed(0)}% | ${z.risk.label} |`),
        '', '## Pipeline', ...PIPELINE.map(([n, p, l], i) => `${i + 1}. **${n}** — ${p} (Lab: ${l})`),
        '', '## Methods', ...METHODS.map(([t, b]) => `### ${t}\n${b.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}\n`)];
      download('skyacres-lab-summary.md', lines.join('\n'), 'text/markdown');
    }
  });
  root.addEventListener('keydown', (e) => {
    const row = e.target.closest('[data-row]');
    if (row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select_(row.dataset.row); }
  });

  // Map interaction: hover for pixel values, click to select a field
  const toGrid = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: Math.floor(((e.clientX - r.left) / r.width) * GRID_W), y: Math.floor(((e.clientY - r.top) / r.height) * GRID_H), px: e.clientX - r.left, py: e.clientY - r.top, rw: r.width };
  };
  canvas.addEventListener('pointermove', (e) => {
    const g = toGrid(e);
    if (g.x < 0 || g.y < 0 || g.x >= GRID_W || g.y >= GRID_H) return;
    const i = g.y * GRID_W + g.x;
    const p = parcelAt(g.x, g.y);
    tip.hidden = false;
    tip.style.left = `${Math.min(g.px, g.rw - 190)}px`; tip.style.top = `${g.py}px`;
    tip.innerHTML = `${p ? `<strong>${esc(p.id)} ${esc(p.name)}</strong> · ${esc(CROPS[p.crop].label)}` : '<strong>Outside fields</strong>'}<br>Pixel (${g.x}, ${g.y})${scene.cloud[i] ? '<br><span style="color:var(--amber)">Cloud — masked</span>' : `<br>NIR ${scene.nir[i].toFixed(3)} · Red ${scene.red[i].toFixed(3)}<br>NDVI ${scene.ndvi[i].toFixed(3)}`}`;
    canvas.style.cursor = p ? 'pointer' : 'crosshair';
  });
  canvas.addEventListener('pointerleave', () => { tip.hidden = true; });
  canvas.addEventListener('click', (e) => { const g = toGrid(e); const p = parcelAt(g.x, g.y); if (p) select_(p.id); });

  update(); renderPipe();
  return null;
}
