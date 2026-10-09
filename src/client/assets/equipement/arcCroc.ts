// Arc de Grisecroc : bois sombre plus grand, crocs de l'alpha aux extrémités, poignée rouge.

import { BG, Cone, Cyl, icon } from '../kit';
import type { ItemArt } from '../types';
import { drawBow } from './arc-forme';

export const arcCroc: ItemArt = {
  icon: icon(`<path d="M16 6 Q54 32 16 58" stroke="#3a2a24" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M16 6 Q54 32 16 58" stroke="#7a5a4a" stroke-width="1.5" fill="none"/><line x1="16" y1="6" x2="16" y2="58" stroke="#f0ead8" stroke-width="1.5"/><path d="M16 6 l-6 -2 l4 7z M16 58 l-6 2 l4 -7z M26 14 l6 -6 l-1 8z M26 50 l6 6 l-1 -8z" fill="#f0e8d0"/><rect x="32" y="27" width="6" height="10" rx="1.5" fill="#a8241a"/>`, BG.sang),
  wear(b) {
    const { top, bottom, grip } = drawBow(b, { wood: 0x3a2a24, radius: 0.38, thickness: 0.022 });
    b.add(Cone(0.025, 0.12, 4), 0xf0e8d0, top[0], top[1] + 0.04, top[2], { rot: [0.4, 0, 0] });
    b.add(Cone(0.025, 0.12, 4), 0xf0e8d0, bottom[0], bottom[1] - 0.04, bottom[2], { rot: [Math.PI - 0.4, 0, 0] });
    b.add(Cyl(0.026, 0.026, 0.09, 6), 0xa8241a, grip[0], grip[1], grip[2]);
  },
};
