// Insigne gorrok : jeton de fer en forme d'écu, marqué d'une griffe rouge.
import { BG, icon } from '../kit';
import type { ItemArt } from '../types';

export const insigne: ItemArt = {
  icon: icon(`<path d="M16 12 H48 V32 Q48 48 32 56 Q16 48 16 32z" fill="#5a5854"/><path d="M20 16 H44 V32 Q44 45 32 51 Q20 45 20 32z" fill="#77736b"/><path d="M25 20 Q27 34 24 44 M32 20 Q34 34 31 46 M39 20 Q41 34 38 44" stroke="#a8241a" stroke-width="3.5" fill="none" stroke-linecap="round"/>`, BG.sang),
};
