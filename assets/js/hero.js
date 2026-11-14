/**
 * Hero visual: a living map of how the research areas connect.
 *
 * Applied AI sits at the centre of slow orbital rings. Research domains (the four labs)
 * sit on the inner orbit; the data sources and people they depend on sit further out.
 * Particles travel along curved links to suggest data and decisions flowing between
 * systems. The animation pauses off-screen and in hidden tabs, and draws one still
 * frame when the visitor prefers reduced motion.
 */
import { prefersReducedMotion } from './lib/dom.js';

const C = { ivory: '#eee9dd', teal: '#4fc1b5', cyan: '#86d9e6', blue: '#7593ff', green: '#79c98f', muted: '#8592a8' };

// Polar positions around the centre: angle (deg), radius (fraction of the half-size)
const NODES = [
  { id: 'ai', label: 'Applied AI', a: 0, r: 0, size: 10, color: C.ivory, kind: 'core' },
  { id: 'skyacres', label: 'Remote sensing', a: -140, r: 0.5, size: 8, color: C.teal, kind: 'lab' },
  { id: 'energy', label: 'Energy systems', a: -40, r: 0.52, size: 8, color: C.cyan, kind: 'lab' },
  { id: 'safety', label: 'Human oversight', a: 38, r: 0.5, size: 9, color: C.blue, kind: 'lab' },
  { id: 'agrione', label: 'Funding access', a: 142, r: 0.52, size: 8, color: C.green, kind: 'lab' },
  { id: 'sat', label: 'Satellite imagery', a: -118, r: 0.9, size: 3.5, color: C.muted, kind: 'source' },
  { id: 'grid', label: 'Grid telemetry', a: -62, r: 0.88, size: 3.5, color: C.muted, kind: 'source' },
  { id: 'ops', label: 'Operators', a: 14, r: 0.9, size: 3.5, color: C.muted, kind: 'source' },
  { id: 'people', label: 'Human decisions', a: 82, r: 0.86, size: 3.5, color: C.muted, kind: 'source' },
  { id: 'farmers', label: 'Farmer interviews', a: 120, r: 0.9, size: 3.5, color: C.muted, kind: 'source' },
  { id: 'pipes', label: 'Data pipelines', a: 180, r: 0.82, size: 3.5, color: C.muted, kind: 'source' },
];
const EDGES = [
  ['ai', 'skyacres'], ['ai', 'energy'], ['ai', 'safety'], ['ai', 'agrione'],
  ['skyacres', 'energy', 0.35], ['energy', 'safety', 0.35], ['safety', 'agrione', 0.35], ['agrione', 'skyacres', 0.35],
  ['sat', 'skyacres'], ['grid', 'energy'], ['ops', 'safety'], ['people', 'safety'], ['people', 'agrione'], ['farmers', 'agrione'], ['pipes', 'skyacres'], ['pipes', 'agrione'],
];

