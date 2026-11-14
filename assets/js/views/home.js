/** Home page: hero, research agenda, labs, projects, experience, interests, CV, contact. */
import { person, education, agenda, labs, projects, experience, interests, skills, presentations, honors, toolset } from '../content.js';
import { esc, $, $$, download, announce } from '../lib/dom.js';
import { mountHeroNetwork } from '../hero.js';
import { labPreview } from './previews.js';

const METHOD = [
  { step: 'Frame the decision', body: 'Start from the decision a person or system has to make, and what a wrong decision costs.',
    labs: { safety: 'Which automated actions in a grid need a person, and why.', skyacres: 'Whether a field needs attention this week.', energy: 'How much storage to plan for.', agrione: 'Which program a farmer should apply to, if any.' } },
  { step: 'Model the system', body: 'Build the simplest model that captures the mechanism, with every assumption written down.',
    labs: { safety: 'Risk index R = impact × (1 − effective confidence).', skyacres: 'Double-logistic NDVI phenology with a water-stress factor.', energy: 'Hourly energy balance with battery power and energy limits.', agrione: 'Six barrier dimensions and rule-based eligibility checks.' } },
  { step: 'Expose uncertainty', body: 'Show what the model does not know, and refuse to answer when the data cannot support one.',
    labs: { safety: 'Out-of-distribution scores discount confidence and can force escalation.', skyacres: 'Cloud-masked fields with under 20 % clear pixels are reported as unknown.', energy: 'Seeded demand noise; outage scenarios beyond average conditions.', agrione: 'Every result shows the rule that produced it, and programs are fictional.' } },
  { step: 'Keep people accountable', body: 'Make each output traceable to inputs and rules, so a person can check it and own the decision.',
    labs: { safety: 'An audit log records inputs, rules fired and who decided.', skyacres: 'Per-field statistics show the baseline each alert is measured against.', energy: 'Assumptions panel and scenario comparison.', agrione: 'Missing documents and failed criteria listed for every program.' } },
];

