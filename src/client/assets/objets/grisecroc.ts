// Croc de Grisecroc : grand croc de l'alpha, gravé de runes, sur fond d'or (objet rare).
import { BG, icon } from '../kit';
import type { ItemArt } from '../types';

export const grisecroc: ItemArt = {
  icon: icon(`<path d="M16 6 Q52 10 50 32 Q46 48 28 60 Q36 42 30 30 Q24 18 16 6z" fill="#f4ecd6"/><path d="M16 6 Q30 12 34 26" stroke="#b8ac90" stroke-width="2" fill="none"/><path d="M38 22 l4 4 M36 32 l5 2 M33 41 l5 0" stroke="#a8241a" stroke-width="2.5" stroke-linecap="round"/><circle cx="46" cy="14" r="3" fill="#fff6c8"/>`, BG.or),
};