export function mountHeroNetwork(canvas, labs) {
  if (!canvas) return () => {};
  const ctx = canvas.getContext('2d');
  const still = prefersReducedMotion();
  let w = 0, h = 0, raf = 0, visible = true, hover = null, last = 0, time = 0;
  const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));
  const particles = EDGES.flatMap((e, k) => Array.from({ length: e[2] ? 1 : 2 }, (_, j) => ({ e, t: (j / 2 + k * 0.173) % 1, speed: 0.06 + ((k * 7 + j * 3) % 5) * 0.012 })));
  const pulses = [];

  const geo = () => ({ cx: w / 2, cy: h / 2 + 6, R: Math.min(w, h) / 2 - 34 });
  function pos(n) {
    const { cx, cy, R } = geo();
    const drift = still ? 0 : Math.sin(time * 0.6 + n.a) * 2.2;
    const ang = (n.a * Math.PI) / 180;
    return { x: cx + Math.cos(ang) * n.r * R * 1.08, y: cy + Math.sin(ang) * n.r * R + drift };
  }
  // Curved link: the control point bends away from the centre
  function curve(e) {
    const a = pos(byId[e[0]]), b = pos(byId[e[1]]);
    const { cx, cy } = geo();
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const bend = e[2] ?? 0.12;
    return { a, b, c: { x: mx + (mx - cx) * bend, y: my + (my - cy) * bend } };
  }
  const at = ({ a, b, c }, t) => ({
    x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t ** 2 * b.x,
    y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t ** 2 * b.y,
  });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    w = rect.width; h = rect.height;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(0);
  }

  function draw(dt) {
    time += dt;
    ctx.clearRect(0, 0, w, h);
    const { cx, cy, R } = geo();

    // Orbital rings with slowly turning tick marks
    for (const [rr, alpha, ticks] of [[0.5, 0.16, 48], [0.88, 0.1, 96]]) {
      ctx.strokeStyle = `rgba(134,217,230,${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(cx, cy, rr * R * 1.08, rr * R, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = `rgba(134,217,230,${alpha * 1.6})`;
      const rot = still ? 0 : time * (rr < 0.6 ? 0.03 : -0.015);
      for (let k = 0; k < ticks; k++) {
        const ang = rot + (k / ticks) * Math.PI * 2;
        ctx.fillRect(cx + Math.cos(ang) * rr * R * 1.08 - 0.5, cy + Math.sin(ang) * rr * R - 0.5, 1.2, 1.2);
      }
    }
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.45);
    g.addColorStop(0, 'rgba(238,233,221,0.10)'); g.addColorStop(1, 'rgba(238,233,221,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 0.45, 0, Math.PI * 2); ctx.fill();

    const lit = (e) => hover && (e[0] === hover.id || e[1] === hover.id);
    for (const e of EDGES) {
      const cv = curve(e);
      const outer = byId[e[0]].kind === 'source' || byId[e[1]].kind === 'source';
      ctx.strokeStyle = lit(e) ? 'rgba(134,217,230,0.7)' : outer ? 'rgba(133,146,168,0.16)' : 'rgba(117,147,255,0.24)';
      ctx.lineWidth = lit(e) ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(cv.a.x, cv.a.y); ctx.quadraticCurveTo(cv.c.x, cv.c.y, cv.b.x, cv.b.y); ctx.stroke();
    }
    for (const p of particles) {
      if (!still) p.t = (p.t + p.speed * dt) % 1;
      const pt = at(curve(p.e), p.t);
      const on = lit(p.e);
      const fade = Math.sin(p.t * Math.PI);
      ctx.fillStyle = on ? `rgba(134,217,230,${0.5 + fade * 0.5})` : `rgba(79,193,181,${0.25 + fade * 0.55})`;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, on ? 2.2 : 1.5, 0, Math.PI * 2); ctx.fill();
    }

    if (!still && Math.random() < dt * 0.5) {
      const labNodes = NODES.filter((n) => n.kind === 'lab');
      pulses.push({ n: labNodes[Math.floor(Math.random() * labNodes.length)], t: 0 });
    }
    for (let i = pulses.length - 1; i >= 0; i--) {
      const pu = pulses[i]; pu.t += dt * 0.6;
      if (pu.t > 1) { pulses.splice(i, 1); continue; }
      const p = pos(pu.n);
      ctx.strokeStyle = hexA(pu.n.color, (1 - pu.t) * 0.5);
      ctx.beginPath(); ctx.arc(p.x, p.y, pu.n.size + pu.t * 26, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.textBaseline = 'middle';
    for (const n of NODES) {
      const { x, y } = pos(n);
      const isHover = hover === n;
      if (n.kind !== 'source') {
        const halo = ctx.createRadialGradient(x, y, 0, x, y, n.size * 4);
        halo.addColorStop(0, hexA(n.color, isHover ? 0.45 : 0.25)); halo.addColorStop(1, hexA(n.color, 0));
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, n.size * 4, 0, Math.PI * 2); ctx.fill();
      }
      if (n.kind === 'lab') {
        ctx.strokeStyle = hexA(n.color, isHover ? 0.8 : 0.35);
        ctx.beginPath(); ctx.arc(x, y, n.size + (isHover ? 8 : 5), 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = n.color;
      ctx.beginPath(); ctx.arc(x, y, n.size * (isHover ? 1.15 : 1), 0, Math.PI * 2); ctx.fill();

      const big = n.kind !== 'source';
      const narrow = w < 520;
      if (narrow && !big) continue; // keep small screens legible: data-source labels hidden
      ctx.font = n.kind === 'core' ? `400 ${narrow ? 16 : 19}px Newsreader, Georgia, serif` : big ? `500 ${narrow ? 11.5 : 13}px "Public Sans", system-ui, sans-serif` : '400 11.5px "Public Sans", system-ui, sans-serif';
      ctx.fillStyle = big ? C.ivory : C.muted;
      const label = isHover && n.kind === 'lab' ? `${n.label}: open lab` : n.label;
      const tw = ctx.measureText(label).width;
      let lx, ly = y;
      if (n.kind === 'core') { lx = x - tw / 2; ly = narrow ? y - n.size - 16 : y + n.size + 18; }
      else {
        const right = Math.cos((n.a * Math.PI) / 180) >= -0.05;
        lx = right ? x + n.size + (big ? 14 : 8) : x - n.size - (big ? 14 : 8) - tw;
      }
      ctx.fillText(label, Math.max(4, Math.min(w - tw - 4, lx)), ly);
    }
  }

  function loop(ts) {
    const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;
    draw(dt);
    if (visible && !document.hidden) raf = requestAnimationFrame(loop);
    else { raf = 0; last = 0; }
  }
  const start = () => { if (!still && !raf && visible && !document.hidden) raf = requestAnimationFrame(loop); };

  function nodeAt(e) {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    return NODES.find((n) => { const p = pos(n); return n.kind !== 'source' && Math.hypot(p.x - mx, p.y - my) < n.size + 16; }) || null;
  }
  const onMove = (e) => {
    const n = nodeAt(e);
    if (n !== hover) { hover = n; canvas.style.cursor = n?.kind === 'lab' ? 'pointer' : 'default'; if (still) draw(0); }
  };
  const onLeave = () => { hover = null; if (still) draw(0); };
  const onClick = (e) => { const n = nodeAt(e); if (n?.kind === 'lab' && labs.some((l) => l.id === n.id)) location.hash = `#/lab/${n.id}`; };
  const onVis = () => start();

  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; start(); });
  io.observe(canvas);
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('click', onClick);
  document.addEventListener('visibilitychange', onVis);
  document.fonts?.ready.then(() => draw(0));
  resize();
  start();

  return () => {
    cancelAnimationFrame(raf);
    io.disconnect(); ro.disconnect();
    document.removeEventListener('visibilitychange', onVis);
  };
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`;
}
