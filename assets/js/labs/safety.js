/**
 * Lab: Human oversight & critical infrastructure (AI safety sandbox).
 * UI layer only — all decision logic lives in models/safety-model.js.
 */
import {
  SCENARIOS, DEFAULT_POLICY, AUTHORITY_MODES, FALLBACKS, OUTCOME_LABEL,
  evaluate, computeIndices, sensitivityGrid, thresholdSweep,
} from '../models/safety-model.js';
import { esc, $, $$, slider, toggle, select, readControl, syncOutputs, details, download, announce, fmt } from '../lib/dom.js';
import { lineChart } from '../lib/charts.js';

// Black, ivory and burnt orange: automation light, human decisions dark, fallback in orange
const OUTCOME_COLOR = { auto: '#e2dccd', 'auto-veto': '#c4bdab', human: '#6b6c62', 'human-2': '#34362f', fallback: '#b65c3a' };
const MX_LABEL = { thermal: [-11, 4, 'end'], frequency: [0, -12, 'middle'], restoration: [11, 4, 'start'], forecast: [11, 4, 'start'], cyber: [-11, 16, 'end'] };
const SITUATION_KEYS = ['confidence', 'uncertainty', 'severity', 'harm', 'timeWindow'];

const FAILURES = [
  { id: 'overconfident', label: 'Overconfident model', desc: 'The model reports 0.95 confidence, but its true error rate is much higher than that implies.',
    apply: (s, p) => ({ s: { ...s, confidence: 0.95 }, p, trueConfidence: Math.max(0.3, s.confidence - 0.3) }) },
  { id: 'sensor', label: 'Sensor fault', desc: 'A failing sensor feeds the model inputs unlike anything it was trained on. Confidence stays high; uncertainty jumps.',
    apply: (s, p) => ({ s: { ...s, uncertainty: 0.75 }, p }) },
  { id: 'unavailable', label: 'Operator unavailable', desc: 'The on-call operator is handling another incident. Review now takes ten minutes.',
    apply: (s, p) => ({ s, p: { ...p, humanLatency: 600 } }) },
];

const RESEARCH = {
  hypotheses: [
    ['H1', 'Confidence thresholds alone under-escalate when a model is overconfident. Gating on an independent uncertainty signal reduces residual harm at a modest cost in automation.', 'Use the overconfidence slider in the threshold study and toggle the out-of-distribution rule.'],
    ['H2', 'For fast-acting hazards, human review time, not model accuracy, decides the outcome. A pre-approved safe fallback matters more than the approval rule.', 'Compare the grid-frequency scenario at different review times.'],
    ['H3', 'Irreversibility should gate autonomy on its own, regardless of confidence, because confidence says nothing about the cost of being wrong.', 'Turn off the irreversibility rule and watch which scenarios become automated.'],
    ['H4', 'Recording which rule fired, not just what happened, makes after-the-fact accountability practical.', 'Log a few decisions and download the audit trail.'],
  ],
  themes: [
    ['AI alignment and safety', 'Alignment is usually discussed at the level of model objectives. In infrastructure it also lives in the deployment envelope: which actions a system is allowed to take, under what evidence, and with whose sign-off. This sandbox treats the envelope as the object of study.'],
    ['Reliability under uncertainty', 'A stated confidence is only useful if it is calibrated. The model discounts confidence by an uncertainty score so that unfamiliar inputs cannot pass through on a confident-looking number.'],
    ['Human accountability', 'Requiring approval is not the same as meaningful oversight. If review is slower than the hazard, or approvers lack context, the person becomes a rubber stamp. The time-window check makes that failure visible.'],
    ['Model evaluation', 'The threshold study evaluates the policy, not just the model: the same classifier can be safe or unsafe depending on where escalation thresholds sit and how miscalibrated it is.'],
    ['Decisions in high-stakes environments', 'Severity, irreversibility and time pressure pull in different directions. The risk matrix shows how a single threshold carves the space, and where it is too blunt.'],
    ['Responsibility when automated systems cause harm', 'An audit trail of inputs, rules fired and approvers is a precondition for assigning responsibility. Without it, harm from automation tends to be attributed to no one.'],
  ],
  limitations: [
    'Scenarios are hypothetical and simplified. Numbers are illustrative, not drawn from operational data.',
    'The risk index is a transparent heuristic, not a validated risk measure. Severity and harm are ordinal scales treated as numbers.',
    'Human reviewers are modelled as a fixed delay with a fixed catch rate (85 % in the threshold study). Real review quality varies with workload, context and fatigue.',
    'The model ignores adversaries who might manipulate confidence or uncertainty signals.',
    'This is a research prototype for reasoning about oversight policy. It is not, and does not claim to be, a validated safety system for real infrastructure.',
  ],
};

