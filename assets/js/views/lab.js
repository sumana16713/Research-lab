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
      <nav class="crumbs small" aria-label="Breadcrumb"><a href="#/s/labs">Interactive labs</a> <span aria-hidden="true">/</span> <span>${esc(meta.short)}</span></nav>
      <div id="lab-root"><div class="state-loading" role="status"><span class="spinner" aria-hidden="true"></span> Loading the ${esc(meta.short)}…</div></div>
      <nav class="lab-switch" aria-label="Other labs"><span class="small dim">Other labs</span>${others.map((l) => `<a href="#/lab/${l.id}">${esc(l.short)}</a>`).join('')}</nav>
    </div>
  </div>`;
  const root = app.querySelector('#lab-root');
  try {
    const mod = await MODULES[id]();
    return mod.mount(root, meta) || null;
  } catch (err) {
    console.error(err);
    root.innerHTML = `<div class="state-error"><h2>The lab didn't load</h2><p>${esc(err.message)}. Check your connection and <button class="btn btn-small" onclick="location.reload()">reload</button>.</p></div>`;
    return null;
  }
}
