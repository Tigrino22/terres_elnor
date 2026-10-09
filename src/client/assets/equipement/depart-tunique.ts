// Tenue de départ, aux couleurs du peuple, portée quand l'emplacement Torse est vide.

import { Box, Cyl, Sph } from '../kit';
import type { WearArt } from '../types';

export const departTunique: WearArt = {
  wear(b, r) {
    const leather = 0x7a5532;
    b.add(Cyl(0.15, 0.22, 0.36, 9), r.tunic, 0, 0.62, 0);
    b.add(Cyl(0.162, 0.162, 0.045, 9), leather, 0, 0.53, 0);
    b.add(Box(0.05, 0.04, 0.02), 0xd9b44a, 0, 0.53, 0.16);
    b.add(Cyl(0.18, 0.15, 0.22, 9), r.tunic2, 0, 0.84, 0);
    b.add(Cyl(0.1, 0.19, 0.06, 9), r.collar, 0, 0.95, 0);
    for (const sx of [-1, 1]) b.add(Sph(0.075, 8, 6), leather, sx * 0.19, 0.92, 0);
    b.add(Cyl(0.038, 0.042, 0.34), r.tunic2, 0.17, 0.9, 0.16, { rot: [Math.PI / 2, 0, -0.1] });
    b.add(Cyl(0.038, 0.042, 0.3), r.tunic2, -0.12, 0.92, 0.07, { rot: [Math.PI / 2 - 0.3, 0, 0.9] });
  },
};
