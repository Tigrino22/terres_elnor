// Corps commun à tous les personnages jouables, sans vêtement ni arme :
// jambes, cou, tête, yeux, mains et cape. Le peuple ajoute ses traits (personnages/<peuple>.ts),
// l'équipement s'ajoute par-dessus (equipement/<objet>.ts).

import { Box, Cap, Cyl, Sph, type Builder } from '../kit';
import type { RaceArt } from '../types';

export function drawBody(b: Builder, r: RaceArt, hairHidden: boolean) {
  for (const sx of [-1, 1]) b.add(Cyl(0.05, 0.055, 0.3), r.trousers, sx * 0.075, 0.34, 0);
  b.add(Cyl(0.045, 0.05, 0.06), r.skin, 0, 0.99, 0);
  b.add(Sph(0.125, 12, 10), r.skin, 0, 1.09, 0);
  if (!hairHidden) b.add(Cap(0.135, 0.52), r.hair, 0, 1.1, -0.012, { rot: [-0.35, 0, 0] });
  for (const sx of [-1, 1]) b.add(Sph(0.016, 6, 5), r.eyes, sx * 0.045, 1.1, 0.112);
  r.head(b);
  b.add(Box(0.34, 0.6, 0.02), r.cape, 0, 0.66, -0.19, { rot: [0.18, 0, 0] });
  // mains, placées pour tenir l'arc
  b.add(Sph(0.035, 6, 5), r.skin, 0.15, 0.9, 0.34);
  b.add(Sph(0.035, 6, 5), r.skin, 0, 0.93, 0.07);
}
