/** Lab page shell: loads the lab module on demand and shows loading / error states. */
import { labs } from '../content.js';
import { esc } from '../lib/dom.js';

const MODULES = {
  safety: () => import('../labs/safety.js'),
  skyacres: () => import('../labs/skyacres.js'),
  energy: () => import('../labs/energy.js'),
  agrione: () => import('../labs/agrione.js'),
};

export async function renderLab(app, id) {
  const meta = labs.find((l) => l.id === id);
  if (!meta || !MODULES[id]) {
    app.innerHTML = `<div class="wrap state-error"><h2>Lab not found</h2><p>There is no lab called “${esc(id)}”. <a href="#/s/labs">See all labs</a>.</p></div>`;
    return null;
  }
  const others = labs.filter((l) => l.id !== id);
  app.innerHTML = `
  <div class="lab-page" data-lab="${id}">
    <div class="wrap">
      <nav class="crumbs small" aria-label="Breadcrumb"><a href="#/s/labs">Studies</a> <span aria-hidden="true">/</span> <span>Study ${String(labs.indexOf(meta) + 1).padStart(2, '0')}</span></nav>
      <div id="lab-root"><div class="state-loading" role="status"><span class="spinner" aria-hidden="true"></span> Loading the ${esc(meta.short)}…</div></div>
      <nav class="lab-switch" aria-label="Other studies"><span class="small dim">Other studies</span>${others.map((l) => `<a href="#/lab/${l.id}">${esc(l.short)}</a>`).join('')}</nav>
    </div>
  </div>`;
  const root = app.querySelector('#lab-root');
  try {
    const mod = await MODULES[id]();
    const cleanup = mod.mount(root, meta) || null;
    const n = labs.indexOf(meta) + 1;
    // Paper layout: gather each section's heading and margin notes into a side column
    root.querySelectorAll('.lab-block').forEach((block) => {
      const side = document.createElement('div');
      side.className = 'block-side';
      block.querySelectorAll(':scope > .block-h, :scope > .margin-note').forEach((el) => side.appendChild(el));
      block.prepend(side);
    });
    root.querySelector('.lab-kicker')?.insertAdjacentHTML('afterbegin', `<p class="study-label">Study ${String(n).padStart(2, '0')}<br>${esc(meta.domain)}</p>`);
    return cleanup;
  } catch (err) {
    console.error(err);
    root.innerHTML = `<div class="state-error"><h2>The lab didn't load</h2><p>${esc(err.message)}. Check your connection and <button class="btn btn-small" onclick="location.reload()">reload</button>.</p></div>`;
    return null;
  }
}
