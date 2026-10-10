// Arc de départ, porté quand l'emplacement Arme est vide.

import type { WearArt } from '../types';
import { drawBow } from './arc-forme';

export const departArc: WearArt = {
  wear(b) { drawBow(b, { wood: 0x6e4322 }); },
};
