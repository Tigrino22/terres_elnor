// Données de jeu de la V1 : objets, recettes, monstres, sorts et cartes.
// Tout ce qui est équilibrage vit ici pour être modifié sans toucher au moteur.
// L'apparence de chaque élément (modèle 3D, icône) est dans src/client/assets, un fichier par élément.

export type Rarity = 'commun' | 'peu-commun' | 'rare' | 'epique';
export type Slot = 'arme' | 'tete' | 'torse' | 'pieds';

export interface ItemDef {
  name: string;
  rarity: Rarity;
  kind: 'ressource' | 'consommable' | 'equipement';
  desc: string;
  price: number;
  slot?: Slot;
  bonus?: { dmg?: number; pv?: number; bouclier?: number; mana?: number; vitesse?: number; crit?: number };
}

export const ITEMS: Record<string, ItemDef> = {
  bois: { name: 'Bois de frêne', rarity: 'commun', kind: 'ressource', desc: 'Bois souple, idéal pour les arcs.', price: 3 },
  cuivre: { name: 'Minerai de cuivre', rarity: 'commun', kind: 'ressource', desc: 'Se fond en lingot à l’atelier.', price: 3 },
  lingot: { name: 'Lingot de cuivre', rarity: 'commun', kind: 'ressource', desc: 'Trois minerais fondus ensemble.', price: 12 },
  lunaire: { name: 'Lunaire', rarity: 'commun', kind: 'ressource', desc: 'Fleur bleue qui pousse à l’ombre des frênes.', price: 4 },
  cuir: { name: 'Cuir de sanglier', rarity: 'commun', kind: 'ressource', desc: 'Épais et solide.', price: 4 },
  viande: { name: 'Viande de sanglier', rarity: 'commun', kind: 'ressource', desc: 'Se cuisine en ragoût.', price: 2 },
  croc: { name: 'Croc de loup', rarity: 'commun', kind: 'ressource', desc: 'Pointe parfaite pour les flèches.', price: 5 },
  peau: { name: 'Peau grise', rarity: 'peu-commun', kind: 'ressource', desc: 'Fourrure des loups des brumes.', price: 8 },
  insigne: { name: 'Insigne gorrok', rarity: 'peu-commun', kind: 'ressource', desc: 'Marque des éclaireurs du Couchant.', price: 10 },
  grisecroc: { name: 'Croc de Grisecroc', rarity: 'rare', kind: 'ressource', desc: 'Butin du chef de meute de la Lisière.', price: 60 },
  potPV: { name: 'Potion de soin', rarity: 'commun', kind: 'consommable', desc: 'Rend 40 % des PV.', price: 10 },
  potMP: { name: 'Potion de mana', rarity: 'commun', kind: 'consommable', desc: 'Rend 40 % du mana.', price: 10 },
  arcFrene: { name: 'Arc de frêne renforcé', rarity: 'peu-commun', kind: 'equipement', slot: 'arme', desc: 'Un arc solide de rôdeur.', price: 40, bonus: { dmg: 8 } },
  arcCroc: { name: 'Arc de Grisecroc', rarity: 'rare', kind: 'equipement', slot: 'arme', desc: 'Les crocs de l’alpha ornent ses branches.', price: 160, bonus: { dmg: 18, crit: 5 } },
  capuche: { name: 'Capuche de rôdeur', rarity: 'peu-commun', kind: 'equipement', slot: 'tete', desc: 'Tissée de peau grise.', price: 30, bonus: { pv: 80, bouclier: 20 } },
  tunique: { name: 'Tunique de cuir', rarity: 'peu-commun', kind: 'equipement', slot: 'torse', desc: 'Cuir de sanglier cousu double.', price: 30, bonus: { pv: 120 } },
  bottes: { name: 'Bottes de cuir', rarity: 'commun', kind: 'equipement', slot: 'pieds', desc: 'Légères et silencieuses.', price: 20, bonus: { pv: 40, vitesse: 0.08 } },
};

export interface Recipe { id: string; out: string; qty: number; needs: Record<string, number>; level: number; cost: number }
export const RECIPES: Recipe[] = [
  { id: 'lingot', out: 'lingot', qty: 1, needs: { cuivre: 3 }, level: 1, cost: 0 },
  { id: 'potPV', out: 'potPV', qty: 2, needs: { lunaire: 2, viande: 1 }, level: 1, cost: 2 },
  { id: 'potMP', out: 'potMP', qty: 2, needs: { lunaire: 3 }, level: 1, cost: 2 },
  { id: 'bottes', out: 'bottes', qty: 1, needs: { cuir: 3, lunaire: 1 }, level: 2, cost: 10 },
  { id: 'tunique', out: 'tunique', qty: 1, needs: { cuir: 5, bois: 2 }, level: 3, cost: 20 },
  { id: 'arcFrene', out: 'arcFrene', qty: 1, needs: { bois: 6, lingot: 2, croc: 3 }, level: 4, cost: 30 },
  { id: 'capuche', out: 'capuche', qty: 1, needs: { peau: 4, lunaire: 2 }, level: 5, cost: 30 },
  { id: 'arcCroc', out: 'arcCroc', qty: 1, needs: { grisecroc: 1, bois: 8, lingot: 4, peau: 3 }, level: 8, cost: 120 },
];

