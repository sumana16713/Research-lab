/** Small DOM helpers. No framework: templates are strings, events are delegated. */

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const fmt = {
  n: (v, d = 0) => (Number.isFinite(v) ? v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—'),
  pct: (v, d = 0) => (Number.isFinite(v) ? `${(v * 100).toFixed(d)}%` : '—'),
  hour: (h) => `${String(h).padStart(2, '0')}:00`,
};

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Labelled range slider. Returns markup; values are read through `data-key`.
 * Every slider shows its current value and unit next to the label.
 */
export function slider({ key, label, min, max, step = 1, value, unit = '', hint = '' }) {
  const id = `ctl-${key}`;
  return `
    <div class="ctl">
      <div class="ctl-row"><label for="${id}">${esc(label)}</label><output for="${id}" data-out="${key}">${esc(value)}${esc(unit)}</output></div>
      <input type="range" id="${id}" data-key="${key}" data-unit="${esc(unit)}" min="${min}" max="${max}" step="${step}" value="${value}"${hint ? ` aria-describedby="${id}-hint"` : ''}>
      ${hint ? `<p class="ctl-hint" id="${id}-hint">${esc(hint)}</p>` : ''}
    </div>`;
}

export function toggle({ key, label, checked }) {
  return `<label class="switch"><input type="checkbox" data-key="${key}"${checked ? ' checked' : ''}><span class="switch-track" aria-hidden="true"></span><span>${esc(label)}</span></label>`;
}

export function select({ key, label, options, value }) {
  const id = `ctl-${key}`;
  return `<div class="ctl"><label for="${id}">${esc(label)}</label><select id="${id}" data-key="${key}">${Object.entries(options)
    .map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
}

/** Read the current value of a control element as the right type. */
export function readControl(el) {
  if (el.type === 'checkbox') return el.checked;
  if (el.type === 'range' || el.type === 'number') return Number(el.value);
  return el.value;
}

/** Sync visible <output> values for a set of slider inputs. */
export function syncOutputs(root, formatters = {}) {
  $$('input[type=range]', root).forEach((el) => {
    const pct = ((Number(el.value) - Number(el.min)) / (Number(el.max) - Number(el.min) || 1)) * 100;
    el.style.setProperty('--fill', `${pct}%`);
    const out = $(`[data-out="${el.dataset.key}"]`, root);
    if (!out) return;
    const f = formatters[el.dataset.key];
    out.textContent = f ? f(Number(el.value)) : `${el.value}${el.dataset.unit || ''}`;
  });
}

/** Expandable panel using native <details> so it works with keyboard and screen readers. */
export function details(summary, body, open = false) {
  return `<details class="expander"${open ? ' open' : ''}><summary>${summary}</summary><div class="expander-body">${body}</div></details>`;
}

/** Trigger a client-side download of text content. */
export function download(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Announce a short status message to screen readers. */
export function announce(msg) {
  const live = document.getElementById('live-region');
  if (live) { live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 30); }
}
