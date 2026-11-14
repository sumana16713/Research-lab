/** Project case-study page. Content comes from content.js. */
import { projects, labs } from '../content.js';
import { esc, download } from '../lib/dom.js';

export function renderProject(app, id) {
  const p = projects.find((x) => x.id === id && x.caseStudy);
  if (!p) {
    app.innerHTML = `<div class="wrap state-error"><h2>Case study not found</h2><p>There is no case study called “${esc(id)}”. <a href="#/s/projects">Browse all projects</a>.</p></div>`;
    return null;
  }
  const lab = labs.find((l) => l.id === p.lab);
  const others = projects.filter((x) => x.caseStudy && x.id !== p.id);
  const section = (s) => `
    <section class="cs-section">
      <h2>${esc(s.h)}</h2>
      ${s.p ? `<p>${esc(s.p)}</p>` : ''}
      ${s.list ? `<ul>${s.list.map((li) => `<li>${esc(li)}</li>`).join('')}</ul>` : ''}
      ${s.note ? `<p class="notice">${esc(s.note)}</p>` : ''}
    </section>`;

  app.innerHTML = `
  <article class="case-study">
    <div class="wrap">
      <nav class="crumbs small" aria-label="Breadcrumb"><a href="#/s/projects">Projects</a> <span aria-hidden="true">/</span> <span>${esc(p.title)}</span></nav>
      <header class="cs-head">
        <p class="pc-meta"><span class="tag ${p.kind === 'past' ? 'tag-past' : 'tag-demo'}">${p.kind === 'past' ? 'Past work' : 'Independent demo'}</span>${p.dates ? `<span class="dim small">${esc(p.dates)}</span>` : ''}</p>
        <h1>${esc(p.title)}</h1>
        <p class="lede">${esc(p.summary)}</p>
        <p class="dim">${esc(p.org)}</p>
        <div class="hero-actions">
          ${lab ? `<a class="btn btn-primary" href="#/lab/${lab.id}">Open the related lab</a>` : ''}
          <button class="btn" data-action="download">Download summary</button>
        </div>
      </header>
      <div class="cs-body">
        <aside class="cs-toc" aria-label="On this page"><ol>${p.caseStudy.map((s, i) => `<li><a href="#cs-${i}" data-jump="cs-${i}">${esc(s.h)}</a></li>`).join('')}</ol></aside>
        <div class="cs-content">${p.caseStudy.map((s, i) => section(s).replace('<section class="cs-section">', `<section class="cs-section" id="cs-${i}">`)).join('')}</div>
      </div>
      <nav class="cs-next" aria-label="Other case studies">
        <h2 class="small dim">Other case studies</h2>
        <ul>${others.map((o) => `<li><a href="#/project/${o.id}">${esc(o.title)}</a></li>`).join('')}</ul>
      </nav>
    </div>
  </article>`;

  // In-page jumps without changing the route hash
  app.querySelector('.cs-toc').addEventListener('click', (e) => {
    const a = e.target.closest('[data-jump]');
    if (!a) return;
    e.preventDefault();
    document.getElementById(a.dataset.jump)?.scrollIntoView({ behavior: 'smooth' });
  });
  app.querySelector('[data-action="download"]').addEventListener('click', () => {
    const text = [`${p.title} — ${p.org}${p.dates ? ` (${p.dates})` : ''}`, '', p.summary, '',
      ...p.caseStudy.flatMap((s) => [s.h.toUpperCase(), s.p || '', ...(s.list || []).map((l) => `- ${l}`), s.note ? `Note: ${s.note}` : '', '']),
      `Source: ${location.href}`].join('\n');
    download(`${p.id}-summary.txt`, text);
  });
  return null;
}
