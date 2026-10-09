// Pluie de traits : volées bleu glacé qui tombent sur la zone.
import { BG, arrowSvg, icon } from '../kit';
import type { SpellArt } from '../types';

export const pluie: SpellArt = {
  icon: icon([14, 28, 42].map((x, k) => arrowSvg(x + 6, 6 + k * 3, x, 48 + (k % 2) * 6)).join('') + `<ellipse cx="32" cy="56" rx="22" ry="4" fill="#0006"/>`, BG.vent),
  ground: 0x9fe8ff,
};
