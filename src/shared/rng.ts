// Générateurs pseudo-aléatoires déterministes : le serveur et le client
// produisent exactement la même carte à partir de la même graine.

export type Rng = () => number;

export function rng(seed: number): Rng {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeNoise(seed: number): (x: number, y: number) => number {
  const r = rng(seed);
  const p: number[] = [];
  for (let i = 0; i < 512; i++) p[i] = r();
  const h = (a: number, b: number) => p[(((a * 73856093) ^ (b * 19349663)) >>> 0) & 511];
  const s = (t: number) => t * t * (3 - 2 * t);
  const n = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = s(x - xi), yf = s(y - yi);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
  return (x, y) => n(x, y) * 0.6 + n(x * 2.1 + 17, y * 2.1 + 5) * 0.3 + n(x * 4.3 + 3, y * 4.3 + 11) * 0.1;
}

export const randInt = (r: Rng, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