export interface LootRoll { item: string; chance: number; min: number; max: number }
export interface MobDef {
  name: string;
  level: number;
  hp: number;
  dmg: [number, number];
  atkEvery: number;
  range: number;
  speed: number;
  aggro: number; // 0 = passif tant qu'on ne l'attaque pas
  xp: number;
  ecus: [number, number];
  loot: LootRoll[];
  respawn: number;
  radius: number;
  special?: { kind: 'ruee'; every: number; windup: number; radius: number; dmg: number };
}

export const MOBS: Record<string, MobDef> = {
  sanglier: {
    name: 'Sanglier des plaines', level: 2, hp: 130, dmg: [8, 12], atkEvery: 1.6, range: 1.1, speed: 2.6, aggro: 0, xp: 30, ecus: [2, 5],
    loot: [{ item: 'viande', chance: 0.7, min: 1, max: 2 }, { item: 'cuir', chance: 0.55, min: 1, max: 1 }], respawn: 18, radius: 0.4,
  },
  gorrok: {
    name: 'Éclaireur gorrok', level: 4, hp: 240, dmg: [14, 20], atkEvery: 1.5, range: 1.2, speed: 2.9, aggro: 4.5, xp: 62, ecus: [5, 10],
    loot: [{ item: 'insigne', chance: 0.5, min: 1, max: 1 }, { item: 'potPV', chance: 0.15, min: 1, max: 1 }], respawn: 25, radius: 0.35,
  },
  loup: {
    name: 'Loup des brumes', level: 6, hp: 360, dmg: [20, 28], atkEvery: 1.4, range: 1.2, speed: 3.3, aggro: 5, xp: 96, ecus: [6, 12],
    loot: [{ item: 'croc', chance: 0.65, min: 1, max: 2 }, { item: 'peau', chance: 0.4, min: 1, max: 1 }], respawn: 22, radius: 0.4,
  },
  alpha: {
    name: 'Grisecroc, l’alpha', level: 10, hp: 2400, dmg: [38, 52], atkEvery: 1.6, range: 1.5, speed: 3.4, aggro: 6, xp: 900, ecus: [60, 90],
    loot: [{ item: 'grisecroc', chance: 1, min: 1, max: 1 }, { item: 'peau', chance: 1, min: 2, max: 3 }, { item: 'potPV', chance: 0.5, min: 1, max: 2 }], respawn: 60, radius: 0.6,
    special: { kind: 'ruee', every: 8, windup: 1.3, radius: 2.2, dmg: 140 },
  },
};

export type SpellId = 'tir' | 'percante' | 'pluie' | 'piege' | 'vent' | 'marque';
export interface SpellDef { id: SpellId; name: string; mana: number; cd: number; range: number; mult: number; desc: string; needsTarget: boolean; level: number }
export const SPELLS: SpellDef[] = [
  { id: 'tir', name: 'Tir précis', mana: 15, cd: 5, range: 7.5, mult: 2.2, desc: 'Gros dégâts sur la cible.', needsTarget: true, level: 1 },
  { id: 'percante', name: 'Flèche perçante', mana: 25, cd: 8, range: 8, mult: 1.6, desc: 'Traverse tous les ennemis en ligne.', needsTarget: false, level: 2 },
  { id: 'pluie', name: 'Pluie de traits', mana: 40, cd: 12, range: 7.5, mult: 0.8, desc: 'Trois volées sur une zone.', needsTarget: false, level: 3 },
  { id: 'piege', name: 'Piège de ronces', mana: 30, cd: 15, range: 0, mult: 1.0, desc: 'Immobilise les ennemis 3 s.', needsTarget: false, level: 4 },
  { id: 'vent', name: 'Pas du vent', mana: 15, cd: 8, range: 0, mult: 0, desc: 'Bond de 4 cases.', needsTarget: false, level: 1 },
  { id: 'marque', name: 'Marque du chasseur', mana: 20, cd: 18, range: 9, mult: 0, desc: 'La cible subit +25 % de dégâts 10 s.', needsTarget: true, level: 5 },
];

export type Edge = 'N' | 'S' | 'E' | 'W';
export interface PortalDef { edge: Edge; at: number; to: string | null; label: string }
export interface MobGroup { kind: string; i: number; j: number; count: number }
export interface NodeDef { kind: 'frene' | 'cuivre' | 'lunaire'; i: number; j: number }
export interface MapDef {
  id: string;
  name: string;
  zone: string;
  coords: [number, number];
  levels: string;
  seed: number;
  size: number;
  ground: 'plaine' | 'foret';
  pond?: [number, number, number];
  cliff?: number;
  cave?: { i: number; j: number; label: string };
  /** carte sûre : aucun monstre, un campement au centre où tout le monde se retrouve */
  camp?: boolean;
  portals: PortalDef[];
  mobs: MobGroup[];
  nodes: NodeDef[];
}

