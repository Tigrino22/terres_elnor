// Contenu de la carte du monde : zones, villes, routes, rivières, lieux remarquables.
// Tout est exprimé en coordonnées de carte du jeu (x, y) : une case = une carte jouable.
// Les cartes réellement jouables viennent de src/shared/data.ts (MAPS) : rien à recopier ici.

export type Case = readonly [x: number, y: number];

/** Étendue de la grille et sa mise en page sur le parchemin (en pixels du dessin). */
export const GRILLE = {
  xMin: -18, xMax: 17, yMin: -12, yMax: 12,
  /** taille d'une case en pixels */
  taille: 30,
  /** position de la case (xMin, yMin) sur le parchemin */
  marge: { x: 60, y: 72 },
  /** taille du parchemin */
  largeur: 1250, hauteur: 900,
} as const;

/** Silhouette du continent : une ellipse bosselée par du bruit, moins quelques trous (baie, lac). */
export const FORME = {
  centre: [-0.5, 0.3] as Case,
  rayons: [16.5, 10.4] as Case,
  /** plus la valeur est forte, plus la côte est découpée */
  irregularite: 1.1,
  seuil: 0.92,
  trous: [
    { nom: 'Baie du sud', centre: [-5, 11] as Case, rayons: [3, 3] as Case },
    { nom: 'Lac de Fenrel', centre: [8, 2] as Case, rayons: [1.8, 1.4] as Case },
  ],
};

export type Decor = 'bles' | 'feuillus' | 'bosquets' | 'grands-arbres' | 'montagnes' | 'roseaux' | 'failles' | 'pics-sombres';

export interface Zone {
  id: string;
  nom: string;
  /** niveaux conseillés, affichés tels quels */
  niveaux: string;
  couleur: string;
  /** case autour de laquelle la zone s'étend (chaque case appartient à la zone la plus proche) */
  centre: Case;
  /** position du nom sur le parchemin */
  etiquette: Case;
  /** part de la zone déjà explorée : 1 = toute, 0 = verrouillée, entre les deux = partiellement sous brume */
  decouverte: number;
  decor: Decor;
  /** zone du camp ennemi : nom écrit en rouge */
  couchant?: boolean;
}

export const ZONES: Zone[] = [
  { id: 'plaines', nom: "Plaines d'Aldmar", niveaux: '1 à 8', couleur: '#d7c76e', centre: [-1, 1], etiquette: [-2, 3], decouverte: 1, decor: 'bles' },
  { id: 'fenrel', nom: 'Bois de Fenrel', niveaux: '8 à 14', couleur: '#6f9c48', centre: [4, -3], etiquette: [5, -5], decouverte: 1, decor: 'feuillus' },
  { id: 'cote', nom: 'Côte des Brumes', niveaux: '5 à 10', couleur: '#a9bf8c', centre: [-12, -1], etiquette: [-12, -4], decouverte: 1, decor: 'bosquets' },
  { id: 'sylvae', nom: 'Forêt de Sylvaë', niveaux: '10 à 18', couleur: '#3f8256', centre: [-9, 6], etiquette: [-9, 9], decouverte: 0.5, decor: 'grands-arbres' },
  { id: 'brasemont', nom: 'Monts de Brasemont', niveaux: '14 à 20', couleur: '#a39a8a', centre: [-3, -8], etiquette: [-4, -10], decouverte: 0.3, decor: 'montagnes' },
  { id: 'saule', nom: 'Marais de Gris-Saule', niveaux: '12 à 18', couleur: '#7f9070', centre: [3, 7], etiquette: [3, 5], decouverte: 0.2, decor: 'roseaux' },
  { id: 'cendres', nom: 'Marches cendrées', niveaux: '20 à 30', couleur: '#9a6a52', centre: [11, -3], etiquette: [11, -6], decouverte: 0, decor: 'failles', couchant: true },
  { id: 'desolation', nom: 'Désolation de Cendrebrume', niveaux: '30 et plus', couleur: '#6a4440', centre: [14, 5], etiquette: [14, 7], decouverte: 0, decor: 'pics-sombres', couchant: true },
];

/** Les zones partiellement explorées ne le sont que dans ce rayon autour de ce point. */
export const EXPLORATION = { centre: [2, -1] as Case, rayon: 13 };

export interface Ville { nom: string; pos: Case; capitale?: boolean }
export const VILLES: Ville[] = [
  { nom: 'Valcourt', pos: [0, 0], capitale: true },
  { nom: 'Feuillaube', pos: [-9, 5] },
  { nom: 'Forge-Haute', pos: [-3, -8] },
  { nom: 'Port-Brume', pos: [-12, -1] },
  { nom: 'Gorr-Nakh', pos: [15, 0] },
];

export const SANCTUAIRES: Case[] = [[2, -4], [-4, 2], [-7, 6], [6, 1], [-11, -3], [-1, -6]];
export const DONJONS: Case[] = [[-6, -2], [6, -5], [2, 9], [-12, 7]];

/** Routes en pointillés : de A à B, courbées vers le point `par`. */
export const ROUTES: { de: Case; a: Case; par: Case }[] = [
  { de: [0, 0], a: [4, -2], par: [2, 0] },
  { de: [0, 0], a: [-9, 5], par: [-5, 4] },
  { de: [0, 0], a: [-3, -8], par: [-3, -3] },
  { de: [0, 0], a: [-12, -1], par: [-6, -2] },
  { de: [4, -2], a: [3, 7], par: [7, 3] },
];

/** Rivières : point de départ puis paires (point de contrôle, point d'arrivée) d'une courbe. Coordonnées en cases, décimales permises. */
export const RIVIERES: Case[][] = [
  [[-3, -7], [-1, -4], [1, -2], [4, 0], [7.33, 2.33]],
  [[10, 3.67], [10, 6], [8, 9], [6, 12], [5, 14]],
  [[-6, -6], [-9, -3], [-10, 0], [-14, 1], [-19, 2]],
];

/** Lacs dessinés (en cases) ; le trou correspondant dans FORME empêche d'y poser des cases de terre. */
export const LACS: { centre: Case; rayons: Case; angle: number }[] = [
  { centre: [8.5, 2.5], rayons: [1.73, 1.27], angle: 0.2 },
];
