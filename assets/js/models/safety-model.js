/**
 * Human-oversight gating model for automated decisions in energy infrastructure.
 *
 * This is a transparent, rule-based research prototype. It is NOT a validated
 * safety system. Its purpose is to make the trade-offs between autonomy,
 * oversight, and response time explicit and inspectable.
 *
 * Notation (all documented in docs/MODELS.md):
 *   c  model-reported confidence that the proposed action is correct   [0,1]
 *   u  epistemic uncertainty / out-of-distribution score               [0,1]
 *   S  severity of consequences if the action is wrong                 1..5
 *   H  potential harm / irreversibility                                1..5
 *   c_eff = c · (1 − u)          confidence discounted by uncertainty
 *   I     = (S · H) / 25         normalised impact                       [0,1]
 *   R     = I · (1 − c_eff)      error-weighted risk index               [0,1]
 */
import { mulberry32, clamp } from '../lib/rng.js';

export const AUTHORITY_MODES = {
  advisory: { label: 'Advisory only', desc: 'The system recommends; a person always decides.' },
  approval: { label: 'Human approval above threshold', desc: 'The system acts alone below the risk threshold and needs sign-off above it.' },
  veto: { label: 'Act with veto window', desc: 'Low-risk actions run after a veto window; high-risk actions still need sign-off.' },
  autonomous: { label: 'Full autonomy', desc: 'The system acts on its own. Escalation rules are ignored.' },
};

export const SCENARIOS = [
  {
    id: 'thermal',
    title: 'Battery rack thermal anomaly',
    context: 'A battery storage site reports a rack temperature rising faster than its neighbours. The model proposes isolating the rack and starting cooling.',
    action: 'Isolate rack 14 and start active cooling',
    short: 'Thermal', confidence: 0.86, uncertainty: 0.18, severity: 4, harm: 3, timeWindow: 120,
  },
  {
    id: 'frequency',
    title: 'Grid frequency excursion',
    context: 'Grid frequency drops to 59.6 Hz after a generator trips. The model proposes shedding 40 MW of interruptible industrial load.',
    action: 'Shed 40 MW of interruptible load',
    short: 'Frequency', confidence: 0.78, uncertainty: 0.22, severity: 4, harm: 3, timeWindow: 8,
  },
  {
    id: 'forecast',
    title: 'Solar forecast error',
    context: 'Afternoon cloud cover arrives earlier than forecast. The model proposes discharging the battery to cover a 15 MW shortfall.',
    action: 'Discharge storage at 15 MW for 90 min',
    short: 'Forecast', confidence: 0.91, uncertainty: 0.08, severity: 2, harm: 1, timeWindow: 600,
  },
  {
    id: 'cyber',
    title: 'Substation telemetry anomaly',
    context: 'Control traffic at a substation does not match its usual pattern. The model proposes disconnecting a feeder that serves 9,000 customers and a hospital.',
    action: 'Open breaker on feeder 7B',
    short: 'Telemetry', confidence: 0.64, uncertainty: 0.55, severity: 5, harm: 5, timeWindow: 300,
  },
  {
    id: 'restoration',
    title: 'Storm restoration sequencing',
    context: 'After a storm, the model proposes the order in which to re-energise twelve feeders, weighing critical loads against cold-load pickup.',
    action: 'Apply proposed 12-step restoration order',
    short: 'Restoration', confidence: 0.72, uncertainty: 0.35, severity: 3, harm: 4, timeWindow: 1800,
  },
];

export const DEFAULT_POLICY = {
  mode: 'approval',
  riskThreshold: 0.12,      // τ: risk index above which human sign-off is required
  confidenceFloor: 0.6,     // escalate whenever c_eff falls below this
  uncertaintyLimit: 0.4,    // u*: out-of-distribution limit
  escalateOnOOD: true,
  escalateIrreversible: true, // H ≥ 4 always needs a person
  twoPersonRule: true,        // S = 5 needs two approvers
  humanLatency: 90,           // seconds for a person to review
  fallback: 'safe-hold',      // what happens if review can't finish in time
};

export const FALLBACKS = {
  'safe-hold': 'Hold in a pre-defined safe state',
  'act': 'Proceed with the automated action',
  'no-op': 'Take no action',
};

export function computeIndices({ confidence, uncertainty, severity, harm }) {
  const cEff = clamp(confidence * (1 - uncertainty), 0, 1);
  const impact = (severity * harm) / 25;
  const risk = impact * (1 - cEff);
  return { cEff, impact, risk };
}

/**
 * Evaluate one decision. Returns the outcome, the path through the gate,
 * every rule that fired, and a plain-language explanation.
 */
