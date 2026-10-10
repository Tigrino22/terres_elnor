// Arc de frêne renforcé : bois de frêne clair, pointes de cuivre, poignée de cuir.

import { BG, Cone, Cyl, icon } from '../kit';
import type { ItemArt } from '../types';
import { drawBow } from './arc-forme';

export const arcFrene: ItemArt = {
  icon: icon(`<path d="M18 8 Q50 32 18 56" stroke="#a8814e" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M18 8 Q50 32 18 56" stroke="#e0c08a" stroke-width="1.5" fill="none"/><line x1="18" y1="8" x2="18" y2="56" stroke="#f0ead8" stroke-width="1.5"/><circle cx="18" cy="8" r="3.5" fill="#e0874a"/><circle cx="18" cy="56" r="3.5" fill="#e0874a"/><rect x="31" y="27" width="5" height="10" rx="1.5" fill="#6b4423"/>`, BG.nature),
  wear(b) {
    const { top, bottom, grip } = drawBow(b, { wood: 0xc8a070 });
    for (const p of [top, bottom]) b.add(Cone(0.022, 0.06, 5), 0xe0874a, p[0], p[1], p[2]);
    b.add(Cyl(0.024, 0.024, 0.08, 6), 0x6b4423, grip[0], grip[1], grip[2]);
  },
};
