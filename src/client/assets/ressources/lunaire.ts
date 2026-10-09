// Touffe de lunaire : feuilles fines et fleurs bleu pâle luisantes.
import { Cone, Ico } from '../kit';
import { rng } from '../../../shared/rng';
import type { NodeArt } from '../types';

export const lunaire: NodeArt = {
  glow: 0x7fd0ff, glowY: 0.35, labelY: 0.75,
  build(b) {
    const r = rng(7);
    for (let k = 0; k < 7; k++) b.add(Cone(0.03, 0.3, 3), 0x3f7a35, (r() - 0.5) * 0.22, 0.14, (r() - 0.5) * 0.22, { rot: [(r() - 0.5) * 0.6, 0, (r() - 0.5) * 0.6] });
    for (const [a, y, c] of [[0, 0.32, 0], [0.08, 0.27, 0.05], [-0.07, 0.25, -0.04], [0.02, 0.24, -0.08]]) b.add(Ico(0.05), 0x9fd8ff, a, y, c, { emissive: true });
  },
};
