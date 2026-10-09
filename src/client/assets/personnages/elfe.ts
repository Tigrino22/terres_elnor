// Elfe de Sylvaë : peau claire, longue chevelure blonde, oreilles pointues, diadème d'or.

import { Cone, Cyl, THREE } from '../kit';
import type { RaceArt } from '../types';

export const elfe: RaceArt = {
  name: 'Elfe de Sylvaë',
  skin: 0xeccaa4, hair: 0xeadfae, eyes: 0x2e5f3a,
  trousers: 0x3c4a2e, cape: 0x2b4a2a,
  tunic: 0x5d9046, tunic2: 0x46733a, collar: 0x7cae55,
  head(b) {
    b.add(Cyl(0.085, 0.12, 0.34, 9), this.hair, 0, 0.95, -0.075, { rot: [0.12, 0, 0] });
    for (const sx of [-1, 1]) b.add(Cone(0.028, 0.15, 5), this.skin, sx * 0.14, 1.12, -0.01, { rot: [0, 0, -sx * (Math.PI / 2 - 0.45)] });
    b.add(new THREE.TorusGeometry(0.128, 0.008, 4, 20), 0xd8c070, 0, 1.13, 0, { rot: [Math.PI / 2 + 0.18, 0, 0] });
  },
};
