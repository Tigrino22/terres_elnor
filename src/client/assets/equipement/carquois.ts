// Carquois porté dans le dos, avec trois flèches. Toujours visible, quel que soit l'arc.

import { Cone, Cyl } from '../kit';
import type { WearArt } from '../types';

export const carquois: WearArt = {
  wear(b) {
    b.add(Cyl(0.05, 0.045, 0.38), 0x7a5532, -0.08, 0.86, -0.2, { rot: [0.25, 0, 0.45] });
    for (let k = 0; k < 3; k++) b.add(Cone(0.02, 0.07, 4), 0xf1ece0, -0.17 + k * 0.025, 1.05 + k * 0.01, -0.25, { rot: [0.25, 0, 0.45] });
  },
};