export const NODES = {
  frene: { name: 'Frêne', item: 'bois', time: 1.6, respawn: 30 },
  cuivre: { name: 'Filon de cuivre', item: 'cuivre', time: 2, respawn: 35 },
  lunaire: { name: 'Lunaire', item: 'lunaire', time: 1.2, respawn: 25 },
} as const;

export const MAPS: Record<string, MapDef> = {
  halte: {
    id: 'halte', name: 'Halte de Valcourt', zone: "Plaines d'Aldmar", coords: [4, 0], levels: '1', seed: 3, size: 22, ground: 'plaine', camp: true,
    portals: [
      { edge: 'N', at: 11, to: 'route', label: 'Route de Valcourt (4, −1)' },
      { edge: 'W', at: 11, to: null, label: 'Valcourt (3, 0) · bientôt' },
    ],
    mobs: [],
    nodes: [{ kind: 'frene', i: 4, j: 6 }, { kind: 'lunaire', i: 17, j: 16 }, { kind: 'lunaire', i: 5, j: 16 }],
  },
  route: {
    id: 'route', name: 'Route de Valcourt', zone: "Plaines d'Aldmar", coords: [4, -1], levels: '1 à 5', seed: 7, size: 26, ground: 'plaine',
    portals: [
      { edge: 'N', at: 13, to: 'bois', label: 'Bois de Fenrel (4, −2)' },
      { edge: 'S', at: 12, to: 'halte', label: 'Halte de Valcourt (4, 0)' },
      { edge: 'W', at: 14, to: null, label: 'Côte des Brumes (3, −1) · bientôt' },
    ],
    mobs: [
      { kind: 'sanglier', i: 7, j: 8, count: 3 },
      { kind: 'sanglier', i: 19, j: 19, count: 3 },
      { kind: 'sanglier', i: 6, j: 19, count: 2 },
      { kind: 'gorrok', i: 21, j: 9, count: 2 },
    ],
    nodes: [{ kind: 'frene', i: 4, j: 12 }, { kind: 'frene', i: 21, j: 12 }, { kind: 'lunaire', i: 10, j: 20 }, { kind: 'lunaire', i: 16, j: 5 }, { kind: 'cuivre', i: 22, j: 20 }],
  },
  bois: {
    id: 'bois', name: 'Bois de Fenrel', zone: 'Bois de Fenrel', coords: [4, -2], levels: '5 à 8', seed: 11, size: 26, ground: 'foret', pond: [6, 19, 2.4],
    portals: [
      { edge: 'S', at: 13, to: 'route', label: 'Route de Valcourt (4, −1)' },
      { edge: 'E', at: 12, to: 'lisiere', label: 'Lisière de Fenrel (5, −2)' },
    ],
    mobs: [
      { kind: 'loup', i: 8, j: 8, count: 3 },
      { kind: 'loup', i: 18, j: 7, count: 2 },
      { kind: 'gorrok', i: 20, j: 16, count: 2 },
      { kind: 'loup', i: 7, j: 14, count: 2 },
    ],
    nodes: [{ kind: 'cuivre', i: 4, j: 10 }, { kind: 'cuivre', i: 21, j: 4 }, { kind: 'cuivre', i: 13, j: 5 }, { kind: 'frene', i: 20, j: 14 }, { kind: 'lunaire', i: 10, j: 17 }, { kind: 'lunaire', i: 4, j: 15 }],
  },
  lisiere: {
    id: 'lisiere', name: 'Lisière de Fenrel', zone: 'Bois de Fenrel', coords: [5, -2], levels: '7 à 10', seed: 23, size: 26, ground: 'foret', pond: [20, 19, 2.2], cliff: 7,
    cave: { i: 12, j: 4, label: 'Terrier des Brumes · donjon prévu en V2' },
    portals: [
      { edge: 'W', at: 13, to: 'bois', label: 'Bois de Fenrel (4, −2)' },
    ],
    mobs: [
      { kind: 'loup', i: 9, j: 18, count: 3 },
      { kind: 'loup', i: 18, j: 12, count: 2 },
      { kind: 'alpha', i: 13, j: 10, count: 1 },
      { kind: 'loup', i: 15, j: 9, count: 1 },
    ],
    nodes: [{ kind: 'cuivre', i: 6, j: 8 }, { kind: 'cuivre', i: 21, j: 9 }, { kind: 'lunaire', i: 5, j: 20 }, { kind: 'lunaire', i: 15, j: 21 }, { kind: 'frene', i: 22, j: 15 }],
  },
};

/** Carte où apparaissent les nouveaux personnages : tout le monde commence au même endroit. */
export const START_MAP = 'halte';
