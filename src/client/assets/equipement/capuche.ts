// Capuche de rôdeur : peau grise doublée de vert, avec une courte pèlerine sur les épaules.

import { BG, Cap, Cone, Cyl, icon } from '../kit';
import type { ItemArt } from '../types';

export const capuche: ItemArt = {
  icon: icon(`<path d="M12 52 Q14 14 32 10 Q50 14 52 52 Q42 40 32 40 Q22 40 12 52z" fill="#6f7882"/><path d="M22 44 Q32 22 42 44" fill="#1a1410"/><path d="M14 50 Q32 36 50 50" stroke="#4f8a3c" stroke-width="3" fill="none"/><path d="M32 10 Q44 14 48 30" stroke="#9aa3ac" stroke-width="2" fill="none"/>`, BG.pierre),
  hidesHair: true,
  wear(b) {
    const grey = 0x6f7882, lining = 0x3f6b33;
    b.add(Cap(0.152, 0.6, 12, 8), grey, 0, 1.1, -0.02, { rot: [-0.45, 0, 0] });
    b.add(Cone(0.07, 0.16, 6), grey, 0, 1.17, -0.15, { rot: [-2.2, 0, 0] });
    b.add(Cyl(0.13, 0.135, 0.02, 12), lining, 0, 1.12, 0.055, { rot: [1.15, 0, 0] });
    b.add(Cyl(0.13, 0.22, 0.1, 10), grey, 0, 0.95, 0);
  },
};
