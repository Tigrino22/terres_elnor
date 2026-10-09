// Arbre feuillu, en trois variantes de vert. Instancié en grand nombre : une géométrie par variante.
import { Builder, Cyl, Ico, cached } from '../kit';
import { rng } from '../../../shared/rng';

export const ARBRE_VARIANTES = 3;
const GREENS = [[0x3f6b2a, 0x4f8233, 0x365f24, 0x5b8c38], [0x4a7a2e, 0x5e9238, 0x3c6a28, 0x6a9a3e], [0x56702a, 0x6a8a30, 0x485e24, 0x7a9638]];

export const arbreGeo = (variant: number) => cached('arbre' + variant, () => {
  const r = rng(100 + variant), b = new Builder();
  b.add(Cyl(0.07, 0.12, 0.75, 6), 0x5b3b22, 0, 0.37, 0);
  b.add(Cyl(0.03, 0.05, 0.35, 5), 0x5b3b22, 0.12, 0.7, 0, { rot: [0, 0, -0.7] });
  const greens = GREENS[variant % 3];
  for (const [x, y, z, rad] of [[0, 1.15, 0, 0.48], [0.3, 0.95, 0.1, 0.36], [-0.28, 0.98, -0.05, 0.38], [0.05, 0.92, 0.32, 0.34], [-0.05, 1.45, -0.05, 0.32]])
    b.add(Ico(rad), greens[Math.floor(r() * 4)], x, y, z, { rot: [r(), r(), r()] });
  return b.bake();
});
