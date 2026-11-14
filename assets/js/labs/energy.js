/**
 * Lab: Solar, storage and grid reliability.
 * UI layer; the dispatch model lives in models/energy-model.js.
 */
import { DEFAULT_ENERGY, simulate, reliabilityLabel } from '../models/energy-model.js';
import { esc, $, $$, slider, readControl, syncOutputs, details, download, announce, fmt } from '../lib/dom.js';
import { lineChart } from '../lib/charts.js';

const COLORS = { solar: '#e3b25b', battery: '#86d9e6', grid: '#5c72c9', unserved: '#e27b78', demand: '#eee9dd', curtailed: '#8592a8', charge: '#4fc1b5' };

const PRESETS = {
  sunny: { label: 'Clear summer day', set: { cloudiness: 5, peakDemandMW: 55, outageHours: 0 } },
  cloudy: { label: 'Overcast day', set: { cloudiness: 70, peakDemandMW: 50, outageHours: 0 } },
  outage: { label: 'Evening grid outage', set: { cloudiness: 20, outageStart: 17, outageHours: 4 } },
  nostorage: { label: 'No storage', set: { batteryMWh: 0, batteryMW: 0 } },
  reset: { label: 'Reset', set: { ...DEFAULT_ENERGY } },
};

const ASSUMPTIONS = [
  'One-hour timesteps: 1 MW sustained for an hour is 1 MWh.',
  'PV output is a half-sine between 06:00 and 19:00 scaled by capacity, reduced uniformly by the cloudiness setting.',
  'Demand has a fixed daily shape (morning and evening peaks) scaled to the chosen peak, with seeded random noise.',
  'Battery losses are split evenly between charging and discharging (√90 % each way). The battery cannot go below the reserve floor.',
  'Dispatch is greedy: solar first, then battery, then grid. There is no forecasting, price signal or optimisation.',
  'During an outage, grid import is zero. The site cannot export to the grid.',
];
const LIMITS = [
  'This is an independent demonstration, not an operational grid model. It ignores voltage, frequency, network constraints, ramp rates and inverter limits.',
  'A single representative day cannot capture seasonal variation or multi-day low-sun periods, which usually drive storage sizing.',
  'Greedy dispatch can leave the battery empty before the evening peak; an optimising dispatcher would hold reserve when an outage is expected.',
  'Battery degradation, temperature effects and costs are not modelled.',
];

