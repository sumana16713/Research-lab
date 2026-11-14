/**
 * Lab: AgriOne — farmer funding access research.
 * Every program, persona and score here is fictional or framework-level.
 * No interview statistics, awards or outcomes are shown or implied.
 */
import { BARRIER_DIMENSIONS, SUPPORTS, assessBarriers, NEEDS, FARM_TYPES, PROGRAMS, ALL_DOCS, screen, PERSONAS, IMPACT_METRICS } from '../models/agrione-model.js';
import { esc, $, $$, details, download, announce, fmt } from '../lib/dom.js';
import { barList } from '../lib/charts.js';

const STATUS = { eligible: 'Likely eligible', conditional: 'Eligible with conditions', ineligible: 'Not eligible' };

export function mount(root) {
  let answers = { ...PERSONAS[0].answers };
  let profile = structuredClone(PERSONAS[0].profile);
  let activePersona = PERSONAS[0].id;
  let show = 'all';

  root.innerHTML = `
  <header class="lab-head">
    <p class="lab-kicker"><span class="tag tag-synthetic">Fictional programs and personas</span> <span class="tag tag-demo">Research framework demo</span></p>
    <h1>AgriOne: farmer funding access</h1>
    <p class="lab-question">Which barriers keep farmers from funding they are eligible for, and which of them can software actually remove?</p>
    <p class="notice"><strong>Read this first.</strong> AgriOne is an AI-assisted funding navigation platform I am developing. This lab demonstrates its research framework and screening logic. Every program, persona and amount below is fictional. Nothing here is an interview finding, a real eligibility rule or a funding outcome.</p>
  </header>

  <section class="lab-block" aria-labelledby="st-h">
    <h2 id="st-h" class="block-h">Research status</h2>
    <dl class="kpis">
      <div class="kpi"><dt>Discovery interviews with farmers</dt><dd>≈30</dd></div>
      <div class="kpi"><dt>Barrier dimensions in the framework</dt><dd>${BARRIER_DIMENSIONS.length}</dd></div>
      <div class="kpi"><dt>Coded findings published</dt><dd>Not yet</dd></div>
    </dl>
    <div class="state-empty small" style="margin-top:1rem;border:1px dashed var(--line-strong);border-radius:8px">Coded interview findings are being synthesised and will appear here once they are ready. Until then, the barrier categories below are the research framework the interviews explore, not results.</div>
    <h3 class="sub-h" style="margin-top:2rem">Research framework</h3>
    <div class="table-wrap"><table class="data-table framework-table"><thead><tr><th scope="col">Barrier dimension</th><th scope="col">What the interviews explore</th><th scope="col">Design response being tested</th></tr></thead><tbody>
      ${BARRIER_DIMENSIONS.map((d) => `<tr><td>${esc(d.label)}</td><td>${esc(d.question)}</td><td>${esc(SUPPORTS[d.id])}</td></tr>`).join('')}
    </tbody></table></div>
    ${details('Methodology', '<p>Semi-structured discovery interviews with farmers about how they find, assess and apply for funding. Notes are coded against the six barrier dimensions, with room for themes that do not fit them. The product hypothesis is tested against the coded findings, not assumed.</p><p>The barrier assessment below is a demonstration of how the framework could be turned into a short self-assessment. It is not a validated instrument, and its scores are not measurements.</p>')}
  </section>

  <section class="lab-block" aria-labelledby="ba-h">
    <h2 id="ba-h" class="block-h">Funding barrier assessment</h2>
    <p class="dim">Start from a fictional persona or answer the questions yourself.</p>
    <div class="persona-row" role="group" aria-label="Fictional personas">${PERSONAS.map((p) => `<button class="chip" data-persona="${p.id}" aria-pressed="${p.id === activePersona}">${esc(p.label)}</button>`).join('')}</div>
    <div class="instrument">
      <form class="controls" id="barrier-form" aria-label="Barrier questions" onsubmit="return false">
        ${BARRIER_DIMENSIONS.map((d) => `<fieldset><legend>${esc(d.label)}</legend><p class="small dim" style="margin:-4px 0 8px">${esc(d.question)}</p>
          <div class="radio-stack">${d.options.map((o, i) => `<label class="radio"><input type="radio" name="b-${d.id}" value="${o.value}" data-dim="${d.id}"${answers[d.id] === o.value ? ' checked' : ''}><span><strong>${esc(o.label)}</strong></span></label>`).join('')}</div></fieldset>`).join('')}
      </form>
      <div class="readout">
        <div class="panel"><h3 class="panel-h">Barrier profile</h3><p class="small dim">0 = no barrier, 1 = severe barrier. Illustrative scoring.</p><div id="barrier-bars"></div></div>
        <div class="panel" id="barrier-summary" aria-live="polite"></div>
      </div>
    </div>
  </section>

  <section class="lab-block" aria-labelledby="el-h">
    <h2 id="el-h" class="block-h">Eligibility screening demonstration</h2>
    <p class="dim">Screens a farm profile against eight fictional programs. Every result shows the rule behind it.</p>
    <div class="instrument">
      <form class="controls" id="farm-form" aria-label="Farm profile" onsubmit="return false">
        <fieldset><legend>Farm profile</legend>
          <div class="ctl"><label for="f-type">Type of operation</label><select id="f-type" data-field="type">${Object.entries(FARM_TYPES).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></div>
          <div class="ctl"><label for="f-acres">Farm size (acres)</label><input class="number-input" id="f-acres" type="number" min="1" max="20000" data-field="acres"><p class="ctl-hint" id="acres-err" role="alert" hidden></p></div>
          <div class="ctl"><label for="f-years">Years farming</label><input class="number-input" id="f-years" type="number" min="0" max="80" data-field="years"></div>
          <div class="ctl"><label for="f-need">Main funding need</label><select id="f-need" data-field="need">${Object.entries(NEEDS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></div>
        </fieldset>
        <fieldset><legend>Documents already on file</legend><div class="doc-checks">${ALL_DOCS.map((d) => `<label class="check"><input type="checkbox" data-doc="${esc(d)}"> ${esc(d)}</label>`).join('')}</div></fieldset>
      </form>
      <div class="readout">
        <div class="panel">
          <div class="map-toolbar"><h3 class="panel-h" id="screen-count"></h3>
            <div class="seg" role="group" aria-label="Show"><button class="seg-btn" data-show="all" aria-pressed="true">All programs</button><button class="seg-btn" data-show="match" aria-pressed="false">Eligible only</button></div>
          </div>
          <div id="program-results" aria-live="polite"></div>
        </div>
        <div class="panel"><h3 class="panel-h">Decision support: what would change the result</h3><div id="next-steps"></div></div>
      </div>
    </div>
  </section>

  <section class="lab-block research" aria-labelledby="im-h">
    <h2 id="im-h" class="block-h">Impact measurement framework</h2>
    <p class="dim">How AgriOne's effect would be measured. These are metric definitions only. No values are reported because none have been collected.</p>
    <div class="table-wrap"><table class="data-table framework-table"><thead><tr><th scope="col">Stage</th><th scope="col">Metric</th><th scope="col">Why it matters</th></tr></thead><tbody>
      ${IMPACT_METRICS.map((m) => `<tr><td>${esc(m.stage)}</td><td>${esc(m.metric)}</td><td>${esc(m.why)}</td></tr>`).join('')}
    </tbody></table></div>
    <h3>Limitations</h3>
    <ul class="limits">
      <li>Programs are invented. Real programs have more complex rules, deadlines and documentation that change over time.</li>
      <li>The barrier scores are a framework demonstration, not a validated survey instrument.</li>
      <li>Software can address information and paperwork barriers; it cannot fix cash-flow timing, connectivity or trust on its own. The framework is designed to show which is which.</li>
    </ul>
    <div class="control-actions"><button class="btn" data-action="download">Download framework summary</button></div>
  </section>`;

  const barrierColor = (v) => (v >= 0.7 ? 'var(--rose)' : v >= 0.45 ? 'var(--amber)' : 'var(--green)');

  function renderBarriers() {
    const a = assessBarriers(answers);
    barList($('#barrier-bars', root), a.scores.map((s) => ({ label: s.label, value: s.score, color: barrierColor(s.score) })), { max: 1, format: (v) => v.toFixed(2) });
    $('#barrier-summary', root).innerHTML = `
      <h3 class="panel-h">Highest barriers and the design response</h3>
      ${a.top.length ? `<ol class="limits">${a.top.map((t) => `<li><strong>${esc(t.label)}</strong> (${t.score.toFixed(2)}): ${esc(SUPPORTS[t.id])}</li>`).join('')}</ol>` : '<p class="small dim">No dimension scores 0.5 or higher for this profile. Funding access is unlikely to be limited by these barriers.</p>'}
      <p class="small dim">Mean across dimensions: ${a.overall.toFixed(2)}. Cash-flow and digital-access barriers are partly outside what software can fix; the screener below flags reimbursement-based programs when cash flow is a barrier.</p>`;
  }

  function syncFarmForm() {
    $('#f-type', root).value = profile.type; $('#f-acres', root).value = profile.acres; $('#f-years', root).value = profile.years; $('#f-need', root).value = profile.need;
    $$('[data-doc]', root).forEach((c) => { c.checked = profile.docs.includes(c.dataset.doc); });
    $$('#barrier-form input[type=radio]', root).forEach((r) => { r.checked = Number(r.value) === answers[r.dataset.dim]; });
  }

  function renderScreen() {
    const res = screen(profile, answers);
    const counts = { eligible: 0, conditional: 0, ineligible: 0 };
    res.forEach((r) => counts[r.status]++);
    $('#screen-count', root).textContent = `${counts.eligible} likely eligible, ${counts.conditional} with conditions, ${counts.ineligible} not eligible`;
    const list = show === 'match' ? res.filter((r) => r.status !== 'ineligible') : res;
    $('#program-results', root).innerHTML = list.length ? `<ul class="program-list">${list.map((r) => `
      <li class="is-${r.status}">
        <p class="pname">${esc(r.program.name)}<span class="fictional">fictional</span></p><span class="pill ${r.status}">${STATUS[r.status]}</span>
        <p class="pmeta">${esc(r.program.award)} · ${esc(r.program.cadence)}${r.program.reimbursement ? ' · reimbursement-based' : ''}</p>
        ${r.fails.length || r.notes.length ? `<ul class="preasons">${(r.fails.length ? r.fails : r.notes).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<ul class="preasons"><li>Meets every rule, with all listed documents on file.</li></ul>'}
      </li>`).join('')}</ul>`
      : '<div class="state-empty small">No program matches this profile. Try a different funding need, or switch to “All programs” to see why each one is excluded.</div>';

    const conditional = res.filter((r) => r.status === 'conditional');
    const nearMiss = res.filter((r) => r.status === 'ineligible' && r.fails.length === 1);
    $('#next-steps', root).innerHTML = conditional.length || nearMiss.length ? `<ul class="limits">
      ${conditional.map((r) => `<li><strong>${esc(r.program.name)}</strong>: ${r.missing.length ? `gather ${esc(r.missing.join(', ').toLowerCase())}` : 'confirm the farm can cover costs before reimbursement'}.</li>`).join('')}
      ${nearMiss.map((r) => `<li><strong>${esc(r.program.name)}</strong> is excluded by one rule only: ${esc(r.fails[0].toLowerCase())}</li>`).join('')}
    </ul>` : '<p class="small dim">Nothing to change: programs are either fully eligible or excluded by several rules.</p>';
  }

  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.dim) { answers[t.dataset.dim] = Number(t.value); activePersona = null; markPersona(); renderBarriers(); renderScreen(); return; }
    if (t.dataset.doc) { profile.docs = $$('[data-doc]', root).filter((c) => c.checked).map((c) => c.dataset.doc); renderScreen(); return; }
    if (t.dataset.field) {
      const f = t.dataset.field;
      if (t.type === 'number') {
        const v = Number(t.value);
        const err = $('#acres-err', root);
        if (!t.checkValidity() || t.value === '') {
          if (f === 'acres') { err.hidden = false; err.textContent = 'Enter a farm size between 1 and 20,000 acres.'; }
          return;
        }
        if (f === 'acres') err.hidden = true;
        profile[f] = v;
      } else profile[f] = t.value;
      activePersona = null; markPersona(); renderScreen();
    }
  });
  root.addEventListener('click', (e) => {
    const p = e.target.closest('[data-persona]');
    if (p) {
      const per = PERSONAS.find((x) => x.id === p.dataset.persona);
      answers = { ...per.answers }; profile = structuredClone(per.profile); activePersona = per.id;
      markPersona(); syncFarmForm(); renderBarriers(); renderScreen(); announce(`Loaded ${per.label}`);
      return;
    }
    const s = e.target.closest('[data-show]');
    if (s) { show = s.dataset.show; $$('[data-show]', root).forEach((b) => b.setAttribute('aria-pressed', String(b === s))); renderScreen(); return; }
    if (e.target.closest('[data-action="download"]')) {
      const md = ['# AgriOne — funding access research framework', '', 'Sumana Panuganti. Programs and personas in the interactive demo are fictional. No interview findings are included.', '',
        '## Status', '- Approximately 30 farmer discovery interviews conducted.', '- Coded findings: in synthesis, not yet published.', '',
        '## Barrier dimensions', ...BARRIER_DIMENSIONS.map((d) => `- **${d.label}.** Explores: ${d.question} Design response being tested: ${SUPPORTS[d.id]}`), '',
        '## Impact measurement framework', ...IMPACT_METRICS.map((m) => `- **${m.stage}: ${m.metric}.** ${m.why}`), '', `Interactive version: ${location.href}`].join('\n');
      download('agrione-research-framework.md', md, 'text/markdown');
    }
  });
  function markPersona() { $$('[data-persona]', root).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.persona === activePersona))); }

  syncFarmForm(); renderBarriers(); renderScreen();
  return null;
}
