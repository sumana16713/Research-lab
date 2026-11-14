# Model documentation

Each lab runs on a small, transparent model in `assets/js/models/`. The models are pure functions with no DOM access, covered by `tests/models.test.mjs`. All randomness is seeded, so results are reproducible.

These are teaching and research-reasoning models. **None of them is validated for operational use, and none reproduces code or data from past projects.**

---

## 1. Human oversight gating — `safety-model.js`

**Question.** When should an AI system act on its own in critical infrastructure, and when should a person decide?

### Inputs

| Symbol | Meaning | Range |
|---|---|---|
| *c* | Model-reported confidence that the proposed action is correct | 0–1 |
| *u* | Epistemic uncertainty / out-of-distribution score | 0–1 |
| *S* | Severity of consequences if the action is wrong | 1–5 |
| *H* | Potential harm and irreversibility | 1–5 |
| *T* | Time before harm occurs (seconds) | 5–1800 |

### Derived indices

```
c_eff = c · (1 − u)          effective confidence, discounted by uncertainty
I     = (S · H) / 25         normalised impact
R     = I · (1 − c_eff)      error-weighted risk index
```

### Policy

| Parameter | Default | Meaning |
|---|---|---|
| Decision authority | Human approval above threshold | Advisory / approval / act-with-veto / full autonomy |
| τ | 0.12 | Risk index above which a person must approve |
| Confidence floor | 0.60 | Escalate if *c_eff* is below this |
| OOD limit *u\** | 0.40 | Escalate if *u* is above this (rule can be disabled) |
| Irreversibility rule | on | Escalate whenever *H* ≥ 4 |
| Two-person rule | on | Severity 5 needs two approvers (review takes 1.5× longer) |
| Review time | 90 s | Expected time for a person to review |
| Fallback | Safe hold | What happens if review cannot finish within *T* |

### Decision logic

1. **Advisory** mode always routes to a person. **Full autonomy** always acts, ignoring every rule.
2. Otherwise, the enabled rules are checked: OOD, irreversibility, confidence floor, and *R* > τ. If any rule fires, a person is required.
3. If a person is required and the expected review time exceeds *T*, the policy falls back.
4. Every evaluation returns the outcome, the path through the gate, every rule that fired, and a plain-language explanation. The audit log records these.

### Sensitivity analysis

`sensitivityGrid` evaluates the policy over a 20 × 20 grid of (*c*, *u*), holding the scenario and policy fixed.

### Threshold study (Monte Carlo)

`thresholdSweep` draws 2,000 synthetic decisions (seed 7):

- *c* = 0.45 + 0.55·√U, *u* = 0.9·U₁U₂, *S* and *H* uniform on 1–5
- True accuracy = *c* · (1 − 0.5*u*) − *overconfidence*, so the model is miscalibrated by the chosen amount and worse on unfamiliar inputs
- Reviewed decisions catch an error with probability 0.85

For each τ in 0–0.40 it reports the **automation rate** (share decided without a person) and **residual harm** (mean impact *I* of wrong actions that were automated, or reviewed but missed).

### Hypotheses the sandbox lets you probe

- **H1.** Confidence thresholds alone under-escalate when a model is overconfident; an independent uncertainty gate reduces residual harm at a modest automation cost.
- **H2.** For fast-acting hazards, review time, not model accuracy, decides the outcome; a pre-approved safe fallback matters more than the approval rule.
- **H3.** Irreversibility should gate autonomy regardless of confidence.
- **H4.** Recording which rule fired makes after-the-fact accountability practical.

### Limitations

- Scenarios are hypothetical; numbers are illustrative.
- *R* is a heuristic, not a validated risk measure; ordinal 1–5 scales are treated as numbers.
- Reviewers are a fixed delay with a fixed catch rate. Real review quality varies with workload, context and fatigue.
- No adversarial manipulation of confidence or uncertainty signals is modelled.

---

## 2. Vegetation index and crop stress — `ndvi-model.js`

**All data is synthetic.**

### Index

```
NDVI = (NIR − Red) / (NIR + Red)
```

The synthetic scene sets NIR = 0.22 + 0.32·NDVI and derives Red so that the formula above holds exactly for every pixel.

### Phenology

Field-mean NDVI on day *t* of a 150-day season:

```
NDVI(t) = soil + (max − soil) · green(t) · senesce(t) · vigour(t)
green(t)   = logistic(k · (t − t_half))
senesce(t) = logistic(−0.12 · (t − t_sen))
```

with soil = 0.16 and crop parameters:

