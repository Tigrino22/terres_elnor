// Tir précis : une flèche dorée, grosse traînée.
import { BG, arrowSvg, icon } from '../kit';
import type { SpellArt } from '../types';

export const tir: SpellArt = {
  icon: icon(arrowSvg(14, 50, 52, 12), BG.bois),
  shot: { color: 0xffd27a, speed: 24, big: true },
};
