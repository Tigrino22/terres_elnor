// Rangs des sorts : chaque niveau gagné donne un point de sort, qui monte un sort d'un rang.
// Les effets de chaque rang sont calculés ici pour que serveur et interface affichent les mêmes chiffres.

import { SPELLS, SpellId } from './data';

export const MAX_RANK = 5;
export type Ranks = Partial<Record<SpellId, number>>;

const def = (id: SpellId) => SPELLS.find(s => s.id === id)!;

/** Niveau du personnage requis pour atteindre ce rang (rang 1 = déblocage du sort). */
export const rankLevel = (id: SpellId, rank: number) => def(id).level + 3 * (rank - 1);

export const rankOf = (ranks: Ranks, id: SpellId) => Math.min(MAX_RANK, Math.max(1, ranks[id] ?? 1));

export const spentPoints = (ranks: Ranks) => SPELLS.reduce((n, s) => n + rankOf(ranks, s.id) - 1, 0);

/** Un point par niveau gagné depuis le niveau 1. */
export const pointsLeft = (level: number, ranks: Ranks) => Math.max(0, level - 1 - spentPoints(ranks));

export interface SpellFx {
  mult: number;
  cd: number;
  mana: number;
  /** rayon de la Pluie de traits */
  radius: number;
  /** durée d'immobilisation du piège */
  root: number;
  /** longueur du bond */
  dash: number;
  /** bonus de dégâts de la marque et sa durée */
  mark: number;
  markDur: number;
}

export function spellFx(id: SpellId, rank: number): SpellFx {
  const s = def(id), k = Math.min(MAX_RANK, Math.max(1, rank)) - 1;
  const fx: SpellFx = { mult: s.mult * (1 + 0.15 * k), cd: s.cd, mana: s.mana, radius: 2.2, root: 3, dash: 4, mark: 0.25, markDur: 10 };
  switch (id) {
    case 'tir': fx.cd = s.cd - 0.25 * k; break;
    case 'pluie': fx.radius = 2.2 + 0.2 * k; break;
    case 'piege': fx.root = 3 + 0.5 * k; break;
    case 'vent': fx.dash = 4 + 0.5 * k; fx.cd = s.cd - 0.75 * k; break;
    case 'marque': fx.mark = 0.25 + 0.05 * k; fx.markDur = 10 + 1.5 * k; break;
  }
  return fx;
}

const fr = (n: number) => (Math.round(n * 100) / 100).toString().replace('.', ',');
const pct = (n: number) => `${Math.round(n * 100)} %`;

/** Effets lisibles d'un rang, pour la fenêtre des sorts et les infobulles. */
export function fxLines(id: SpellId, rank: number): string[] {
  const f = spellFx(id, rank);
  switch (id) {
    case 'tir': return [`${pct(f.mult)} des dégâts de l’arc`, `recharge ${fr(f.cd)} s`];
    case 'percante': return [`${pct(f.mult)} des dégâts à chaque ennemi traversé`];
    case 'pluie': return [`3 volées de ${pct(f.mult)} des dégâts`, `zone de ${fr(f.radius)} cases`];
    case 'piege': return [`immobilise ${fr(f.root)} s`, `${pct(f.mult)} des dégâts`];
    case 'vent': return [`bond de ${fr(f.dash)} cases`, `recharge ${fr(f.cd)} s`];
    case 'marque': return [`+${pct(f.mark)} de dégâts subis`, `pendant ${fr(f.markDur)} s`];
  }
}
