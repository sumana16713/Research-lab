// Unit tests for the simulation models. Run with: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, computeIndices, SCENARIOS, DEFAULT_POLICY, thresholdSweep, sensitivityGrid } from '../assets/js/models/safety-model.js';
import { simulate, DEFAULT_ENERGY } from '../assets/js/models/energy-model.js';
import { parcelNdvi, baselineNdvi, PARCELS, renderScene, zonalStats, DEFAULT_CONDITIONS } from '../assets/js/models/ndvi-model.js';
import { screen, assessBarriers, PERSONAS } from '../assets/js/models/agrione-model.js';

test('safety: indices stay in [0,1]', () => {
  for (const s of SCENARIOS) {
    const { cEff, impact, risk } = computeIndices(s);
    for (const v of [cEff, impact, risk]) assert.ok(v >= 0 && v <= 1);
  }
});

test('safety: advisory mode always needs a person', () => {
  for (const s of SCENARIOS) {
    const r = evaluate(s, { ...DEFAULT_POLICY, mode: 'advisory', humanLatency: 1 });
    assert.ok(['human', 'human-2'].includes(r.outcome));
  }
});

test('safety: full autonomy never escalates', () => {
  for (const s of SCENARIOS) assert.equal(evaluate(s, { ...DEFAULT_POLICY, mode: 'autonomous' }).outcome, 'auto');
});

test('safety: slow review triggers fallback', () => {
  const s = SCENARIOS.find((x) => x.id === 'frequency'); // 8 s window
  assert.equal(evaluate(s, { ...DEFAULT_POLICY, humanLatency: 60 }).outcome, 'fallback');
});

test('safety: severity 5 with two-person rule needs two approvers', () => {
  const s = SCENARIOS.find((x) => x.id === 'cyber');
  const r = evaluate(s, { ...DEFAULT_POLICY, humanLatency: 30 });
  assert.equal(r.approvers, 2);
});

test('safety: higher threshold never lowers automation rate', () => {
  const sweep = thresholdSweep({ policy: DEFAULT_POLICY, samples: 500 });
  for (let i = 1; i < sweep.length; i++) assert.ok(sweep[i].automationRate >= sweep[i - 1].automationRate - 1e-9);
});

test('safety: sensitivity grid size', () => {
  assert.equal(sensitivityGrid(SCENARIOS[0], DEFAULT_POLICY, 10).length, 100);
});

test('energy: energy balance closes every hour', () => {
  const { hours } = simulate({ ...DEFAULT_ENERGY, outageHours: 3 });
  for (const h of hours) {
    const supplied = h.solarToLoad + h.discharge + h.grid + h.unserved;
    assert.ok(Math.abs(supplied - h.demand) < 1e-6, `hour ${h.hour}`);
    assert.ok(h.soc >= -1e-9 && h.soc <= 100 + 1e-9);
  }
});

test('energy: battery never exceeds power rating', () => {
  const { hours, params } = simulate({ ...DEFAULT_ENERGY, solarMW: 150 });
  for (const h of hours) assert.ok(h.charge <= params.batteryMW + 1e-9 && h.discharge <= params.batteryMW + 1e-9);
});

test('energy: deterministic for a fixed seed', () => {
  assert.deepEqual(simulate(DEFAULT_ENERGY).metrics, simulate(DEFAULT_ENERGY).metrics);
});

test('ndvi: drought lowers NDVI relative to baseline', () => {
  const p = PARCELS.find((x) => !x.irrigated);
  assert.ok(parcelNdvi(p, 90, { rainfall: -50, temperature: 3, irrigation: {} }) < baselineNdvi(p, 90));
});

test('ndvi: full cloud cover yields no valid parcels', () => {
  const c = { ...DEFAULT_CONDITIONS, cloud: 100 };
  assert.ok(zonalStats(renderScene(c), c).every((z) => !z.valid));
});

test('agrione: screener returns every program with a status', () => {
  const { profile, answers } = PERSONAS[0];
  const res = screen(profile, answers);
  assert.equal(res.length, 8);
  assert.ok(res.every((r) => ['eligible', 'conditional', 'ineligible'].includes(r.status)));
  assert.ok(assessBarriers(answers).overall > 0);
});
