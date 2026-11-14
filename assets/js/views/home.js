/**
 * Home page. Composition, top to bottom:
 *   opening (name, tagline, intro, academic panel) · research index + Fig. 1 ·
 *   research questions + method · four studies · projects · experience ·
 *   interests · CV · contact.
 */
import { person, education, agenda, labs, projects, experience, interests, skills, presentations, honors, toolset } from '../content.js';
import { esc, $, $$, download, announce } from '../lib/dom.js';
import { mountFig1 } from '../fig1.js';
import { labPreview } from './previews.js';

const METHOD = [
  { step: 'Frame the decision', body: 'Start from the decision a person or system has to make, and what a wrong decision costs.',
    labs: { safety: 'Which automated actions in a grid need a person, and why.', skyacres: 'Whether a field needs attention this week.', energy: 'How much storage to plan for.', agrione: 'Which program a farmer should apply to, if any.' } },
  { step: 'Model the mechanism', body: 'Build the simplest model that captures the mechanism, and write every assumption down.',
    labs: { safety: 'Risk index R = impact × (1 − effective confidence).', skyacres: 'Double-logistic NDVI phenology with a water-stress factor.', energy: 'Hourly energy balance with battery power and energy limits.', agrione: 'Six barrier dimensions and rule-based eligibility checks.' } },
  { step: 'Show the uncertainty', body: 'Make visible what the model does not know, and decline to answer when the data cannot support one.',
    labs: { safety: 'Out-of-distribution scores discount confidence and can force escalation.', skyacres: 'Fields with under 20% clear pixels are reported as unknown.', energy: 'Seeded demand noise, and outage scenarios beyond average conditions.', agrione: 'Every result shows the rule behind it; every program is fictional.' } },
  { step: 'Keep a person accountable', body: 'Trace each output to its inputs and rules, so someone can check it and own the decision.',
    labs: { safety: 'An audit log records inputs, rules fired and who decided.', skyacres: 'Each alert shows the baseline it is measured against.', energy: 'An assumptions table and a scenario comparison.', agrione: 'Missing documents and failed criteria listed for every program.' } },
];

const pad = (n) => String(n).padStart(2, '0');

