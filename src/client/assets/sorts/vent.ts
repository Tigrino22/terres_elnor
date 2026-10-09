// Pas du vent : bond, traînée d'air clair.
import { BG, icon } from '../kit';
import type { SpellArt } from '../types';

export const vent: SpellArt = {
  icon: icon(`<path d="M10 24 H40 a8 8 0 1 0 -8 -8 M10 34 H50 a7 7 0 1 1 -7 7 M10 44 H34" stroke="#f0ffff" stroke-width="4" fill="none" stroke-linecap="round"/>`, BG.vent),
  ground: 0xd8ffff,
};
