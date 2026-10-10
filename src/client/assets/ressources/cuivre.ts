// Filon de cuivre : rocher gris hérissé de cristaux cuivrés lumineux.
import { Dodeca, Octa } from '../kit';
import { rng } from '../../../shared/rng';
import type { NodeArt } from '../types';

export const cuivre: NodeArt = {
  glow: 0xff9a50, glowY: 0.35, labelY: 0.75,
  build(b) {
    const r = rng(7);
    b.add(Dodeca(0.34), 0x77736b, 0, 0.18, 0, { scale: [1.3, 0.85, 1.1], rot: [0.3, 0.5, 0.1] });
    b.add(Dodeca(0.2), 0x6a665f, 0.3, 0.1, 0.15, { rot: [0.4, 0.1, 0.7] });
    for (let k = 0; k < 6; k++) b.add(Octa(0.07 + r() * 0.05), 0xe0874a, (r() - 0.5) * 0.45, 0.3 + r() * 0.15, (r() - 0.5) * 0.35, { scale: [0.7, 1.6, 0.7], rot: [r() - 0.5, 0, r() - 0.5], emissive: true });
  },
};
