// Frêne à récolter : tronc clair, feuillage vert tendre, entaille dorée.
import { Box, Cyl, Ico } from '../kit';
import { rng } from '../../../shared/rng';
import type { NodeArt } from '../types';

export const frene: NodeArt = {
  glow: 0xd8ff90, glowY: 1.2, labelY: 2.0,
  build(b) {
    const r = rng(7);
    b.add(Cyl(0.08, 0.13, 0.9, 6), 0xc8b89a, 0, 0.45, 0);
    for (const [x, y, z, rad] of [[0, 1.25, 0, 0.45], [0.28, 1.05, 0.1, 0.32], [-0.26, 1.08, -0.05, 0.34], [0, 1.55, 0, 0.28]])
      b.add(Ico(rad), [0x8ab84a, 0x9cc858, 0x7aa83e][Math.floor(r() * 3)], x, y, z, { rot: [r(), r(), r()] });
    b.add(Box(0.22, 0.04, 0.04), 0xe0c070, 0.12, 0.42, 0.12, { rot: [0, 0.6, 0] });
  },
};
