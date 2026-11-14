/**
 * Fig. 1 on the home page: the central question of the AI safety study, drawn as a plane.
 *
 * x = probability the system's proposed action is wrong, y = impact if it is wrong.
 * The curve is the oversight threshold (impact × p(error) = τ). Above it, a person decides.
 * The visitor moves a point across the plane with the pointer or the arrow keys, and the
 * caption reports what the default policy would do. The curve draws in once on load —
 * the only page-load motion on the site — and not at all under reduced motion.
 */
import { SCENARIOS, DEFAULT_POLICY, computeIndices } from './models/safety-model.js';
import { esc } from './lib/dom.js';

const W = 640, H = 440, M = { l: 66, r: 18, t: 18, b: 52 };
// Label placement per scenario, so neighbouring labels never collide: [dx, dy, anchor]
const LABEL = { thermal: [-9, 4, 'end'], frequency: [0, -11, 'middle'], restoration: [9, 4, 'start'], forecast: [9, 4, 'start'], cyber: [-9, 14, 'end'] };
const iw = W - M.l - M.r, ih = H - M.t - M.b;
const X = (p) => M.l + p * iw;
const Y = (i) => M.t + ih - i * ih;
const TAU = DEFAULT_POLICY.riskThreshold;

export function mountFig1(container) {
  if (!container) return () => {};
  let pt = { p: 0.42, i: 0.62 };

  let curve = '';
  for (let k = 0; k <= 80; k++) {
    const p = TAU + (1 - TAU) * (k / 80);
    curve += `${k ? 'L' : 'M'}${X(p).toFixed(1)},${Y(Math.min(1, TAU / p)).toFixed(1)}`;
  }
  const region = `${curve}L${X(1)},${Y(1)}L${X(TAU)},${Y(1)}Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const dots = SCENARIOS.map((s) => {
    const ix = computeIndices(s);
    const px = 1 - ix.cEff, py = ix.impact;
    const [dx, dy, anchor] = LABEL[s.id] || [9, 4, 'start'];
    return `<g class="f1-scn"><circle cx="${X(px)}" cy="${Y(py)}" r="3.5"/><text x="${X(px) + dx}" y="${Y(py) + dy}" text-anchor="${anchor}">${esc(s.short)}</text></g>`;
  }).join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="fig1-svg" role="application" tabindex="0" aria-label="Interactive figure: probability of error against impact, with the oversight threshold. Use arrow keys to move the point." aria-describedby="fig1-readout">
      <defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" class="f1-hatch"/></pattern></defs>
      ${ticks.map((t) => `<line class="f1-grid" x1="${X(t)}" x2="${X(t)}" y1="${M.t}" y2="${M.t + ih}"/><line class="f1-grid" x1="${M.l}" x2="${M.l + iw}" y1="${Y(t)}" y2="${Y(t)}"/>`).join('')}
      <path d="${region}" fill="url(#hatch)" class="f1-region"/>
      <path d="${curve}" class="f1-curve"/>
      <line class="f1-axis" x1="${M.l}" x2="${M.l + iw}" y1="${M.t + ih}" y2="${M.t + ih}"/>
      <line class="f1-axis" x1="${M.l}" x2="${M.l}" y1="${M.t}" y2="${M.t + ih}"/>
      ${ticks.map((t) => `<text class="f1-tick" x="${X(t)}" y="${M.t + ih + 18}" text-anchor="middle">${t.toFixed(2)}</text><text class="f1-tick" x="${M.l - 10}" y="${Y(t) + 4}" text-anchor="end">${t.toFixed(2)}</text>`).join('')}
      <text class="f1-axlabel" x="${M.l + iw}" y="${H - 8}" text-anchor="end">Probability the action is wrong →</text>
      <text class="f1-axlabel" x="12" y="${M.t}" transform="rotate(-90 12 ${M.t})" text-anchor="end">Impact if wrong →</text>
      <text class="f1-zone" x="${X(0.97)}" y="${Y(0.72)}" text-anchor="end">a person decides</text>
      <text class="f1-zone" x="${X(0.97)}" y="${Y(0.04)}" text-anchor="end">the system may act</text>
      ${dots}
      <g class="f1-probe"><line class="f1-cross" data-ax="x"/><line class="f1-cross" data-ax="y"/><circle class="f1-pt" r="6"/></g>
    </svg>
    <p class="fig1-readout" id="fig1-readout" aria-live="polite"></p>`;

  const svg = container.querySelector('svg');
  const ptEl = svg.querySelector('.f1-pt');
  const [cx, cy] = svg.querySelectorAll('.f1-cross');
  const readout = container.querySelector('.fig1-readout');

  function draw() {
    const x = X(pt.p), y = Y(pt.i);
    ptEl.setAttribute('cx', x); ptEl.setAttribute('cy', y);
    cx.setAttribute('x1', x); cx.setAttribute('x2', x); cx.setAttribute('y1', y); cx.setAttribute('y2', M.t + ih);
    cy.setAttribute('x1', M.l); cy.setAttribute('x2', x); cy.setAttribute('y1', y); cy.setAttribute('y2', y);
    const risk = pt.p * pt.i;
    const human = risk > TAU;
    ptEl.classList.toggle('is-human', human);
    readout.innerHTML = `<span class="mono">p(wrong) ${pt.p.toFixed(2)}&ensp;impact ${pt.i.toFixed(2)}&ensp;risk ${risk.toFixed(3)}</span> <span class="f1-verdict">${human ? `Above the threshold (τ = ${TAU}): a person must sign off.` : `Below the threshold: the system may act, and the action is logged.`}</span>`;
  }
  function fromEvent(e) {
    const r = svg.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * W, sy = ((e.clientY - r.top) / r.height) * H;
    pt = { p: clamp((sx - M.l) / iw), i: clamp((M.t + ih - sy) / ih) };
    draw();
  }
  svg.addEventListener('pointermove', fromEvent);
  svg.addEventListener('pointerdown', fromEvent);
  svg.addEventListener('keydown', (e) => {
    const d = e.shiftKey ? 0.1 : 0.02;
    const k = { ArrowRight: [d, 0], ArrowLeft: [-d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] }[e.key];
    if (!k) return;
    e.preventDefault();
    pt = { p: clamp(pt.p + k[0]), i: clamp(pt.i + k[1]) };
    draw();
  });
  draw();
  return () => {};
}

const clamp = (v) => Math.min(1, Math.max(0, v));