| Crop | max | t_half | t_sen | k |
|---|---|---|---|---|
| Peanut | 0.82 | 45 | 128 | 0.11 |
| Cotton | 0.80 | 55 | 135 | 0.09 |
| Corn | 0.88 | 38 | 110 | 0.14 |
| Soybean | 0.85 | 48 | 125 | 0.12 |

These are illustrative shapes, not calibrated crop models.

### Stress

```
demand  = 1 + 0.05 · ΔT                         (~5 % more water demand per °C)
supply  = (1 + rain% / 100) · WHC + 0.6·irrigated
deficit = max(0, demand − supply)
heat    = 0.04 · (ΔT − 2)   if ΔT > 2, else 0
f       = clamp(1 − 0.75 · deficit − heat, 0.35, 1)
vigour(t) = 1 − (1 − f) · clamp((t − 25) / 55, 0, 1)
```

WHC is a per-field water-holding factor (0.7–1.15).

### Scene, masking and statistics

- Pixel NDVI adds smooth value noise (±0.045) and a faint crop-row pattern to the field mean.
- Clouds come from two octaves of value noise that drift with the date; pixels above the cover threshold are masked.
- Zonal statistics (mean, SD, clear fraction) use clear pixels only. **If under 20 % of a field is clear, no estimate is given.**
- Baseline = the same model with no rainfall or temperature anomaly. Anomaly = mean − baseline.
- Alerts: anomaly ≤ −0.05 is moderate, ≤ −0.10 is high. These thresholds are illustrative and not yield-calibrated.

### Limitations

No atmospheric correction, BRDF, soil-background or NDVI-saturation effects. No real imagery. The stress model is a simplification for teaching.

---

## 3. Solar, storage and grid dispatch — `energy-model.js`

**An independent demonstration, not an operational grid model.** Units: MW for power, MWh for energy, one-hour steps.

### Profiles

```
solar(h)  = capacity · sin(π · (h + 0.5 − 6) / 13) · (1 − cloud%)     for 06:00–19:00, else 0
demand(h) = peak · shape(h) / max(shape) · (1 + σ · N(0,1))
shape(h)  = 0.55 + 0.25·e^(−(t−8)²/4) + 0.45·e^(−(t−19)²/6) + 0.12·e^(−(t−14)²/10)
```

N(0,1) is drawn from a seeded generator. "Draw new fluctuations" changes the seed.

### Dispatch (greedy, each hour)

1. Solar serves demand.
2. Surplus charges the battery: min(surplus, power rating, headroom / η). Remaining surplus is curtailed.
3. Shortfall is met by discharge: min(shortfall, power rating, (E − E_min) · η).
4. Remaining shortfall is imported: min(shortfall, grid limit), or zero during an outage.
5. Anything left is unserved energy.

η = √(round-trip efficiency), applied once on charge and once on discharge. E_min = 10 % of capacity.

### Outputs

Demand served, unserved MWh, hours with a shortfall, share met without the grid, curtailment, peak import, equivalent full cycles (discharge ÷ capacity), and end-of-day state of charge. The unit tests check that the energy balance closes every hour and that power limits are never exceeded.

### Limitations

No network physics (voltage, frequency, congestion), ramp rates, inverter limits, degradation, prices or forecasting. A single representative day cannot size storage for multi-day low-sun periods.

---

## 4. AgriOne funding access — `agrione-model.js`

**Every program and persona is fictional. No interview findings are included.**

### Barrier framework

Six dimensions explored in roughly 30 farmer discovery interviews: awareness, eligibility complexity, documentation readiness, time and capacity, digital access, and cash-flow timing. In the demo, each answer maps to an illustrative score (≈0.1 low, ≈0.5 moderate, ≈0.9 high). This is a framework demonstration, not a validated instrument.

### Eligibility screening

Each fictional program has: eligible farm types, maximum acreage, minimum years farming, an optional beginning-farmer limit (≤ 10 years), funded needs, required documents and whether it pays by reimbursement.

- **Not eligible** if any hard rule fails (type, size, years, beginning-farmer limit, need).
- **Eligible with conditions** if all hard rules pass but documents are missing, or the program is reimbursement-based and the cash-flow barrier is ≥ 0.5.
- **Likely eligible** otherwise.

Results are ranked by a fit score that penalises missing documents and, for reimbursement programs, cash-flow barriers. Every result lists the rule behind it.

### Impact measurement framework

Metric definitions only (reach, discovery, readiness, effort, outcome, equity). No values are reported because none have been collected.