export function mount(root) {
  let p = { ...DEFAULT_ENERGY };
  const saved = { A: null, B: null };

  root.innerHTML = `
  <header class="lab-head">
    <p class="lab-kicker"><span class="tag tag-synthetic">Simplified model</span> <span class="tag tag-demo">Independent demonstration</span></p>
    <h1>Solar, storage and grid reliability</h1>
    <p class="lab-question">How much storage does a solar-heavy site need before its reliability stops depending on the grid?</p>
    <p class="notice"><strong>Not an operational model.</strong> An hourly energy-balance demonstration built for this portfolio, with physically consistent units and deliberately simple rules. It is not derived from any project's data.</p>
  </header>

  <section class="lab-block" aria-labelledby="sim-h">
    <h2 id="sim-h" class="block-h">24-hour simulation</h2>
    <div class="instrument">
      <form class="controls" aria-label="Energy system controls" onsubmit="return false">
        <fieldset><legend>Scenarios</legend>
          <div class="control-actions" style="margin-top:0">${Object.entries(PRESETS).map(([k, v]) => `<button type="button" class="btn btn-small" data-preset="${k}">${esc(v.label)}</button>`).join('')}</div>
        </fieldset>
        <fieldset><legend>Solar</legend>
          ${slider({ key: 'solarMW', label: 'Solar capacity', min: 0, max: 150, step: 5, value: p.solarMW, unit: ' MW' })}
          ${slider({ key: 'cloudiness', label: 'Cloud reduction', min: 0, max: 90, step: 5, value: p.cloudiness, unit: '%' })}
        </fieldset>
        <fieldset><legend>Demand</legend>
          ${slider({ key: 'peakDemandMW', label: 'Peak demand', min: 10, max: 100, step: 1, value: p.peakDemandMW, unit: ' MW' })}
          ${slider({ key: 'fluctuation', label: 'Hourly fluctuation (std. dev.)', min: 0, max: 20, step: 1, value: p.fluctuation, unit: '%' })}
          <button type="button" class="btn btn-small" data-action="reseed">Draw new fluctuations</button>
        </fieldset>
        <fieldset><legend>Battery storage</legend>
          ${slider({ key: 'batteryMWh', label: 'Energy capacity', min: 0, max: 300, step: 10, value: p.batteryMWh, unit: ' MWh' })}
          ${slider({ key: 'batteryMW', label: 'Power rating', min: 0, max: 80, step: 5, value: p.batteryMW, unit: ' MW' })}
          ${slider({ key: 'initialSoC', label: 'State of charge at midnight', min: 0, max: 100, step: 5, value: p.initialSoC, unit: '%' })}
          ${slider({ key: 'efficiency', label: 'Round-trip efficiency', min: 70, max: 98, step: 1, value: p.efficiency, unit: '%' })}
        </fieldset>
        <fieldset><legend>Grid reliability</legend>
          ${slider({ key: 'gridCapMW', label: 'Grid import limit', min: 0, max: 100, step: 5, value: p.gridCapMW, unit: ' MW' })}
          ${slider({ key: 'outageStart', label: 'Outage starts at', min: 0, max: 23, step: 1, value: p.outageStart, unit: ':00' })}
          ${slider({ key: 'outageHours', label: 'Outage length', min: 0, max: 12, step: 1, value: p.outageHours, unit: ' h' })}
        </fieldset>
      </form>
      <div class="readout">
        <div id="kpis"></div>
        <div class="panel"><h3 class="panel-h">Hourly supply and demand</h3><p class="small dim">Stacked areas show how demand is met each hour. The ivory line is demand.</p><div id="supply-chart"></div></div>
        <div class="panel"><h3 class="panel-h">Battery state of charge</h3><div id="soc-chart"></div></div>
        <div class="panel"><h3 class="panel-h">Daily energy balance</h3><div id="balance"></div></div>
      </div>
    </div>
  </section>

  <section class="lab-block" aria-labelledby="cmp-h">
    <h2 id="cmp-h" class="block-h">Compare scenarios</h2>
    <p class="dim">Save the current setup as A or B, change it, and compare outcomes side by side.</p>
    <div class="control-actions">
      <button class="btn" data-action="save-A">Save current as A</button>
      <button class="btn" data-action="save-B">Save current as B</button>
      <button class="btn" data-action="csv">Download hourly results (CSV)</button>
    </div>
    <div id="compare"></div>
  </section>

  <section class="lab-block research" aria-labelledby="as-h">
    <h2 id="as-h" class="block-h">Assumptions and limitations</h2>
    <div class="two-col">
      <div><h3>Assumptions</h3><ul class="limits">${ASSUMPTIONS.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>
      <div><h3>Limitations</h3><ul class="limits">${LIMITS.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>
    </div>
    ${details('Dispatch rule, step by step', '<ol><li>Solar serves demand first.</li><li>Surplus solar charges the battery, limited by its power rating and remaining headroom; anything left is curtailed.</li><li>A shortfall is met by battery discharge, limited by power rating and the energy above the 10 % reserve floor.</li><li>Any remaining shortfall is imported from the grid, up to the import limit (zero during an outage).</li><li>Whatever is still missing is recorded as unserved energy.</li></ol>')}
    ${details('Why both MW and MWh matter', '<p>Energy capacity (MWh) sets how long a battery can supply power; power rating (MW) sets how fast. A 200 MWh battery rated at 10 MW still cannot cover a 40 MW evening peak. Try raising one without the other.</p>')}
  </section>`;

  let result;
  function kpiClass(v, good, warn) { return v <= good ? 'good' : v <= warn ? 'warn' : 'bad'; }

  function render() {
    syncOutputs(root, { outageStart: (v) => fmt.hour(v) });
    result = simulate(p);
    const { hours, metrics: m } = result;
    const rel = reliabilityLabel(m);
    $('#kpis', root).innerHTML = `
      <div class="map-toolbar"><span class="pill ${rel.level}">${esc(rel.label)}</span><span class="small dim">Seed ${p.seed}. The same inputs always give the same result.</span></div>
      <dl class="kpis">
        <div class="kpi ${kpiClass(1 - m.servedShare, 0.0001, 0.02)}"><dt>Demand served</dt><dd>${fmt.pct(m.servedShare, 1)}</dd></div>
        <div class="kpi ${kpiClass(m.unserved, 0.01, 5)}"><dt>Unserved energy</dt><dd>${fmt.n(m.unserved, 1)}<small>MWh</small></dd></div>
        <div class="kpi"><dt>Hours with shortfall</dt><dd>${m.unservedHours}<small>of 24</small></dd></div>
        <div class="kpi"><dt>Met without the grid</dt><dd>${fmt.pct(m.localShare)}</dd></div>
        <div class="kpi"><dt>Solar curtailed</dt><dd>${fmt.pct(m.curtailedShare)}</dd></div>
        <div class="kpi"><dt>Peak grid import</dt><dd>${fmt.n(m.peakGrid, 1)}<small>MW</small></dd></div>
        <div class="kpi"><dt>Battery cycles</dt><dd>${fmt.n(m.cycles, 2)}</dd></div>
        <div class="kpi"><dt>Charge at 24:00</dt><dd>${fmt.n(m.endSoC, 0)}<small>%</small></dd></div>
      </dl>`;

    const band = p.outageHours > 0 ? [{ from: p.outageStart, to: Math.min(24, p.outageStart + p.outageHours), label: 'Grid outage' }] : [];
    lineChart($('#supply-chart', root), {
      height: 300, ariaLabel: 'Hourly supply stacked by source, with demand',
      x: { values: hours.map((h) => h.hour), format: fmt.hour },
      y: { min: 0, format: (v) => `${v}`, label: 'MW' },
      bands: band,
      series: [
        { name: 'Solar to load', values: hours.map((h) => h.solarToLoad), color: COLORS.solar, stack: true },
        { name: 'Battery discharge', values: hours.map((h) => h.discharge), color: COLORS.battery, stack: true },
        { name: 'Grid import', values: hours.map((h) => h.grid), color: COLORS.grid, stack: true },
        { name: 'Unserved', values: hours.map((h) => h.unserved), color: COLORS.unserved, stack: true },
        { name: 'Demand', values: hours.map((h) => h.demand), color: COLORS.demand, width: 2 },
        { name: 'Total solar output', values: hours.map((h) => h.solar), color: COLORS.solar, dash: '3 4', width: 1.3 },
      ],
      tooltip: (i) => {
        const h = hours[i];
        return `<strong>${fmt.hour(h.hour)}–${fmt.hour(h.hour + 1)}</strong>${h.outage ? ' <span style="color:var(--rose)">outage</span>' : ''}<br>Demand ${h.demand.toFixed(1)} MW<br>Solar ${h.solar.toFixed(1)} (to load ${h.solarToLoad.toFixed(1)})<br>Battery ${h.discharge > 0 ? `−${h.discharge.toFixed(1)}` : h.charge > 0 ? `+${h.charge.toFixed(1)} charging` : '0'}<br>Grid ${h.grid.toFixed(1)}${h.unserved > 0.01 ? `<br><span style="color:var(--rose)">Unserved ${h.unserved.toFixed(1)}</span>` : ''}${h.curtailed > 0.01 ? `<br>Curtailed ${h.curtailed.toFixed(1)}` : ''}`;
      },
    });
    lineChart($('#soc-chart', root), {
      height: 200, ariaLabel: 'Battery state of charge by hour',
      x: { values: hours.map((h) => h.hour), format: fmt.hour },
      y: { min: 0, max: 100, format: (v) => `${v}%` },
      bands: band,
      hLines: [{ y: p.minSoC, label: 'Reserve floor', color: 'var(--amber)' }],
      series: [
        { name: 'State of charge (end of hour)', values: hours.map((h) => h.soc), color: COLORS.battery, area: true },
        { name: 'Charging (MW, as % of rating)', values: hours.map((h) => (p.batteryMW ? (h.charge / p.batteryMW) * 100 : 0)), color: COLORS.charge, dash: '2 3', width: 1.3 },
      ],
      tooltip: (i) => `<strong>${fmt.hour(hours[i].hour + 1)}</strong><br>State of charge ${hours[i].soc.toFixed(0)}%<br>Charged ${hours[i].charge.toFixed(1)} MWh in · discharged ${hours[i].discharge.toFixed(1)} MWh out`,
    });

    const bar = (parts, total) => `<div class="stackbar" role="img" aria-label="${parts.map((x) => `${x.label} ${x.v.toFixed(0)} MWh`).join(', ')}">${parts.filter((x) => x.v > 0.05).map((x) => `<span style="flex:${x.v};background:${x.c}" title="${esc(x.label)}: ${x.v.toFixed(1)} MWh"></span>`).join('')}</div>
      <ul class="chart-legend">${parts.map((x) => `<li><span class="swatch" style="background:${x.c}"></span>${esc(x.label)} ${fmt.n(x.v, 0)} MWh (${total ? fmt.pct(x.v / total) : '—'})</li>`).join('')}</ul>`;
    $('#balance', root).innerHTML = `
      <p class="small dim">Where the solar energy went (${fmt.n(m.solar, 0)} MWh generated)</p>
      ${bar([{ label: 'Served load directly', v: m.solarUsed, c: COLORS.solar }, { label: 'Charged battery', v: m.charge, c: COLORS.charge }, { label: 'Curtailed', v: m.curtailed, c: COLORS.curtailed }], m.solar)}
      <p class="small dim" style="margin-top:1rem">How demand was met (${fmt.n(m.demand, 0)} MWh)</p>
      ${bar([{ label: 'Solar', v: m.solarUsed, c: COLORS.solar }, { label: 'Battery', v: m.discharge, c: COLORS.battery }, { label: 'Grid', v: m.grid, c: COLORS.grid }, { label: 'Unserved', v: m.unserved, c: COLORS.unserved }], m.demand)}
      <p class="small dim">The battery took in ${fmt.n(m.charge, 1)} MWh and delivered ${fmt.n(m.discharge, 1)} MWh. The difference is the change in stored energy plus conversion losses</p>`;
  }

  function snapshot() { const { metrics } = simulate(p); return { p: { ...p }, m: metrics }; }
  function renderCompare() {
    const el = $('#compare', root);
    if (!saved.A && !saved.B) { el.innerHTML = '<p class="state-empty small">Nothing saved yet. Save the current setup as A, change something (for example add storage), then save as B.</p>'; return; }
    const rows = [
      ['Solar capacity', (s) => `${s.p.solarMW} MW`], ['Cloud reduction', (s) => `${s.p.cloudiness}%`], ['Peak demand', (s) => `${s.p.peakDemandMW} MW`],
      ['Battery', (s) => `${s.p.batteryMWh} MWh / ${s.p.batteryMW} MW`], ['Grid limit', (s) => `${s.p.gridCapMW} MW`],
      ['Outage', (s) => (s.p.outageHours ? `${fmt.hour(s.p.outageStart)} for ${s.p.outageHours} h` : 'None')],
      ['Demand served', (s) => fmt.pct(s.m.servedShare, 1)], ['Unserved energy', (s) => `${s.m.unserved.toFixed(1)} MWh`],
      ['Met without the grid', (s) => fmt.pct(s.m.localShare)], ['Solar curtailed', (s) => fmt.pct(s.m.curtailedShare)], ['Peak grid import', (s) => `${s.m.peakGrid.toFixed(1)} MW`],
    ];
    el.innerHTML = `<div class="table-wrap"><table class="data-table"><thead><tr><th scope="col">Measure</th><th scope="col">A</th><th scope="col">B</th></tr></thead><tbody>
      ${rows.map(([l, f]) => { const a = saved.A ? f(saved.A) : '—', b = saved.B ? f(saved.B) : '—'; return `<tr class="${saved.A && saved.B && a !== b ? 'diff' : ''}"><th scope="row">${esc(l)}</th><td>${esc(a)}</td><td>${esc(b)}</td></tr>`; }).join('')}
      </tbody></table></div><p class="small dim">Highlighted rows differ between A and B.</p>`;
  }

  function setControls() { $$('input[type=range]', root).forEach((el) => { if (el.dataset.key in p) el.value = p[el.dataset.key]; }); }

  root.addEventListener('input', (e) => { const k = e.target.dataset.key; if (!k) return; p[k] = readControl(e.target); render(); });
  root.addEventListener('click', (e) => {
    const pre = e.target.closest('[data-preset]');
    if (pre) { p = { ...p, ...PRESETS[pre.dataset.preset].set }; setControls(); render(); announce(`Scenario: ${PRESETS[pre.dataset.preset].label}`); return; }
    const a = e.target.closest('[data-action]');
    if (!a) return;
    if (a.dataset.action === 'reseed') { p.seed = (p.seed * 7 + 13) % 997; render(); announce('New demand fluctuations drawn'); }
    if (a.dataset.action.startsWith('save-')) { saved[a.dataset.action.slice(-1)] = snapshot(); renderCompare(); announce(`Saved as ${a.dataset.action.slice(-1)}`); }
    if (a.dataset.action === 'csv') {
      const head = 'hour,demand_MW,solar_MW,solar_to_load_MW,battery_charge_MW,battery_discharge_MW,grid_MW,unserved_MW,curtailed_MW,soc_pct,outage';
      const rows = result.hours.map((h) => [h.hour, h.demand, h.solar, h.solarToLoad, h.charge, h.discharge, h.grid, h.unserved, h.curtailed, h.soc].map((v) => v.toFixed(3)).join(',') + `,${h.outage}`);
      download('energy-lab-hourly.csv', [`# Parameters: ${JSON.stringify(p)}`, head, ...rows].join('\n'), 'text/csv');
    }
  });

  render(); renderCompare();
  return null;
}
