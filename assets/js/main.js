/**
 * App entry: hash router and navigation.
 *
 * Routes
 *   #/                 home
 *   #/s/<section>      home, scrolled to a section (research, labs, projects, ...)
 *   #/lab/<id>         an interactive lab (safety, skyacres, energy, agrione)
 *   #/project/<id>     a project case study
 *
 * Hash routing keeps every page linkable on GitHub Pages without server configuration.
 */
import { renderHome } from './views/home.js';
import { renderProject } from './views/project.js';
import { renderLab } from './views/lab.js';
import { $, $$ } from './lib/dom.js';

const app = $('#app');
let cleanup = null;
let currentView = '';

function parse() {
  const parts = (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean);
  if (parts[0] === 'lab' && parts[1]) return { view: 'lab', id: parts[1] };
  if (parts[0] === 'project' && parts[1]) return { view: 'project', id: parts[1] };
  if (parts[0] === 's' && parts[1]) return { view: 'home', section: parts[1] };
  return { view: 'home' };
}

async function route() {
  const r = parse();
  const key = r.view === 'home' ? 'home' : `${r.view}:${r.id}`;
  closeMenu();

  if (key !== currentView) {
    if (typeof cleanup === 'function') cleanup();
    cleanup = null;
    app.classList.remove('is-entering');
    try {
      if (r.view === 'lab') cleanup = await renderLab(app, r.id);
      else if (r.view === 'project') cleanup = renderProject(app, r.id);
      else cleanup = renderHome(app);
    } catch (err) {
      console.error(err);
      app.innerHTML = `<div class="wrap state-error"><h2>This page didn't load</h2><p>${err.message}. Reload the page, or <a href="#/">return to the home page</a>.</p></div>`;
    }
    void app.offsetWidth;
    app.classList.add('is-entering');
    currentView = key;
    if (!r.section) { window.scrollTo({ top: 0 }); if (r.view !== 'home') app.focus({ preventScroll: true }); }
  }

  if (r.section) {
    const target = document.getElementById(r.section);
    if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
  }
  $$('[data-nav]').forEach((a) => a.setAttribute('aria-current', String(a.dataset.nav === r.section || (r.view === 'lab' && a.dataset.nav === 'labs') || (r.view === 'project' && a.dataset.nav === 'projects'))));
}

const toggleBtn = $('.nav-toggle');
const links = $('#nav-links');
function closeMenu() { links.classList.remove('open'); toggleBtn.setAttribute('aria-expanded', 'false'); }
toggleBtn.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  toggleBtn.setAttribute('aria-expanded', String(open));
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

// Re-clicking a section link whose hash is already active still scrolls to it.
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#/"]');
  if (a && a.getAttribute('href') === location.hash) { e.preventDefault(); currentView = currentView || ''; route(); }
});

$('#year').textContent = new Date().getFullYear();
window.addEventListener('hashchange', route);
route();