export function renderHome(app) {
  const projectDomains = [...new Set(projects.flatMap((p) => p.domains))].sort();
  app.innerHTML = `
  <section class="opening" aria-labelledby="hero-title">
    <div class="wrap opening-grid">
      <header class="opening-text">
        <p class="mono opening-meta">Personal research site, New York, 2026</p>
        <h1 id="hero-title" class="name">${esc(person.name)}</h1>
        <p class="tagline">${esc(person.tagline)}</p>
        <p class="intro">${esc(person.intro)}</p>
      </header>
      <aside class="panel-academic" aria-label="Academic information">
        <dl>${person.panel.map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
          <div><dt class="mono">Elsewhere</dt><dd class="panel-links"><a href="${esc(person.links.linkedin)}" target="_blank" rel="me noopener">LinkedIn</a> <a href="${esc(person.links.github)}" target="_blank" rel="me noopener">GitHub</a> <a href="#/s/cv">CV</a></dd></div>
        </dl>
      </aside>
      <nav class="index" aria-label="Research index">
        <p class="mono index-h">Index of studies</p>
        <ol>${labs.map((l, i) => `<li><a href="#/lab/${l.id}"><span class="mono">${pad(i + 1)}</span><span class="index-title">${esc(l.title)}</span><span class="mono index-domain">${esc(l.domain)}</span></a></li>`).join('')}</ol>
        <p class="index-more small"><a href="#/s/projects">All projects</a>&emsp;<a href="#/s/experience">Experience</a>&emsp;<a href="#/s/research">Research questions</a></p>
      </nav>
      <figure class="fig fig1">
        <div id="fig1"></div>
        <figcaption><span class="mono">Fig. 1</span> The question behind Study 01, as a plane. Move across it. Each dot is one of the study's scenarios; above the curve, an automated action needs a person's sign-off. <a href="#/lab/safety">Open the study</a>.</figcaption>
      </figure>
    </div>
  </section>

  <section class="section" id="research" aria-labelledby="research-h">
    <div class="wrap">
      <div class="section-head"><span class="sec-no">§1 Research</span><h2 id="research-h">What I keep asking</h2><p>Four questions, each explored in a working study on this site.</p></div>
      <div class="research-grid">
        <p class="statement">${esc(agenda.statement)}</p>
        <ol class="question-list">
          ${agenda.questions.map((q) => {
            const i = labs.findIndex((l) => l.id === q.lab);
            return `<li><span class="mono q-no">Q${i + 1}</span><p class="question">${esc(q.q)}</p><a href="#/lab/${q.lab}" class="mono q-link">Study ${pad(i + 1)}</a></li>`;
          }).join('')}
        </ol>
      </div>

      <div class="method" id="method">
        <div class="method-intro">
          <h3>How each study is built</h3>
          <p class="dim small">The same four steps run through every study. Choose a step, then a study.</p>
          <div class="seg" role="group" aria-label="Study">
            ${labs.map((l, i) => `<button class="seg-btn" data-method-lab="${l.id}" aria-pressed="${i === 0}">${esc(l.short)}</button>`).join('')}
          </div>
        </div>
        <ol class="method-steps">
          ${METHOD.map((m, i) => `<li><button class="method-step" data-step="${i}" aria-pressed="${i === 0}"><span class="mono">${i + 1}</span><span class="method-name">${esc(m.step)}</span></button></li>`).join('')}
        </ol>
        <div class="method-detail" aria-live="polite"></div>
      </div>
    </div>
  </section>

  <section class="section" id="labs" aria-labelledby="labs-h">
    <div class="wrap">
      <div class="section-head"><span class="sec-no">§2 Studies</span><h2 id="labs-h">Four working studies</h2><p>Each is an interactive paper: a question, a model you can change, and its assumptions and limits stated plainly. Data is synthetic or fictional and labelled as such.</p></div>
      <div class="studies">
        ${labs.map((l, i) => `
        <article class="study" data-study="${l.id}">
          <div class="study-no mono">Study ${pad(i + 1)}<br>${esc(l.domain)}${l.flagship ? '<br><span class="tag tag-flag">Flagship</span>' : ''}</div>
          <div class="study-body">
            <h3><a href="#/lab/${l.id}">${esc(l.title)}</a></h3>
            <p class="study-q">${esc(agenda.questions.find((q) => q.lab === l.id)?.q || '')}</p>
            <p class="study-sum">${esc(l.summary)}</p>
            <a class="btn btn-small" href="#/lab/${l.id}">Open study ${pad(i + 1)}</a>
          </div>
          <figure class="study-fig" aria-hidden="true">${labPreview(l.id)}<figcaption class="mono">Fig. ${i + 2} ${esc(PREVIEW_CAPTION[l.id])}</figcaption></figure>
        </article>`).join('')}
      </div>
    </div>
  </section>

  <section class="section" id="projects" aria-labelledby="projects-h">
    <div class="wrap">
      <div class="section-head"><span class="sec-no">§3 Projects</span><h2 id="projects-h">Projects</h2><p>Past work from research programmes and jobs, and the new demonstrations built for this site. Each is marked.</p></div>
      <div class="filters" role="group" aria-label="Filter projects">
        <div class="seg" role="group" aria-label="Project type">
          <button class="seg-btn" data-kind="all" aria-pressed="true">All</button>
          <button class="seg-btn" data-kind="past" aria-pressed="false">Past work</button>
          <button class="seg-btn" data-kind="demo" aria-pressed="false">Demonstrations</button>
        </div>
        <div class="chips" role="group" aria-label="Domain">
          ${projectDomains.map((d) => `<button class="chip" data-domain="${esc(d)}" aria-pressed="false">${esc(d)}</button>`).join('')}
        </div>
      </div>
      <p class="mono" id="project-count" aria-live="polite"></p>
      <div class="project-grid" id="project-grid"></div>
    </div>
  </section>

  <section class="section" id="experience" aria-labelledby="experience-h">
    <div class="wrap">
      <div class="section-head"><span class="sec-no">§4 Experience</span><h2 id="experience-h">Experience</h2><p>Research and industry roles, newest first. Choose a skill to see where I used it.</p></div>
      <div class="chips" role="group" aria-label="Highlight by skill">
        ${skills.map((s) => `<button class="chip" data-skill="${esc(s)}" aria-pressed="false">${esc(s)}</button>`).join('')}
      </div>
      <ol class="timeline">
        ${experience.map((e) => `
        <li class="tl-item" data-skills="${esc(e.skills.join('|'))}">
          <div class="tl-date mono">${esc(e.dates)}</div>
          <div class="tl-head"><h3>${esc(e.role)}</h3><p class="tl-org">${esc(e.org)}</p><p class="mono tl-group">${esc(e.group)}</p></div>
          <div class="tl-body"><ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul><p class="tl-skills mono">${e.skills.map(esc).join(', ')}</p></div>
        </li>`).join('')}
      </ol>
      <div class="creds">
        <div><h3>Presentations</h3>
          <ul class="cred-list">${presentations.map((p) => `<li><span class="cred-title">${esc(p.title)}</span><span class="mono">${esc(p.kind)}, ${esc(p.venue)}, ${esc(p.date)}</span></li>`).join('')}</ul></div>
        <div><h3>Selected honours</h3>
          <ul class="cred-list">${honors.map((h) => `<li>${esc(h)}</li>`).join('')}</ul></div>
        <div><h3>Education</h3>
          <ul class="cred-list">${education.map((e) => `<li><span class="cred-title">${esc(e.degree)}</span>${esc(e.school)}<br><span class="mono">${esc(e.dates)}</span>${e.detail ? `<br><span class="dim small">${esc(e.detail)}</span>` : ''}</li>`).join('')}</ul></div>
      </div>
    </div>
  </section>

  <section class="section" id="interests" aria-labelledby="interests-h">
    <div class="wrap">
      <div class="section-head"><span class="sec-no">§5 Interests</span><h2 id="interests-h">Where I want to go deeper</h2><p>The questions I would like to work on as a research assistant and fellow.</p></div>
      <dl class="interest-list">
        ${interests.map((i, k) => `<div><dt><span class="mono">${String.fromCharCode(97 + k)}.</span> ${esc(i.title)}</dt><dd>${esc(i.body)}</dd></div>`).join('')}
      </dl>
    </div>
  </section>

  <section class="section" id="cv" aria-labelledby="cv-h">
    <div class="wrap">
      <div class="section-head"><span class="sec-no">§6 CV</span><h2 id="cv-h">Curriculum vitae</h2><p>A one-page summary. Print it, save it as a PDF, or download a plain-text copy.</p></div>
      <div class="cv-actions">
        ${person.links.cvPdf ? `<a class="btn btn-primary" href="${esc(person.links.cvPdf)}" download>Download CV (PDF)</a>` : ''}
        <button class="btn${person.links.cvPdf ? '' : ' btn-primary'}" data-action="print-cv">Print or save as PDF</button>
        <button class="btn" data-action="download-cv">Download as text</button>
      </div>
      <article class="cv-sheet" id="cv-sheet">
        <header><h3>${esc(person.name)}</h3><p class="mono">${person.fields.map(esc).join(', ')}</p></header>
        <h4>Education</h4>
        <ul>${education.map((e) => `<li><strong>${esc(e.degree)}</strong>, ${esc(e.school)}, ${esc(e.dates)}${e.detail ? `. ${esc(e.detail)}` : ''}</li>`).join('')}</ul>
        <h4>Research experience</h4>
        <ul>${experience.filter((e) => e.group === 'Research').map((e) => `<li><strong>${esc(e.role)}</strong>, ${esc(e.org)}, ${esc(e.dates)}. ${esc(e.bullets[0])}</li>`).join('')}</ul>
        <h4>Industry experience</h4>
        <ul>${experience.filter((e) => e.group !== 'Research').map((e) => `<li><strong>${esc(e.role)}</strong>, ${esc(e.org)}, ${esc(e.dates)}</li>`).join('')}</ul>
        <h4>Presentations</h4>
        <ul>${presentations.map((p) => `<li>“${esc(p.title)}” (${esc(p.kind.toLowerCase())}), ${esc(p.venue)}, ${esc(p.date)}</li>`).join('')}</ul>
        <h4>Selected honours</h4>
        <ul>${honors.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
        <h4>Technical skills</h4>
        <p>${esc(toolset)}</p>
      </article>
    </div>
  </section>

  <section class="section" id="contact" aria-labelledby="contact-h">
    <div class="wrap contact">
      <span class="mono">§7 Contact</span>
      <h2 id="contact-h">If any of this overlaps with your work, I would like to hear from you.</h2>
      <p class="dim">I'm looking for research assistant roles at Columbia and fellowships in AI safety, and I'm glad to walk through any study here in detail.</p>
      <ul class="contact-links">
        ${person.links.email ? `<li><a href="mailto:${esc(person.links.email)}">${esc(person.links.email)}</a></li>` : ''}
        ${person.links.linkedin ? `<li><a href="${esc(person.links.linkedin)}" rel="me noopener" target="_blank">LinkedIn</a></li>` : ''}
        ${person.links.github ? `<li><a href="${esc(person.links.github)}" rel="me noopener" target="_blank">GitHub</a></li>` : ''}
      </ul>
    </div>
  </section>`;

  // --- Method diagram ---------------------------------------------------
  let mStep = 0, mLab = labs[0].id;
  const renderMethod = () => {
    const m = METHOD[mStep];
    const lab = labs.find((l) => l.id === mLab);
    $('.method-detail', app).innerHTML = `<p class="method-body">${esc(m.body)}</p>
      <p class="method-app"><span class="mono">In the ${esc(lab.short)}</span><br>${esc(m.labs[mLab])}</p>
      <a class="small" href="#/lab/${mLab}">Open this study</a>`;
    $$('.method-step', app).forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.step) === mStep)));
    $$('[data-method-lab]', app).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.methodLab === mLab)));
  };
  $('.method', app).addEventListener('click', (e) => {
    const s = e.target.closest('.method-step');
    const l = e.target.closest('[data-method-lab]');
    if (s) mStep = Number(s.dataset.step);
    if (l) mLab = l.dataset.methodLab;
    if (s || l) renderMethod();
  });
  renderMethod();

  // --- Project filters --------------------------------------------------
  const state = { kind: 'all', domains: new Set() };
  const grid = $('#project-grid', app);
  const renderProjects = () => {
    const list = projects.filter((p) => (state.kind === 'all' || p.kind === state.kind) && (!state.domains.size || p.domains.some((d) => state.domains.has(d))));
    $('#project-count', app).textContent = `Showing ${list.length} of ${projects.length} projects`;
    grid.innerHTML = list.length ? `<ol class="project-list">${list.map((p) => {
      const n = projects.indexOf(p) + 1;
      const href = p.caseStudy ? `#/project/${p.id}` : `#/lab/${p.lab}`;
      return `<li class="project-card">
        <span class="mono pc-no">P${pad(n)}</span>
        <span class="mono pc-year">${esc(p.dates)}</span>
        <div class="pc-main"><h3><a href="${href}">${esc(p.title)}</a></h3><p class="pc-summary">${esc(p.summary)}</p></div>
        <div class="pc-meta"><span class="tag ${p.kind === 'past' ? 'tag-past' : 'tag-demo'}">${p.kind === 'past' ? 'Past work' : 'Demonstration'}</span><span class="mono pc-org">${esc(p.org)}</span><span class="mono pc-domains">${p.domains.map(esc).join(', ')}</span></div>
        <div class="pc-links small">${p.caseStudy ? `<a href="#/project/${p.id}">Case study</a>` : ''}${p.lab ? `<a href="#/lab/${p.lab}">Study</a>` : ''}</div>
      </li>`;
    }).join('')}</ol>` : `<div class="state-empty"><p>No projects match these filters.</p><button class="btn btn-small" data-action="clear-filters">Clear filters</button></div>`;
  };
  $('#projects', app).addEventListener('click', (e) => {
    const k = e.target.closest('[data-kind]');
    const d = e.target.closest('[data-domain]');
    const clear = e.target.closest('[data-action="clear-filters"]');
    if (k) { state.kind = k.dataset.kind; $$('[data-kind]', app).forEach((b) => b.setAttribute('aria-pressed', String(b === k))); }
    if (d) { const v = d.dataset.domain; state.domains.has(v) ? state.domains.delete(v) : state.domains.add(v); d.setAttribute('aria-pressed', String(state.domains.has(v))); }
    if (clear) {
      state.kind = 'all'; state.domains.clear();
      $$('[data-kind]', app).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.kind === 'all')));
      $$('[data-domain]', app).forEach((b) => b.setAttribute('aria-pressed', 'false'));
    }
    if (k || d || clear) renderProjects();
  });
  renderProjects();

  // --- Experience skill highlight --------------------------------------
  $('#experience', app).addEventListener('click', (e) => {
    const chip = e.target.closest('[data-skill]');
    if (!chip) return;
    const on = chip.getAttribute('aria-pressed') !== 'true';
    $$('[data-skill]', app).forEach((b) => b.setAttribute('aria-pressed', 'false'));
    chip.setAttribute('aria-pressed', String(on));
    let count = 0;
    $$('.tl-item', app).forEach((li) => {
      const match = on && li.dataset.skills.split('|').includes(chip.dataset.skill);
      if (match) count++;
      li.classList.toggle('is-match', match);
      li.classList.toggle('is-dim', on && !match);
    });
    announce(on ? `${count} roles use ${chip.dataset.skill}` : 'Skill highlight cleared');
  });

  // --- CV ----------------------------------------------------------------
  $('#cv', app).addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    if (a.dataset.action === 'print-cv') { document.body.classList.add('print-cv'); window.print(); setTimeout(() => document.body.classList.remove('print-cv'), 500); }
    if (a.dataset.action === 'download-cv') download('Sumana-Panuganti-CV.txt', $('#cv-sheet', app).innerText);
  });

  return mountFig1($('#fig1', app));
}

const PREVIEW_CAPTION = {
  safety: 'Automation rate and residual harm against the oversight threshold.',
  skyacres: 'NDVI over a season: expected (dashed) and under drought.',
  energy: 'Demand, solar output and battery charge over 24 hours.',
  agrione: 'Barrier profile for fictional persona A.',
};
