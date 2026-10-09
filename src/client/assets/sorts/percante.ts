// Flèche perçante : trait vert pâle qui traverse la ligne.
import { BG, arrowSvg, icon } from '../kit';
import type { SpellArt } from '../types';

export const percante: SpellArt = {
  icon: icon(`<path d="M8 40 Q32 30 56 24" stroke="#d6ffb0" stroke-width="6" opacity=".35" fill="none"/>${arrowSvg(10, 44, 56, 22)}<circle cx="44" cy="27" r="7" fill="none" stroke="#e9ffd0" stroke-width="2"/>`, BG.nature),
  shot: { color: 0xb8ffb0, speed: 26, big: true },
};
