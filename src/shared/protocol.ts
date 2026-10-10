// Messages échangés entre le navigateur et le serveur (JSON sur WebSocket).

import type { SpellId, Slot } from './data';

export type Race = 'elfe' | 'humain';

export type AuthMsg =
  | { t: 'auth'; mode: 'login'; account: string; password: string }
  | { t: 'auth'; mode: 'register'; account: string; password: string; name: string; race: Race };

export type ClientMsg =
  | AuthMsg
  | { t: 'input'; seq: number; mx: number; mz: number }
  | { t: 'target'; id: number | null }
  | { t: 'cast'; spell: SpellId; mx?: number; mz?: number }
  | { t: 'use'; item: 'potPV' | 'potMP' }
  | { t: 'harvest'; id: number }
  | { t: 'craft'; recipe: string }
  | { t: 'equip'; item: string }
  | { t: 'unequip'; slot: Slot }
  | { t: 'upgrade'; spell: SpellId }
  | { t: 'resetSpells' }
  | { t: 'chat'; text: string }
  | { t: 'ami'; name: string; add: boolean };

/** Entité visible sur la carte, envoyée 20 fois par seconde. */
export interface EntSnap {
  id: number;
  k: 'p' | 'm' | 'l' | 'n';
  x: number;
  z: number;
  /** p : race · m : type de monstre · n : type de ressource */
  s?: string;
  name?: string;
  lv?: number;
  hp?: number;
  mhp?: number;
  /** direction regardée (radians) */
  f?: number;
  /** drapeaux : 1 mort, 2 immobilisé, 4 marqué, 8 en combat, 16 ressource épuisée */
  fl?: number;
  tg?: number;
  /** p : équipement porté, pour dessiner les pièces sur le personnage */
  eq?: Partial<Record<Slot, string>>;
}

export interface SelfState {
  id: number;
  name: string;
  race: Race;
  level: number;
  xp: number;
  xpNext: number;
  hp: number; mhp: number;
  sh: number; msh: number;
  mp: number; mmp: number;
  ecus: number;
  dmg: [number, number];
  crit: number;
  speed: number;
  cds: Partial<Record<SpellId | 'potPV' | 'potMP', number>>;
  inv: Record<string, number>;
  equip: Partial<Record<Slot, string>>;
  /** rang de chaque sort (1 à 5) et points de sort à dépenser */
  ranks: Partial<Record<SpellId, number>>;
  points: number;
  target: number | null;
  harvesting: { id: number; t: number; total: number } | null;
  dead: number;
}

export type GameEvent =
  | { e: 'shot'; from: number; to: number; spell?: SpellId; tx?: number; tz?: number }
  | { e: 'dmg'; id: number; n: number; crit?: boolean; heal?: boolean; shield?: boolean }
  | { e: 'die'; id: number }
  | { e: 'tele'; x: number; z: number; r: number; dur: number }
  | { e: 'aoe'; x: number; z: number; r: number; kind: 'pluie' | 'piege' | 'ruee' }
  | { e: 'trap'; id: number; x: number; z: number; on: boolean }
  | { e: 'dash'; id: number; x0: number; z0: number; x1: number; z1: number }
  | { e: 'levelup'; id: number; level: number }
  | { e: 'loot'; item: string; n: number }
  | { e: 'msg'; text: string; c?: 'm' | 'g' | 's' | 'w' | 'n' };

/** Un personnage tel que le voient les autres : fenêtre des amis et des joueurs connectés. */
export interface JoueurInfo {
  name: string;
  race: Race;
  /** voie (classe) du personnage */
  voie: string;
  level: number;
  online: boolean;
  /** carte où il se trouve, s'il est connecté */
  map?: string;
  coords?: [number, number];
}

/** Ami gardé dans la sauvegarde : le dernier niveau connu sert quand il est hors ligne. */
export interface AmiSave { name: string; race: Race; level: number }

/** Ce qui est écrit sur disque pour retrouver un personnage là où il était. */
export interface SaveData {
  v: 1;
  map: string;
  x: number;
  z: number;
  level: number;
  xp: number;
  ecus: number;
  hp: number;
  mp: number;
  inv: Record<string, number>;
  equip: Partial<Record<Slot, string>>;
  ranks: Partial<Record<SpellId, number>>;
  amis?: AmiSave[];
}

export type ServerMsg =
  | { t: 'auth'; ok: boolean; error?: string }
  | { t: 'kicked'; reason: string }
  | { t: 'welcome'; you: number }
  | { t: 'map'; map: string; x: number; z: number }
  | { t: 'snap'; tick: number; ack: number; ents: EntSnap[] }
  | { t: 'self'; s: SelfState }
  | { t: 'ev'; ev: GameEvent[] }
  | { t: 'chat'; from: string; text: string }
  | { t: 'social'; online: JoueurInfo[]; amis: JoueurInfo[] };
