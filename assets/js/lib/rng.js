/**
 * Seeded pseudo-random number generation.
 * Every simulation on the site uses a fixed seed so results are reproducible:
 * the same inputs always produce the same outputs, in any browser.
 */

/** Mulberry32 — small, fast, deterministic 32-bit PRNG. Returns floats in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal sample via Box–Muller. */
export function gaussian(rand) {
  let u = 0;
  while (u === 0) u = rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Smooth 2D value noise, used to texture the synthetic satellite scene. */
export function valueNoise2D(seed) {
  const rand = mulberry32(seed);
  const size = 256;
  const grid = new Float32Array(size * size).map(() => rand());
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  return function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = smooth(x - xi), yf = smooth(y - yi);
    const at = (i, j) => grid[((j & 255) * size) + (i & 255)];
    return lerp(lerp(at(xi, yi), at(xi + 1, yi), xf), lerp(at(xi, yi + 1), at(xi + 1, yi + 1), xf), yf);
  };
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
