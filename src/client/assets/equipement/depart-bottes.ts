// Chaussures de départ, portées quand l'emplacement Pieds est vide.

import { Cyl } from '../kit';
import type { WearArt } from '../types';

export const departBottes: WearArt = {
  wear(b) { for (const sx of [-1, 1]) b.add(Cyl(0.055, 0.065, 0.2), 0x4a3220, sx * 0.075, 0.1, 0.01); },
};