export function mount(root) {
  let scenario = SCENARIOS[0];
  let situation = pick(scenario);
  let policy = { ...DEFAULT_POLICY };
  let failure = null;
  let overconfidence = 0.1;
  const log = [];
  const saved = { A: null, B: null };

  root.innerHTML = `
  <header class="lab-head">
    <p class="lab-kicker"><span class="tag tag-flag">Flagship</span> <span class="tag tag-synthetic">Hypothetical scenarios</span> <span class="tag tag-demo">Independent research prototype</span></p>
    <h1>Human oversight in critical infrastructure</h1>
    <p class="lab-question">When should an AI system be allowed to act on its own in critical infrastructure, and when should human oversight be mandatory?</p>
    <p class="notice"><strong>What this is.</strong> A transparent, rule-based model for reasoning about oversight policy, built independently for this portfolio. It does not control or simulate real equipment, and it has not been validated for operational use.</p>
  </header>

  <section class="lab-block" aria-labelledby="sc-h">
    <h2 id="sc-h" class="block-h">1. Choose a scenario</h2>
    <div class="scenario-tabs" role="tablist" aria-label="Scenarios">
      ${SCENARIOS.map((s, i) => `<button role="tab" class="scenario-tab" id="tab-${s.id}" data-scenario="${s.id}" aria-selected="${i === 0}">${esc(s.title)}</button>`).join('')}
    </div>
    <div class="scenario-card" role="tabpanel" id="scenario-panel" aria-live="polite"></div>
  </section>

  <section class="lab-block" aria-labelledby="dec-h">
    <h2 id="dec-h" class="block-h">2. Adjust the situation and the oversight policy</h2>
    <div class="instrument">
      <form class="controls" id="controls" aria-label="Controls" onsubmit="return false">
        <fieldset><legend>What the model reports</legend><div id="sit-controls"></div></fieldset>
        <fieldset><legend>Oversight policy</legend>
          <div class="ctl"><span class="ctl-label" id="mode-l">Decision authority</span>
            <div class="radio-stack" role="radiogroup" aria-labelledby="mode-l">
              ${Object.entries(AUTHORITY_MODES).map(([k, m]) => `<label class="radio"><input type="radio" name="mode" value="${k}"${k === policy.mode ? ' checked' : ''}><span><strong>${esc(m.label)}</strong><small>${esc(m.desc)}</small></span></label>`).join('')}
            </div>
          </div>
          ${slider({ key: 'riskThreshold', label: 'Oversight threshold τ (risk index)', min: 0, max: 0.5, step: 0.01, value: policy.riskThreshold, hint: 'Above this risk index, a person must approve.' })}
          ${slider({ key: 'confidenceFloor', label: 'Confidence floor', min: 0, max: 1, step: 0.01, value: policy.confidenceFloor, hint: 'Escalate when effective confidence is below this.' })}
          ${slider({ key: 'uncertaintyLimit', label: 'Out-of-distribution limit', min: 0, max: 1, step: 0.01, value: policy.uncertaintyLimit })}
          <div class="ctl"><span class="ctl-label">Escalation rules</span>
            ${toggle({ key: 'escalateOnOOD', label: 'Escalate on out-of-distribution input', checked: policy.escalateOnOOD })}
            ${toggle({ key: 'escalateIrreversible', label: 'Always escalate hard-to-reverse actions (harm ≥ 4)', checked: policy.escalateIrreversible })}
            ${toggle({ key: 'twoPersonRule', label: 'Two approvers for severity 5', checked: policy.twoPersonRule })}
          </div>
          ${slider({ key: 'humanLatency', label: 'Human review time', min: 5, max: 900, step: 5, value: policy.humanLatency, unit: ' s' })}
          ${select({ key: 'fallback', label: 'If review cannot finish in time', options: FALLBACKS, value: policy.fallback })}
        </fieldset>
        <div class="control-actions">
          <button type="button" class="btn btn-primary" data-action="log">Log this decision</button>
          <button type="button" class="btn" data-action="reset">Reset</button>
        </div>
      </form>

      <div class="readout">
        <div class="decision-card" id="decision" aria-live="polite"></div>
        <div class="panel">
          <h3 class="panel-h">Decision pathway</h3>
          <div id="pathway"></div>
        </div>
        <div class="panel">
          <h3 class="panel-h">Risk matrix</h3>
          <p class="small dim">Each dot is a scenario. The curve is the oversight threshold: points above it need a person.</p>
          <div id="matrix"></div>
        </div>
      </div>
    </div>
  </section>

  <section class="lab-block" aria-labelledby="fail-h">
    <h2 id="fail-h" class="block-h">3. Inject a failure</h2>
    <p class="margin-note">See how the current policy behaves when something goes wrong, and what recovery looks like.</p>
    <div class="seg" role="group" aria-label="Failure modes">
      ${FAILURES.map((f) => `<button class="seg-btn" data-failure="${f.id}" aria-pressed="false">${esc(f.label)}</button>`).join('')}
      <button class="seg-btn" data-failure="" aria-pressed="true">No failure</button>
    </div>
    <div id="failure-out" class="failure-out" aria-live="polite"></div>
  </section>

  <section class="lab-block" aria-labelledby="cmp-h">
    <h2 id="cmp-h" class="block-h">4. Compare two configurations</h2>
    <p class="margin-note">Save the current scenario and policy as A or B, then change something and compare.</p>
    <div class="control-actions">
      <button class="btn" data-action="save-A">Save current as A</button>
      <button class="btn" data-action="save-B">Save current as B</button>
      <button class="btn" data-action="export">Export configuration (JSON)</button>
    </div>
    <div id="compare"></div>
  </section>

  <section class="lab-block" aria-labelledby="sens-h">
    <h2 id="sens-h" class="block-h">5. Sensitivity analysis</h2>
    <div class="two-col">
      <div class="panel">
        <h3 class="panel-h">Who decides, across confidence and uncertainty</h3>
        <p class="small dim">Everything else held at current settings. The ring marks the current situation.</p>
        <div id="heatmap"></div>
      </div>
      <div class="panel">
        <h3 class="panel-h">Threshold study: automation vs residual harm</h3>
        <p class="small dim">2,000 synthetic decisions, fixed seed. Residual harm counts wrong actions that were automated or missed in review (reviewers catch 85 %).</p>
        ${slider({ key: 'overconfidence', label: 'Model overconfidence', min: 0, max: 0.4, step: 0.02, value: overconfidence, hint: 'True accuracy = stated confidence minus this amount.' })}
        <div id="sweep"></div>
      </div>
    </div>
  </section>

  <section class="lab-block" aria-labelledby="log-h">
    <h2 id="log-h" class="block-h">6. Decision audit log</h2>
    <div class="control-actions">
      <button class="btn" data-action="download-log">Download log (CSV)</button>
      <button class="btn" data-action="clear-log">Clear log</button>
    </div>
    <div id="audit"></div>
  </section>


  <section class="lab-block" aria-labelledby="ex-h">
    <h2 id="ex-h" class="block-h">How the gate reads a situation</h2>
    <p class="margin-note">Scroll through the four steps. The diagram highlights the part of the model each step describes, using the scenario selected above.</p>
    <div class="explainer">
      <figure class="explainer-fig panel"><h3 class="panel-h">The gate, step by step</h3><div id="ex-fig"></div></figure>
      <ol class="explainer-steps">
        <li data-ex="input"><span class="mono">Step 1</span><h3>The model proposes an action</h3><p>Every decision starts with a proposed action and the model's own confidence in it. Confidence alone is not trusted: it is what the model believes, not what is true.</p></li>
        <li data-ex="score"><span class="mono">Step 2</span><h3>Confidence is discounted, impact is weighed</h3><p>Uncertainty about whether the input looks like anything the model has seen reduces confidence. Severity and irreversibility set how much a mistake would cost. Together they give the risk index.</p></li>
        <li data-ex="gate"><span class="mono">Step 3</span><h3>The escalation rules are checked</h3><p>Any one rule is enough to require a person: unfamiliar input, a hard-to-reverse action, low effective confidence, or risk above the threshold. Rules that do not depend on confidence matter most when the model is overconfident.</p></li>
        <li data-ex="review"><span class="mono">Step 4</span><h3>A person decides, if there is time</h3><p>Oversight only works if review fits inside the time before harm occurs. When it does not, the policy falls back to a predefined safe state. That trade-off, between speed and accountability, is the core of the study.</p></li>
      </ol>
    </div>
  </section>
  <section class="lab-block research" aria-labelledby="res-h">
    <h2 id="res-h" class="block-h">Research framing</h2>
    <div class="two-col">
      <div>
        <h3>Hypotheses this sandbox lets you probe</h3>
        <dl class="hyp">${RESEARCH.hypotheses.map(([k, h, how]) => `<div><dt>${k}</dt><dd>${esc(h)}<span class="small dim">How to probe it: ${esc(how)}</span></dd></div>`).join('')}</dl>
      </div>
      <div>
        <h3>The model, in full</h3>
        <div class="formula">
          <p><var>c</var><sub>eff</sub> = <var>c</var> × (1 − <var>u</var>)</p>
          <p><var>I</var> = (<var>S</var> × <var>H</var>) / 25</p>
          <p><var>R</var> = <var>I</var> × (1 − <var>c</var><sub>eff</sub>)</p>
        </div>
        <p class="small">A person is required if the mode is advisory, or if any enabled rule fires: <var>u</var> above the out-of-distribution limit, harm ≥ 4, <var>c</var><sub>eff</sub> below the floor, or <var>R</var> above τ. If expected review time exceeds the scenario's time window, the fallback applies. Full documentation is in <code>docs/MODELS.md</code> in the repository.</p>
      </div>
    </div>
    <h3>Questions the sandbox is built to examine</h3>
    <div class="themes">${RESEARCH.themes.map(([t, b]) => details(esc(t), `<p>${esc(b)}</p>`)).join('')}</div>
    <h3>Limitations</h3>
    <ul class="limits">${RESEARCH.limitations.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    <div class="control-actions"><button class="btn" data-action="download-summary">Download research summary</button></div>
  </section>`;

  const sitControls = $('#sit-controls', root);
  function renderSituationControls() {
    sitControls.innerHTML = [
      slider({ key: 'confidence', label: 'Model confidence', min: 0, max: 1, step: 0.01, value: situation.confidence }),
      slider({ key: 'uncertainty', label: 'Uncertainty (out-of-distribution score)', min: 0, max: 1, step: 0.01, value: situation.uncertainty }),
      slider({ key: 'severity', label: 'Risk severity', min: 1, max: 5, step: 1, value: situation.severity, unit: ' / 5' }),
      slider({ key: 'harm', label: 'Potential harm and irreversibility', min: 1, max: 5, step: 1, value: situation.harm, unit: ' / 5' }),
      slider({ key: 'timeWindow', label: 'Time before harm occurs', min: 5, max: 1800, step: 5, value: situation.timeWindow, unit: ' s' }),
    ].join('');
  }

  // ---- Rendering ---------------------------------------------------------
  function renderScenario() {
    $$('.scenario-tab', root).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.scenario === scenario.id)));
    $('#scenario-panel', root).setAttribute('aria-labelledby', `tab-${scenario.id}`);
    $('#scenario-panel', root).innerHTML = `<p>${esc(scenario.context)}</p><p class="small"><span class="dim">Proposed action:</span> <strong>${esc(scenario.action)}</strong></p>`;
  }

  function renderDecision() {
    const r = evaluate(situation, policy);
    $('#decision', root).innerHTML = `
      <div class="outcome" style="--oc:${OUTCOME_COLOR[r.outcome]}">
        <span class="outcome-dot" aria-hidden="true"></span>
        <div><p class="outcome-label">${esc(OUTCOME_LABEL[r.outcome])}</p><p class="outcome-explain">${esc(r.explanation)}</p></div>
      </div>
      <dl class="indices">
        ${meter('Effective confidence', r.cEff, 'c × (1 − u)')}
        ${meter('Impact', r.impact, '(S × H) / 25')}
        ${meter('Risk index', r.risk, 'I × (1 − c_eff)', policy.riskThreshold)}
      </dl>
      <div class="rules"><h3 class="panel-h">Rules that fired</h3>${r.fired.length ? `<ul>${r.fired.map((f) => `<li>${esc(f.text)}</li>`).join('')}</ul>` : '<p class="small dim">None. Nothing in the current policy requires a person for this situation.</p>'}</div>`;
    renderPathway(r);
    renderMatrix(r);
    return r;
  }

  function meter(label, v, formula, mark) {
    return `<div class="meter"><dt>${esc(label)} <span class="small dim">${esc(formula)}</span></dt><dd><span class="meter-track"><span class="meter-fill" style="width:${(v * 100).toFixed(1)}%"></span>${mark != null ? `<span class="meter-mark" style="left:${Math.min(100, mark * 100)}%" title="Threshold τ"></span>` : ''}</span><span class="meter-val">${v.toFixed(2)}</span></dd></div>`;
  }

  function renderPathway(r, target = $('#pathway', root)) {
    const on = new Set(r.path);
    const N = [
      { id: 'input', x: 20, y: 70, label: 'Model proposes action' },
      { id: 'score', x: 190, y: 70, label: 'Score confidence & risk' },
      { id: 'gate', x: 360, y: 70, label: 'Escalation gate' },
      { id: 'auto', x: 540, y: 10, label: 'Act automatically' },
      { id: 'veto', x: 540, y: 58, label: 'Act after veto window' },
      { id: 'human', x: 540, y: 106, label: 'Route to human review' },
      { id: 'review', x: 540, y: 154, label: 'Approved in time' },
      { id: 'fallback', x: 540, y: 202, label: 'Too slow: fallback' },
    ];
    const box = (n) => `<g class="pw-node${on.has(n.id) ? ' on' : ''}"><rect x="${n.x}" y="${n.y}" width="150" height="38" rx="5"/><text x="${n.x + 75}" y="${n.y + 23}" text-anchor="middle">${esc(n.label)}</text></g>`;
    const link = (a, b, active) => {
      const A = N.find((n) => n.id === a), B = N.find((n) => n.id === b);
      const x1 = A.x + 150, y1 = A.y + 19, x2 = B.x, y2 = B.y + 19;
      const d = A.id === 'human' ? `M${A.x + 75},${A.y + 38} L${B.x + 75},${B.y}` : `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`;
      return `<path class="pw-link${active ? ' on' : ''}" d="${d}"/>`;
    };
    const p = r.path;
    target.innerHTML = `<svg viewBox="0 0 700 250" class="pathway" role="img" aria-label="Decision pathway. Active path: ${esc(p.join(' to '))}">
      ${link('input', 'score', true)}${link('score', 'gate', true)}
      ${link('gate', 'auto', on.has('auto'))}${link('gate', 'veto', on.has('veto'))}${link('gate', 'human', on.has('human'))}
      ${N.slice(0, 7).map(box).join('')}${box(N[7])}
      <path class="pw-link${on.has('fallback') ? ' on warn' : ''}" d="M${N[5].x + 150},${N[5].y + 19} C${N[5].x + 175},${N[5].y + 19} ${N[5].x + 175},${N[7].y + 19} ${N[7].x + 150},${N[7].y + 19}"/>
      ${link('human', 'review', on.has('review'))}
    </svg>`;
  }

  function renderMatrix(r) {
    const W = 520, H = 300, m = { l: 48, r: 12, t: 12, b: 38 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const X = (p) => m.l + p * iw, Y = (i) => m.t + ih - i * ih;
    const tau = policy.riskThreshold;
    // Threshold curve: impact × pErr = τ → impact = τ / pErr
    let curve = '';
    for (let k = 0; k <= 60; k++) {
      const pe = Math.max(tau, 0.001) + (1 - Math.max(tau, 0.001)) * (k / 60);
      const imp = Math.min(1, tau / pe);
      curve += `${k ? 'L' : 'M'}${X(pe).toFixed(1)},${Y(imp).toFixed(1)}`;
    }
    const cells = [];
    const steps = 10;
    for (let i = 0; i < steps; i++) for (let j = 0; j < steps; j++) {
      const pe = (i + 0.5) / steps, imp = (j + 0.5) / steps;
      const risk = pe * imp;
      cells.push(`<rect x="${X(i / steps)}" y="${Y((j + 1) / steps)}" width="${iw / steps}" height="${ih / steps}" fill="${risk > tau ? 'rgba(182,92,58,' + (0.05 + risk * 0.3).toFixed(2) + ')' : 'rgba(233,229,219,0.5)'}"/>`);
    }
    const dots = SCENARIOS.map((s) => {
      const isCur = s.id === scenario.id;
      const ix = isCur ? computeIndices(situation) : computeIndices(s);
      return `<g class="mx-dot${isCur ? ' cur' : ''}"><circle cx="${X(1 - ix.cEff)}" cy="${Y(ix.impact)}" r="${isCur ? 8 : 5}" fill="${isCur ? OUTCOME_COLOR[r.outcome] : 'var(--muted)'}"/><text x="${X(1 - ix.cEff) + MX_LABEL[s.id][0] * (isCur ? 1.3 : 1)}" y="${Y(ix.impact) + MX_LABEL[s.id][1] * (isCur ? 1.3 : 1)}" text-anchor="${MX_LABEL[s.id][2]}">${esc(s.short)}</text></g>`;
    }).join('');
    $('#matrix', root).innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="matrix" role="img" aria-label="Risk matrix: probability of error against impact, with the oversight threshold curve.">
      ${cells.join('')}
      <path d="${curve}" class="mx-curve"/>
      ${[0, 0.25, 0.5, 0.75, 1].map((t) => `<text x="${X(t)}" y="${H - m.b + 16}" text-anchor="middle" class="chart-tick">${t}</text><text x="${m.l - 8}" y="${Y(t) + 4}" text-anchor="end" class="chart-tick">${t}</text>`).join('')}
      <text x="${m.l + iw / 2}" y="${H - 4}" text-anchor="middle" class="chart-axis-label">Probability of error (1 − effective confidence)</text>
      <text x="12" y="${m.t + ih / 2}" transform="rotate(-90 12 ${m.t + ih / 2})" text-anchor="middle" class="chart-axis-label">Impact</text>
      ${dots}
    </svg>`;
  }

  function renderFailure() {
    $$('[data-failure]', root).forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.failure || null) === failure)));
    const out = $('#failure-out', root);
    if (!failure) { out.innerHTML = '<p class="small dim">No failure injected. Choose a failure mode above.</p>'; return; }
    const f = FAILURES.find((x) => x.id === failure);
    const nominal = evaluate(situation, policy);
    const res = f.apply(situation, policy);
    const failed = evaluate(res.s, res.p);
    const caught = failed.outcome !== 'auto' && failed.outcome !== 'auto-veto';
    let verdict, recovery;
    if (f.id === 'overconfident') {
      verdict = caught
        ? 'The policy still routes this to a person: rules other than confidence (harm, threshold) caught it.'
        : `The inflated confidence lets the action through automatically. The real error probability is about ${fmt.pct(1 - res.trueConfidence)} — the policy never sees it.`;
      recovery = 'Recovery: monitor calibration in production (compare stated confidence to observed outcomes), and gate on uncertainty and irreversibility, which do not depend on the confidence number.';
    } else if (f.id === 'sensor') {
      verdict = caught
        ? `The uncertainty jump is caught: ${failed.fired.map((x) => x.rule).includes('ood') ? 'the out-of-distribution rule fires' : 'other rules escalate it'}, and a person reviews before anything happens.`
        : 'With the out-of-distribution rule disabled, a faulty input passes straight through to an automated action.';
      recovery = 'Recovery: quarantine the sensor, fall back to redundant measurements, and keep the system in advisory mode until inputs return to the familiar range.';
    } else {
      verdict = failed.outcome === 'fallback'
        ? `Review now takes about ${Math.round(failed.reviewTime)} s, longer than the ${res.s.timeWindow} s window. The policy uses its fallback: ${FALLBACKS[policy.fallback].toLowerCase()}.`
        : failed.outcome === 'auto' || failed.outcome === 'auto-veto'
          ? 'This action does not need a person under the current policy, so the operator delay has no effect.'
          : 'Review is slower, but still fits inside the time window.';
      recovery = 'Recovery: escalate to a backup approver, and make sure the fallback is a state that is safe to hold, not just “do nothing”.';
    }
    out.innerHTML = `<p>${esc(f.desc)}</p>
      <div class="ba">
        <div><p class="small dim">Before</p><p class="ba-val" style="color:${OUTCOME_COLOR[nominal.outcome]}">${esc(OUTCOME_LABEL[nominal.outcome])}</p></div>
        <div><p class="small dim">After failure</p><p class="ba-val" style="color:${OUTCOME_COLOR[failed.outcome]}">${esc(OUTCOME_LABEL[failed.outcome])}</p></div>
      </div>
      <p>${esc(verdict)}</p><p class="small dim">${esc(recovery)}</p>`;
  }

  function snapshot() {
    const r = evaluate(situation, policy);
    return { scenario: scenario.title, situation: { ...situation }, policy: { ...policy }, result: { outcome: OUTCOME_LABEL[r.outcome], risk: +r.risk.toFixed(3), effectiveConfidence: +r.cEff.toFixed(3), rules: r.fired.map((f) => f.rule) } };
  }

  function renderCompare() {
    const el = $('#compare', root);
    if (!saved.A && !saved.B) { el.innerHTML = '<p class="state-empty small">Nothing saved yet. Save the current configuration as A, change it, then save as B.</p>'; return; }
    const rows = [
      ['Scenario', (s) => s.scenario],
      ['Decision authority', (s) => AUTHORITY_MODES[s.policy.mode].label],
      ['Confidence / uncertainty', (s) => `${s.situation.confidence.toFixed(2)} / ${s.situation.uncertainty.toFixed(2)}`],
      ['Severity / harm', (s) => `${s.situation.severity} / ${s.situation.harm}`],
      ['Threshold τ', (s) => s.policy.riskThreshold.toFixed(2)],
      ['Review time', (s) => `${s.policy.humanLatency} s (window ${s.situation.timeWindow} s)`],
      ['Risk index', (s) => s.result.risk.toFixed(3)],
      ['Outcome', (s) => s.result.outcome],
      ['Rules fired', (s) => s.result.rules.join(', ') || 'none'],
    ];
    el.innerHTML = `<div class="table-wrap"><table class="data-table"><thead><tr><th scope="col">Field</th><th scope="col">A</th><th scope="col">B</th></tr></thead><tbody>
      ${rows.map(([label, f]) => {
        const a = saved.A ? f(saved.A) : '—', b = saved.B ? f(saved.B) : '—';
        return `<tr class="${saved.A && saved.B && a !== b ? 'diff' : ''}"><th scope="row">${esc(label)}</th><td>${esc(a)}</td><td>${esc(b)}</td></tr>`;
      }).join('')}</tbody></table></div><p class="small dim">Highlighted rows differ between A and B.</p>`;
  }

  function renderHeatmap() {
    const steps = 20;
    const cells = sensitivityGrid(situation, policy, steps);
    const S = 300, m = 40, cs = (S - m) / steps;
    const rects = cells.map((c) => {
      const i = Math.floor(c.confidence * steps), j = Math.floor(c.uncertainty * steps);
      return `<rect x="${m + i * cs}" y="${(steps - 1 - j) * cs}" width="${cs + 0.3}" height="${cs + 0.3}" fill="${OUTCOME_COLOR[c.outcome]}" fill-opacity="0.9"><title>c=${c.confidence.toFixed(2)}, u=${c.uncertainty.toFixed(2)}: ${OUTCOME_LABEL[c.outcome]}</title></rect>`;
    }).join('');
    const cx = m + situation.confidence * (S - m), cy = (1 - situation.uncertainty) * (S - m);
    const present = [...new Set(cells.map((c) => c.outcome))];
    const uniform = present.length === 1
      ? `<p class="small notice">Every cell has the same outcome. ${policy.mode === 'advisory' ? 'Advisory mode always routes to a person.' : policy.mode === 'autonomous' ? 'Full autonomy ignores confidence and uncertainty.' : 'A rule that does not depend on confidence or uncertainty (such as the irreversibility rule or the review time window) decides this situation.'}</p>` : '';
    $('#heatmap', root).innerHTML = uniform + `
      <ul class="chart-legend">${present.map((o) => `<li><span class="swatch" style="background:${OUTCOME_COLOR[o]}"></span>${esc(OUTCOME_LABEL[o])}</li>`).join('')}</ul>
      <svg viewBox="0 0 ${S} ${S}" class="heat" role="img" aria-label="Outcome by confidence and uncertainty">
        ${rects}
        <circle cx="${cx}" cy="${cy}" r="7" fill="none" stroke="var(--ivory)" stroke-width="2"/>
        <text x="${m + (S - m) / 2}" y="${S - 4}" text-anchor="middle" class="chart-axis-label">Confidence →</text>
        <text x="12" y="${(S - m) / 2}" transform="rotate(-90 12 ${(S - m) / 2})" text-anchor="middle" class="chart-axis-label">Uncertainty →</text>
      </svg>`;
  }

  let sweepTimer = 0;
  function renderSweep() {
    clearTimeout(sweepTimer);
    sweepTimer = setTimeout(() => {
      const sweep = thresholdSweep({ policy, overconfidence });
      const cur = Math.round(Math.min(0.4, policy.riskThreshold) / 0.01);
      const maxHarm = Math.max(...sweep.map((s) => s.residualHarm));
      lineChart($('#sweep', root), {
        height: 250, ariaLabel: 'Automation rate and residual harm against oversight threshold',
        x: { values: sweep.map((s) => s.tau), format: (v) => v.toFixed(2), label: 'Oversight threshold τ' },
        y: { min: 0, max: 1, format: (v) => `${Math.round(v * 100)}%` },
        series: [
          { name: 'Automation rate', values: sweep.map((s) => s.automationRate), color: 'var(--ink)' },
          { name: 'Residual harm (scaled to its maximum)', values: sweep.map((s) => s.residualHarm / (maxHarm || 1)), color: 'var(--orange)', dash: '5 4' },
        ],
        vLine: policy.riskThreshold <= 0.4 ? cur : undefined,
        tooltip: (i) => `<strong>τ = ${sweep[i].tau.toFixed(2)}</strong><br>Automated: ${fmt.pct(sweep[i].automationRate)}<br>Residual harm: ${sweep[i].residualHarm.toFixed(4)} per decision`,
      });
    }, 60);
  }

  function renderAudit() {
    const el = $('#audit', root);
    if (!log.length) { el.innerHTML = '<p class="state-empty small">The log is empty. Use “Log this decision” to record the current decision with its inputs and the rules that fired.</p>'; return; }
    el.innerHTML = `<div class="table-wrap"><table class="data-table"><thead><tr><th scope="col">#</th><th scope="col">Time</th><th scope="col">Scenario</th><th scope="col">c / u</th><th scope="col">S / H</th><th scope="col">Mode</th><th scope="col">Risk</th><th scope="col">Outcome</th><th scope="col">Rules fired</th></tr></thead><tbody>
      ${log.slice().reverse().map((e) => `<tr><td>${e.n}</td><td>${esc(e.time)}</td><td>${esc(e.scenario)}</td><td>${e.c.toFixed(2)} / ${e.u.toFixed(2)}</td><td>${e.S} / ${e.H}</td><td>${esc(e.mode)}</td><td>${e.risk.toFixed(3)}</td><td><span class="dot" style="background:${OUTCOME_COLOR[e.outcomeKey]}"></span>${esc(e.outcome)}</td><td>${esc(e.rules || '—')}</td></tr>`).join('')}
    </tbody></table></div>`;
  }

  function updateAll({ sweep = true } = {}) {
    syncOutputs(root, { humanLatency: (v) => `${v} s`, timeWindow: (v) => `${v} s`, overconfidence: (v) => v.toFixed(2) });
    renderDecision();
    if (typeof renderExplainer === 'function') renderExplainer();
    renderFailure();
    renderHeatmap();
    if (sweep) renderSweep();
  }

  // ---- Events --------------------------------------------------------------
  root.addEventListener('input', (e) => {
    const el = e.target;
    if (el.name === 'mode') { policy.mode = el.value; updateAll(); return; }
    const key = el.dataset.key;
    if (!key) return;
    const v = readControl(el);
    if (key === 'overconfidence') { overconfidence = v; syncOutputs(root, { overconfidence: (x) => x.toFixed(2) }); renderSweep(); return; }
    if (SITUATION_KEYS.includes(key)) { situation[key] = v; updateAll({ sweep: false }); }
    else { policy[key] = v; updateAll(); }
  });

  root.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-scenario]');
    if (tab) {
      scenario = SCENARIOS.find((s) => s.id === tab.dataset.scenario);
      situation = pick(scenario);
      renderScenario(); renderSituationControls(); updateAll({ sweep: false });
      announce(`Scenario: ${scenario.title}`);
      return;
    }
    const fb = e.target.closest('[data-failure]');
    if (fb) { failure = fb.dataset.failure || null; renderFailure(); return; }
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const act = a.dataset.action;
    if (act === 'log') {
      const r = evaluate(situation, policy);
      log.push({ n: log.length + 1, time: new Date().toLocaleTimeString(), scenario: scenario.title, c: situation.confidence, u: situation.uncertainty, S: situation.severity, H: situation.harm, mode: AUTHORITY_MODES[policy.mode].label, risk: r.risk, outcome: OUTCOME_LABEL[r.outcome], outcomeKey: r.outcome, rules: r.fired.map((f) => f.rule).join(', ') });
      renderAudit(); announce(`Logged decision ${log.length}: ${OUTCOME_LABEL[r.outcome]}`);
    }
    if (act === 'reset') {
      situation = pick(scenario); policy = { ...DEFAULT_POLICY };
      root.querySelector(`input[name=mode][value=${policy.mode}]`).checked = true;
      $$('#controls [data-key]', root).forEach((el) => {
        const k = el.dataset.key;
        const v = k in situation ? situation[k] : policy[k];
        if (v === undefined) return;
        if (el.type === 'checkbox') el.checked = v; else el.value = v;
      });
      updateAll(); announce('Reset to scenario defaults');
    }
    if (act === 'save-A' || act === 'save-B') { saved[act.slice(-1)] = snapshot(); renderCompare(); announce(`Saved as ${act.slice(-1)}`); }
    if (act === 'export') download(`oversight-config-${scenario.id}.json`, JSON.stringify({ model: 'safety-model.js', ...snapshot(), saved }, null, 2), 'application/json');
    if (act === 'clear-log') { log.length = 0; renderAudit(); announce('Log cleared'); }
    if (act === 'download-log') {
      if (!log.length) { announce('The log is empty: nothing to download'); return; }
      const head = 'n,time,scenario,confidence,uncertainty,severity,harm,mode,risk,outcome,rules';
      const rows = log.map((e) => [e.n, e.time, e.scenario, e.c, e.u, e.S, e.H, e.mode, e.risk.toFixed(4), e.outcome, e.rules].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
      download('oversight-audit-log.csv', [head, ...rows].join('\n'), 'text/csv');
    }
    if (act === 'download-summary') download('human-oversight-research-summary.md', summaryMarkdown(), 'text/markdown');
  });

  // Scroll-linked explanation: highlight the pathway stage each step describes
  let exStage = 'input';
  const exSteps = $$('.explainer-steps li', root);
  function renderExplainer() {
    const r = evaluate(situation, policy);
    const stages = { input: ['input'], score: ['input', 'score'], gate: ['input', 'score', 'gate'], review: r.path };
    renderPathway({ ...r, path: stages[exStage] }, $('#ex-fig', root));
    exSteps.forEach((li) => li.classList.toggle('is-active', li.dataset.ex === exStage));
  }
  const io = new IntersectionObserver((entries) => {
    const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (vis && vis.target.dataset.ex !== exStage) { exStage = vis.target.dataset.ex; renderExplainer(); }
  }, { rootMargin: '-35% 0px -45% 0px' });
  exSteps.forEach((li) => io.observe(li));

  renderScenario(); renderSituationControls(); renderCompare(); renderAudit(); updateAll(); renderExplainer();
  return () => { clearTimeout(sweepTimer); io.disconnect(); };
}

function pick(s) { return Object.fromEntries(SITUATION_KEYS.map((k) => [k, s[k]])); }

function summaryMarkdown() {
  return [
    '# Human oversight in critical infrastructure — research summary',
    '', 'Sumana Panuganti · independent research prototype',
    '', '## Research question', 'When should an AI system be allowed to act autonomously in critical infrastructure, and when should human oversight be mandatory?',
    '', '## Model', '- c_eff = c × (1 − u)', '- I = (S × H) / 25', '- R = I × (1 − c_eff)',
    '- A person is required in advisory mode, or when any enabled rule fires (OOD, irreversibility, confidence floor, R > τ). If review time exceeds the time window, a fallback applies.',
    '', '## Hypotheses', ...RESEARCH.hypotheses.map(([k, h]) => `- **${k}.** ${h}`),
    '', '## Themes', ...RESEARCH.themes.map(([t, b]) => `### ${t}\n${b}\n`),
    '## Limitations', ...RESEARCH.limitations.map((l) => `- ${l}`),
    '', `Interactive version: ${location.href}`,
  ].join('\n');
}