export function evaluate(situation, policy) {
  const p = { ...DEFAULT_POLICY, ...policy };
  const idx = computeIndices(situation);
  const fired = [];
  const path = ['input', 'score'];

  if (p.mode === 'advisory') {
    fired.push({ rule: 'mode', text: 'Advisory mode: the system can only recommend.' });
  } else if (p.mode !== 'autonomous') {
    if (p.escalateOnOOD && situation.uncertainty > p.uncertaintyLimit)
      fired.push({ rule: 'ood', text: `Uncertainty ${fmt(situation.uncertainty)} exceeds the out-of-distribution limit ${fmt(p.uncertaintyLimit)}.` });
    if (p.escalateIrreversible && situation.harm >= 4)
      fired.push({ rule: 'irreversible', text: `Harm level ${situation.harm}/5 is treated as hard to reverse.` });
    if (idx.cEff < p.confidenceFloor)
      fired.push({ rule: 'confidence', text: `Effective confidence ${fmt(idx.cEff)} is below the floor ${fmt(p.confidenceFloor)}.` });
    if (idx.risk > p.riskThreshold)
      fired.push({ rule: 'risk', text: `Risk index ${fmt(idx.risk)} exceeds the oversight threshold ${fmt(p.riskThreshold)}.` });
  }

  const needsHuman = p.mode === 'advisory' || (p.mode !== 'autonomous' && fired.length > 0);
  const approvers = needsHuman && p.twoPersonRule && situation.severity === 5 && p.mode !== 'advisory' ? 2 : needsHuman ? 1 : 0;
  const reviewTime = approvers === 2 ? p.humanLatency * 1.5 : p.humanLatency;
  let outcome, explanation;

  if (!needsHuman) {
    path.push('gate', p.mode === 'veto' ? 'veto' : 'auto');
    outcome = p.mode === 'veto' ? 'auto-veto' : 'auto';
    explanation = p.mode === 'autonomous'
      ? 'Full autonomy: the action runs immediately and no escalation rules are checked.'
      : p.mode === 'veto'
        ? 'No escalation rule fired. The action runs after a short veto window in which an operator can cancel it.'
        : 'No escalation rule fired. The action runs automatically and is logged for after-the-fact review.';
  } else {
    path.push('gate', 'human');
    const inTime = reviewTime <= situation.timeWindow;
    if (inTime) {
      path.push('review');
      outcome = approvers === 2 ? 'human-2' : 'human';
      explanation = `${approvers === 2 ? 'Two people must' : 'A person must'} approve before the action runs. Expected review time (${Math.round(reviewTime)} s) fits inside the ${situation.timeWindow} s window.`;
    } else {
      path.push('fallback');
      outcome = 'fallback';
      explanation = `Review would take about ${Math.round(reviewTime)} s, but harm may occur within ${situation.timeWindow} s. The policy falls back to: ${FALLBACKS[p.fallback].toLowerCase()}.`;
    }
  }
  return { ...idx, fired, path, outcome, approvers, reviewTime, explanation };
}

export const OUTCOME_LABEL = {
  auto: 'Automated',
  'auto-veto': 'Automated after veto window',
  human: 'Human approval',
  'human-2': 'Two-person approval',
  fallback: 'Fallback: review too slow',
};

/**
 * Sensitivity grid: outcome across confidence × uncertainty, holding everything else fixed.
 */
export function sensitivityGrid(situation, policy, steps = 24) {
  const cells = [];
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps; j++) {
      const confidence = (i + 0.5) / steps;
      const uncertainty = (j + 0.5) / steps;
      const r = evaluate({ ...situation, confidence, uncertainty }, policy);
      cells.push({ confidence, uncertainty, outcome: r.outcome });
    }
  }
  return cells;
}

/**
 * Monte Carlo evaluation of the oversight threshold τ.
 * Draws synthetic decisions, lets the model be miscalibrated by `overconfidence`
 * (true accuracy = stated confidence − overconfidence), and measures, for each τ:
 *   automationRate      share of decisions taken without a person
 *   residualHarm        mean impact of wrong actions that were not caught (automated, or missed in review)
 * Assumes reviewed decisions catch errors with probability `reviewCatch`.
 */
export function thresholdSweep({ policy, overconfidence = 0, samples = 2000, seed = 7, reviewCatch = 0.85 }) {
  const rand = mulberry32(seed);
  const cases = Array.from({ length: samples }, () => {
    const confidence = clamp(0.45 + 0.55 * Math.sqrt(rand()), 0, 0.999);
    const uncertainty = clamp(rand() * rand() * 0.9, 0, 1);
    const severity = 1 + Math.floor(rand() * 5);
    const harm = 1 + Math.floor(rand() * 5);
    const trueAcc = clamp(confidence * (1 - 0.5 * uncertainty) - overconfidence, 0, 1);
    const correct = rand() < trueAcc;
    const catchRoll = rand();
    return { confidence, uncertainty, severity, harm, correct, catchRoll };
  });
  const taus = Array.from({ length: 41 }, (_, k) => k * 0.01);
  return taus.map((tau) => {
    let auto = 0, harmSum = 0;
    for (const c of cases) {
      const r = evaluate({ ...c, timeWindow: 1e9 }, { ...policy, riskThreshold: tau, mode: policy.mode === 'advisory' ? 'advisory' : policy.mode });
      const automated = r.outcome === 'auto' || r.outcome === 'auto-veto';
      if (automated) auto++;
      const caught = !automated && c.catchRoll < reviewCatch;
      if (!c.correct && !caught) harmSum += (c.severity * c.harm) / 25;
    }
    return { tau, automationRate: auto / samples, residualHarm: harmSum / samples };
  });
}

function fmt(v) { return v.toFixed(2); }