export function renderHome(app) {
  const projectDomains = [...new Set(projects.flatMap((p) => p.domains))].sort();
  app.innerHTML = `
  <section class="hero" aria-labelledby="hero-title">
    <div class="wrap hero-grid">
      <div class="hero-text">
        <p class="hero-name">${esc(person.name)}</p>
        <p class="hero-fields">${person.fields.map(esc).join('<span aria-hidden="true"> / </span>')}</p>
        <h1 id="hero-title">${esc(person.headline)}</h1>
        <p class="hero-intro">${esc(person.intro)}</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#/lab/safety">Open the AI safety sandbox</a>
          <a class="btn" href="#/s/labs">See all four labs</a>
        </div>
      </div>
      <figure class="hero-figure">
        <canvas id="hero-canvas" aria-hidden="true"></canvas>
        <figcaption class="small dim">How my research areas connect. Select a node to open its lab.</figcaption>
        <ul class="visually-hidden">${labs.map((l) => `<li><a href="#/lab/${l.id}">${esc(l.title)}</a></li>`).join('')}</ul>
      </figure>
    </div>
  </section>

  <section class="section" id="research" aria-labelledby="research-h">
    <div class="wrap">
      <div class="section-head"><h2 id="research-h">Research agenda</h2><p class="lede">${esc(agenda.statement)}</p></div>
      <ol class="question-list">
        ${agenda.questions.map((q) => {
          const lab = labs.find((l) => l.id === q.lab);
          return `<li><p class="question">${esc(q.q)}</p><a href="#/lab/${q.lab}" class="small">Explore in the ${esc(lab.short)}</a></li>`;
        }).join('')}
      </ol>

      <div class="method" id="method">
        <div class="method-intro">
          <h3>How each lab is built</h3>
          <p class="dim">The same four-step method runs through every demonstration. Choose a step, then a lab, to see how it is applied.</p>
          <div class="seg" role="group" aria-label="Lab">
            ${labs.map((l, i) => `<button class="seg-btn" data-method-lab="${l.id}" aria-pressed="${i === 0}">${esc(l.short)}</button>`).join('')}
          </div>
        </div>
        <ol class="method-steps" role="list">
          ${METHOD.map((m, i) => `<li><button class="method-step" data-step="${i}" aria-pressed="${i === 0}"><span class="method-num">${i + 1}</span><span>${esc(m.step)}</span></button></li>`).join('')}
        </ol>
        <div class="method-detail" aria-live="polite"></div>
      </div>
    </div>
  </section>

  <section class="section" id="labs" aria-labelledby="labs-h">
    <div class="wrap">
      <div class="section-head"><h2 id="labs-h">Interactive labs</h2><p>Four working research demonstrations. Each one states its assumptions, labels synthetic data, and lets you change the inputs.</p></div>
      <div class="lab-index">
        ${labs.map((l) => `
        <a class="lab-row${l.flagship ? ' is-flagship' : ''}" href="#/lab/${l.id}">
          <span class="lab-domain">${esc(l.domain)}${l.flagship ? ' <span class="tag tag-flag">Flagship</span>' : ''}</span>
          <span class="lab-title">${esc(l.title)}</span>
          <span class="lab-summary">${esc(l.summary)}</span>
          <span class="lab-preview" aria-hidden="true">${labPreview(l.id)}</span>
        </a>`).join('')}
      </div>
    </div>
  </section>

  <section class="section" id="projects" aria-labelledby="projects-h">
    <div class="wrap">
      <div class="section-head"><h2 id="projects-h">Projects</h2><p>Past work from research roles and programs is marked <span class="tag tag-past">Past work</span>. New, independently built demonstrations are marked <span class="tag tag-demo">Independent demo</span>.</p></div>
      <div class="filters" role="group" aria-label="Filter projects">
        <div class="seg" role="group" aria-label="Project type">
          <button class="seg-btn" data-kind="all" aria-pressed="true">All</button>
          <button class="seg-btn" data-kind="past" aria-pressed="false">Past work</button>
          <button class="seg-btn" data-kind="demo" aria-pressed="false">Independent demos</button>
        </div>
        <div class="chips" role="group" aria-label="Domain">
          ${projectDomains.map((d) => `<button class="chip" data-domain="${esc(d)}" aria-pressed="false">${esc(d)}</button>`).join('')}
        </div>
      </div>
      <p class="small dim" id="project-count" aria-live="polite"></p>
      <div class="project-grid" id="project-grid"></div>
    </div>
  </section>

  <section class="section" id="experience" aria-labelledby="experience-h">
    <div class="wrap">
      <div class="section-head"><h2 id="experience-h">Experience</h2><p>Select a skill to highlight the roles where I used it.</p></div>
      <div class="chips" role="group" aria-label="Highlight by skill">
        ${skills.map((s) => `<button class="chip" data-skill="${esc(s)}" aria-pressed="false">${esc(s)}</button>`).join('')}
      </div>
      <ol class="timeline">
        ${experience.map((e) => `
        <li class="tl-item" data-skills="${esc(e.skills.join('|'))}">
          <div class="tl-date">${esc(e.dates)}</div>
          <div class="tl-body">
            <h3>${esc(e.role)}</h3>
            <p class="tl-org">${esc(e.org)} <span class="tag">${esc(e.group)}</span></p>
            <ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
            <p class="tl-skills">${e.skills.map((s) => `<span class="tag">${esc(s)}</span>`).join(' ')}</p>
          </div>
        </li>`).join('')}
      </ol>
      <div class="two-col creds">
        <div><h3 class="sub-h">Presentations</h3>
          <ul class="cred-list">${presentations.map((p) => `<li><span class="cred-title">${esc(p.title)}</span><span class="small dim">${esc(p.kind)}, ${esc(p.venue)}, ${esc(p.date)}</span></li>`).join('')}</ul></div>
        <div><h3 class="sub-h">Selected honours</h3>
          <ul class="cred-list">${honors.map((h) => `<li>${esc(h)}</li>`).join('')}</ul></div>
      </div>
      <h3 class="sub-h">Education</h3>
      <dl class="edu">
        ${education.map((e) => `<div><dt>${esc(e.degree)}</dt><dd>${esc(e.school)}<span class="dim"> — ${esc(e.dates)}${e.detail ? `, ${esc(e.detail)}` : ''}</span></dd></div>`).join('')}
      </dl>
    </div>
  </section>

  <section class="section" id="interests" aria-labelledby="interests-h">
    <div class="wrap">
      <div class="section-head"><h2 id="interests-h">Research interests</h2><p>Where I want to go deeper as a research assistant and fellow.</p></div>
      <dl class="interest-list">
        ${interests.map((i) => `<div><dt>${esc(i.title)}</dt><dd>${esc(i.body)}</dd></div>`).join('')}
      </dl>
    </div>
  </section>

  <section class="section" id="cv" aria-labelledby="cv-h">
    <div class="wrap">
      <div class="section-head"><h2 id="cv-h">CV</h2><p>A one-page summary. Print it or save it as a PDF, or download a plain-text copy.</p></div>
      <div class="cv-actions">
        ${person.links.cvPdf ? `<a class="btn btn-primary" href="${esc(person.links.cvPdf)}" download>Download CV (PDF)</a>` : ''}
        <button class="btn${person.links.cvPdf ? '' : ' btn-primary'}" data-action="print-cv">Print or save as PDF</button>
        <button class="btn" data-action="download-cv">Download as text</button>
      </div>
      <article class="cv-sheet" id="cv-sheet">
        <header><h3>${esc(person.name)}</h3><p class="dim small">${person.fields.map(esc).join(' / ')}</p></header>
        <h4>Education</h4>
        <ul>${education.map((e) => `<li><strong>${esc(e.degree)}</strong>, ${esc(e.school)} — ${esc(e.dates)}${e.detail ? `. ${esc(e.detail)}` : ''}</li>`).join('')}</ul>
        <h4>Research experience</h4>
        <ul>${experience.filter((e) => e.group === 'Research').map((e) => `<li><strong>${esc(e.role)}</strong>, ${esc(e.org)} — ${esc(e.dates)}. ${esc(e.bullets[0])}</li>`).join('')}</ul>
        <h4>Industry experience</h4>
        <ul>${experience.filter((e) => e.group !== 'Research').map((e) => `<li><strong>${esc(e.role)}</strong>, ${esc(e.org)} — ${esc(e.dates)}</li>`).join('')}</ul>
        <h4>Presentations</h4>
        <ul>${presentations.map((p) => `<li>“${esc(p.title)}” (${esc(p.kind.toLowerCase())}), ${esc(p.venue)}, ${esc(p.date)}</li>`).join('')}</ul>
        <h4>Selected honours</h4>
        <ul>${honors.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
        <h4>Selected projects</h4>
        <ul>${projects.filter((p) => p.kind === 'past').map((p) => `<li><strong>${esc(p.title)}</strong>${p.org ? `, ${esc(p.org)}` : ''}: ${esc(p.summary)}</li>`).join('')}</ul>
        <h4>Technical skills</h4>
        <p>${esc(toolset)}</p>
      </article>
    </div>
  </section>

  <section class="section" id="contact" aria-labelledby="contact-h">
    <div class="wrap contact">
      <h2 id="contact-h">Contact</h2>
      <p class="lede">I'm looking for research assistant roles at Columbia and fellowships in AI safety. I'd be glad to walk through any of the labs or projects here.</p>
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
      <p class="method-app"><span class="dim">In the ${esc(lab.short)}:</span> ${esc(m.labs[mLab])}</p>
      <a class="small" href="#/lab/${mLab}">Open this lab</a>`;
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
    grid.innerHTML = list.length ? list.map((p) => {
      const href = p.caseStudy ? `#/project/${p.id}` : `#/lab/${p.lab}`;
      return `<article class="project-card">
        <p class="pc-meta"><span class="tag ${p.kind === 'past' ? 'tag-past' : 'tag-demo'}">${p.kind === 'past' ? 'Past work' : 'Independent demo'}</span>${p.dates ? `<span class="dim small">${esc(p.dates)}</span>` : ''}</p>
        <h3><a href="${href}">${esc(p.title)}</a></h3>
        <p class="pc-org small dim">${esc(p.org)}</p>
        <p class="pc-summary">${esc(p.summary)}</p>
        <p class="pc-domains">${p.domains.map((d) => `<span class="tag">${esc(d)}</span>`).join(' ')}</p>
        <p class="pc-links small">${p.caseStudy ? `<a href="#/project/${p.id}">Read case study</a>` : ''}${p.lab ? `<a href="#/lab/${p.lab}">Open lab</a>` : ''}</p>
      </article>`;
    }).join('') : `<div class="state-empty"><p>No projects match these filters.</p><button class="btn btn-small" data-action="clear-filters">Clear filters</button></div>`;
  };
  $('#projects', app).addEventListener('click', (e) => {
    const k = e.target.closest('[data-kind]');
    const d = e.target.closest('[data-domain]');
    if (k) { state.kind = k.dataset.kind; $$('[data-kind]', app).forEach((b) => b.setAttribute('aria-pressed', String(b === k))); }
    if (d) { const v = d.dataset.domain; state.domains.has(v) ? state.domains.delete(v) : state.domains.add(v); d.setAttribute('aria-pressed', String(state.domains.has(v))); }
    if (e.target.closest('[data-action="clear-filters"]')) {
      state.kind = 'all'; state.domains.clear();
      $$('[data-kind]', app).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.kind === 'all')));
      $$('[data-domain]', app).forEach((b) => b.setAttribute('aria-pressed', 'false'));
    }
    if (k || d || e.target.closest('[data-action="clear-filters"]')) renderProjects();
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

  return mountHeroNetwork($('#hero-canvas', app), labs);
}
