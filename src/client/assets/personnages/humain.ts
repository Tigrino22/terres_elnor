// Humain d'Aldmar : cheveux bruns courts, oreilles rondes, barbe courte.

import { Box, Cyl, Sph } from '../kit';
import type { RaceArt } from '../types';

export const humain: RaceArt = {
  name: 'Humain d’Aldmar',
  skin: 0xeccaa4, hair: 0x5a3a22, eyes: 0x3a2a1a,
  trousers: 0x4a3a2e, cape: 0x2e3550,
  tunic: 0x8a3a2a, tunic2: 0x6e2c20, collar: 0xb8a070,
  head(b) {
    b.add(Cyl(0.09, 0.1, 0.12, 9), this.hair, 0, 1.05, -0.06);
    for (const sx of [-1, 1]) b.add(Sph(0.03, 6, 5), this.skin, sx * 0.125, 1.09, 0);
    b.add(Box(0.12, 0.04, 0.03), this.hair, 0, 1.0, 0.1);
  },
};
