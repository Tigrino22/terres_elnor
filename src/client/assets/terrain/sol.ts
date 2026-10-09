// Couleurs du sol, de l'eau et de la petite végétation des cartes.
// Changer une valeur ici repeint toutes les cartes sans toucher au rendu.

export const SOL = {
  /** herbe des plaines : deux tons mêlés par du bruit */
  herbe: [0x8cae4e, 0x6e9438],
  /** herbe des cartes de forêt */
  herbeForet: [0x76a046, 0x4f7a30],
  chemin: 0xb39465,
  sable: 0xc4b07a,
  vase: 0x4a4630,
  roche: 0x837767,
  /** plateau sous la carte, visible au loin */
  socle: 0x33421f,
  ciel: 0x1d2416,
  eau: 0x3f86a8,
  touffes: 0x6e9a3a,
  touffesForet: 0x5a8a32,
  fleurs: [0xf4f0e0, 0xf2d14b, 0xb486e0, 0xe86a6a],
} as const;
