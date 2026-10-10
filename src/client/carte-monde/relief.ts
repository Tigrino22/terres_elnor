// Géographie calculée à partir de donnees.ts : quelles cases sont de la terre,
// à quelle zone chacune appartient, lesquelles sont encore sous la brume.
// Fonctions pures, sans navigateur : testables et utilisables côté serveur.

import { makeNoise } from '../../shared/rng';
import { EXPLORATION, FORME, GRILLE, ZONES, type Zone } from './donnees';

const bruitCote = makeNoise(31), bruitZones = makeNoise(77);

const dansEllipse = (x: number, y: number, c: readonly [number, number], r: readonly [number, number]) =>
  ((x - c[0]) / r[0]) ** 2 + ((y - c[1]) / r[1]) ** 2 < 1;

export function estTerre(x: number, y: number) {
  const e = ((x - FORME.centre[0]) / FORME.rayons[0]) ** 2 + ((y - FORME.centre[1]) / FORME.rayons[1]) ** 2
    + (bruitCote(x * 0.22 + 3, y * 0.22) - 0.5) * FORME.irregularite;
  return e < FORME.seuil && !FORME.trous.some(t => dansEllipse(x, y, t.centre, t.rayons));
}

/** Zone la plus proche, avec des frontières irrégulières. */
export function zoneDe(x: number, y: number): Zone {
  let best = ZONES[0], bd = Infinity;
  for (const z of ZONES) {
    const d = Math.hypot(x - z.centre[0], (y - z.centre[1]) * 1.15) + (bruitZones(x * 0.3 + z.centre[0], y * 0.3) - 0.5) * 4;
    if (d < bd) { bd = d; best = z; }
  }
  return best;
}

export function estDecouverte(x: number, y: number, z = zoneDe(x, y)) {
  if (z.decouverte >= 1) return true;
  if (z.decouverte <= 0) return false;
  return bruitCote(x * 0.5 + 9, y * 0.5 + 2) < z.decouverte + 0.25
    && Math.hypot(x - EXPLORATION.centre[0], y - EXPLORATION.centre[1]) < EXPLORATION.rayon;
}

export interface CaseTerre { x: number; y: number; zone: Zone }

/** Toutes les cases de terre de la grille, dans un ordre stable. */
export function casesDeTerre(): CaseTerre[] {
  const out: CaseTerre[] = [];
  for (let x = GRILLE.xMin; x <= GRILLE.xMax; x++) for (let y = GRILLE.yMin; y <= GRILLE.yMax; y++)
    if (estTerre(x, y)) out.push({ x, y, zone: zoneDe(x, y) });
  return out;
}

// ---------------------------------------------------------------- passage cases ↔ pixels du parchemin
export const px = (x: number) => GRILLE.marge.x + (x - GRILLE.xMin) * GRILLE.taille;
export const py = (y: number) => GRILLE.marge.y + (y - GRILLE.yMin) * GRILLE.taille;
/** Centre d'une case, en pixels. */
export const centre = (c: readonly [number, number]) => [px(c[0]) + GRILLE.taille / 2, py(c[1]) + GRILLE.taille / 2] as const;
/** Case sous un point du parchemin. */
export const caseSous = (X: number, Y: number) => [
  Math.floor((X - GRILLE.marge.x) / GRILLE.taille) + GRILLE.xMin,
  Math.floor((Y - GRILLE.marge.y) / GRILLE.taille) + GRILLE.yMin,
] as const;
