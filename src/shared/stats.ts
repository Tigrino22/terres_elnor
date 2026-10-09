// Formules de progression : niveau, statistiques de base, bonus d'équipement.

import { ITEMS, Slot } from './data';

export const MAX_LEVEL = 20;
export const TICK_RATE = 20;
export const DT = 1 / TICK_RATE;
export const AUTO_RANGE = 6.5;
export const AUTO_EVERY = 0.9;
export const BASE_SPEED = 4.2;

export const xpNext = (level: number) => Math.round(80 * Math.pow(level, 1.7));

export interface Stats { mhp: number; msh: number; mmp: number; dmg: [number, number]; crit: number; speed: number }

export function computeStats(level: number, equip: Partial<Record<Slot, string>>): Stats {
  const l = level - 1;
  const s: Stats = {
    mhp: 220 + 45 * l,
    msh: 60 + 12 * l,
    mmp: 120 + 18 * l,
    dmg: [16 + 4 * l, 22 + 5 * l],
    crit: 0.08,
    speed: BASE_SPEED,
  };
  for (const id of Object.values(equip)) {
    const b = id ? ITEMS[id]?.bonus : undefined;
    if (!b) continue;
    s.mhp += b.pv ?? 0;
    s.msh += b.bouclier ?? 0;
    s.mmp += b.mana ?? 0;
    s.dmg = [s.dmg[0] + (b.dmg ?? 0), s.dmg[1] + (b.dmg ?? 0)];
    s.crit += (b.crit ?? 0) / 100;
    s.speed *= 1 + (b.vitesse ?? 0);
  }
  return s;
}

/** XP réduite quand le monstre est bien plus faible que le joueur. */
export function xpFactor(playerLevel: number, mobLevel: number) {
  const d = playerLevel - mobLevel;
  return d >= 6 ? 0.1 : d >= 4 ? 0.4 : d >= 2 ? 0.75 : 1;
}
