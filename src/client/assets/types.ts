// Ce que chaque fichier d'élément doit fournir. Le registre (index.ts) vérifie,
// à la compilation, que chaque objet, sort, monstre et ressource du jeu a le sien.

import type { Builder } from './kit';

/** Couleurs d'un peuple, utilisées par le corps et par la tenue de départ. */
export interface RaceArt {
  name: string;
  skin: number; hair: number; eyes: number;
  trousers: number; cape: number;
  /** tenue de départ : tunique, épaules, col */
  tunic: number; tunic2: number; collar: number;
  /** traits propres au peuple : oreilles, coiffure, bijou, barbe… */
  head(b: Builder): void;
}

/** Pièce visible sur le personnage (équipement ou tenue de départ). */
export interface WearArt {
  /** dessine la pièce sur le corps, dans le repère du personnage (pieds en 0, regard vers +z) */
  wear(b: Builder, race: RaceArt): void;
  /** la capuche ou un casque masque le haut de la chevelure */
  hidesHair?: boolean;
}

/** Objet du sac : son icône, et sa pièce visible s'il se porte. */
export interface ItemArt extends Partial<WearArt> { icon: string }

/** Sort : icône de la barre, et apparence du trait tiré si c'en est un. */
export interface SpellArt {
  icon: string;
  /** couleur de la traînée, vitesse du trait, gros trait ou non */
  shot?: { color: number; speed: number; big: boolean };
  /** couleur de l'effet au sol (zone, piège) */
  ground?: number;
}

export interface MobArt {
  build(b: Builder): void;
  /** taille du modèle */
  scale: number;
  /** hauteur de l'étiquette de nom au-dessus du monstre */
  labelY: number;
}

export interface NodeArt {
  build(b: Builder): void;
  /** couleur du halo et de la minicarte */
  glow: number;
  glowY: number;
  labelY: number;
}
