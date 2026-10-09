// Bottes de cuir : montantes jusqu'au genou, revers clair et lacets.

import { BG, Box, Cyl, icon } from '../kit';
import type { ItemArt } from '../types';

export const bottes: ItemArt = {
  icon: icon(`<path d="M14 12 h14 v28 l12 6 v10 h-26z" fill="#5a3a22"/><path d="M34 12 h12 v30 l10 5 v9 h-22z" fill="#6b4728"/><rect x="14" y="12" width="14" height="5" fill="#a07850"/><rect x="34" y="12" width="12" height="5" fill="#a07850"/><path d="M17 22 h8 M17 27 h8 M37 22 h6 M37 27 h6" stroke="#e8d8b0" stroke-width="1.5"/>`, BG.bois),
  wear(b) {
    for (const sx of [-1, 1]) {
      b.add(Cyl(0.058, 0.068, 0.3, 7), 0x5a3a22, sx * 0.075, 0.15, 0.01);
      b.add(Cyl(0.068, 0.062, 0.05, 7), 0xa07850, sx * 0.075, 0.3, 0.01);
      b.add(Box(0.07, 0.04, 0.1), 0x4a2e1a, sx * 0.075, 0.02, 0.05);
    }
  },
};
