// Marque du chasseur : cible rouge-orangé.
import { BG, icon } from '../kit';
import type { SpellArt } from '../types';

export const marque: SpellArt = {
  icon: icon(`<circle cx="32" cy="32" r="18" fill="none" stroke="#ffd0a0" stroke-width="3"/><circle cx="32" cy="32" r="8" fill="none" stroke="#ffd0a0" stroke-width="3"/><path d="M32 6 V18 M32 46 V58 M6 32 H18 M46 32 H58" stroke="#fff2d8" stroke-width="3"/><circle cx="32" cy="32" r="3" fill="#ff5a3a"/>`, BG.feu),
  shot: { color: 0xff6a4a, speed: 24, big: false },
};
