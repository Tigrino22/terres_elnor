// Dessin du parchemin : fond, côtes, teintes des zones, petits dessins (blés, arbres, montagnes…),
// lacs, rivières, brume, routes, villes, lieux et noms. Tout ce qui ne bouge pas.
// Ce qui change en jeu (ta position, les cartes ouvertes, la case survolée) est dessiné par fenetre.ts.

import { rng } from '../../shared/rng';
import { DONJONS, GRILLE, LACS, RIVIERES, ROUTES, SANCTUAIRES, VILLES, ZONES, type Case, type Decor } from './donnees';
import { casesDeTerre, centre, estDecouverte, px, py } from './relief';

type Ctx = CanvasRenderingContext2D;
const { largeur: W, hauteur: H, taille: T } = GRILLE;

/** Couleurs du parchemin. */
export const ENCRE = { papier: '#e4d0a2', terre: '#eadcb4', cote: '#5a4126', texte: '#3a2410', texteCouchant: '#7a1e10', eau: '#4f7f96', route: '#7a5a2a', halo: 'rgba(240,228,196,.9)' };

/**
 * Dessine le parchemin dans `cv`, à `echelle` fois la taille de base (2 = net jusqu'au zoom ×2).
 */
export function dessinerParchemin(cv: HTMLCanvasElement, echelle = 2) {
  cv.width = W * echelle; cv.height = H * echelle;
  const c = cv.getContext('2d')!;
  c.scale(echelle, echelle);
  const r = rng(5);
  const cases = casesDeTerre();
  const terre = new Path2D(), cote = new Path2D();
  for (const { x, y } of cases) {
    const [cx, cy] = centre([x, y]);
    cote.moveTo(cx + 24, cy); cote.arc(cx, cy, 24, 0, Math.PI * 2);
    terre.moveTo(cx + 22, cy); terre.arc(cx, cy, 22, 0, Math.PI * 2);
  }

  // papier, mer et vagues
  c.fillStyle = ENCRE.papier; c.fillRect(0, 0, W, H);
  for (let k = 0; k < 2600; k++) { c.fillStyle = `rgba(${120 + r() * 40},${90 + r() * 30},50,${r() * 0.05})`; c.beginPath(); c.arc(r() * W, r() * H, 4 + r() * 40, 0, 7); c.fill(); }
  c.fillStyle = 'rgba(70,110,125,.15)'; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(50,80,95,.35)'; c.lineWidth = 1.2;
  for (let k = 0; k < 140; k++) {
    const x = GRILLE.marge.x + r() * 1080, y = GRILLE.marge.y + r() * 750;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 5, y - 4, x + 10, y); c.quadraticCurveTo(x + 15, y + 4, x + 20, y); c.stroke();
  }

  // terre : liseré d'encre puis aplat
  c.fillStyle = ENCRE.cote; c.fill(cote);
  c.fillStyle = ENCRE.terre; c.fill(terre);
  c.save(); c.clip(terre);
  for (const { x, y, zone } of cases) { const [cx, cy] = centre([x, y]); c.fillStyle = zone.couleur + '88'; c.beginPath(); c.arc(cx, cy, 21, 0, 7); c.fill(); }
  for (let k = 0; k < 900; k++) { c.fillStyle = `rgba(60,40,10,${r() * 0.06})`; c.beginPath(); c.arc(GRILLE.marge.x + r() * 1080, GRILLE.marge.y + r() * 750, 2 + r() * 10, 0, 7); c.fill(); }
  for (const { x, y, zone } of cases) {
    const [cx, cy] = centre([x, y]);
    DECORS[zone.decor](c, cx + (r() - 0.5) * 10, cy + (r() - 0.5) * 10, r);
  }
  c.restore();

  // lacs et rivières
  for (const l of LACS) {
    c.fillStyle = 'rgba(70,120,140,.55)'; c.strokeStyle = '#3a5a68'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(px(l.centre[0]), py(l.centre[1]), l.rayons[0] * T, l.rayons[1] * T, l.angle, 0, 7); c.fill(); c.stroke();
  }
  c.save(); c.clip(terre);
  for (const pts of RIVIERES) riviere(c, pts);

  // grille
  c.strokeStyle = 'rgba(70,45,20,.28)'; c.lineWidth = 1;
  for (let x = GRILLE.xMin; x <= GRILLE.xMax + 1; x++) { c.beginPath(); c.moveTo(px(x), py(GRILLE.yMin)); c.lineTo(px(x), py(GRILLE.yMax + 1)); c.stroke(); }
  for (let y = GRILLE.yMin; y <= GRILLE.yMax + 1; y++) { c.beginPath(); c.moveTo(px(GRILLE.xMin), py(y)); c.lineTo(px(GRILLE.xMax + 1), py(y)); c.stroke(); }

  // brume sur les régions inexplorées
  const motif = c.createPattern(motifBrume(), 'repeat')!;
  c.fillStyle = motif;
  for (const { x, y, zone } of cases) if (!estDecouverte(x, y, zone)) c.fillRect(px(x) - 1, py(y) - 1, T + 2, T + 2);
  c.restore();

  // routes
  c.setLineDash([6, 5]); c.strokeStyle = ENCRE.route; c.lineWidth = 2.4;
  for (const rt of ROUTES) {
    const a = centre(rt.de), b = centre(rt.a), m = centre(rt.par);
    c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(m[0], m[1], b[0], b[1]); c.stroke();
  }
  c.setLineDash([]);

  // lieux
  SANCTUAIRES.forEach(p => sanctuaire(c, p));
  DONJONS.forEach(p => donjon(c, p));
  VILLES.forEach(v => ville(c, v.pos, v.nom, !!v.capitale));
  c.textAlign = 'center';
  for (const z of ZONES) nomDeZone(c, z.etiquette, z.nom, `niv. ${z.niveaux}${z.couchant ? ' · Couchant' : ''}`, !!z.couchant);

  rose(c, 140, 790);
  cartouche(c);
  // cadre et vignettage
  c.strokeStyle = ENCRE.cote; c.lineWidth = 6; c.strokeRect(10, 10, W - 20, H - 20); c.lineWidth = 1.5; c.strokeRect(20, 18, W - 40, H - 36);
  const vg = c.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 760);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(70,40,10,.35)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------- petits dessins par type de zone
const arbre = (c: Ctx, x: number, y: number, s: number, col: string) => {
  c.fillStyle = '#4a3420'; c.fillRect(x - 1, y, 2, 5 * s);
  c.fillStyle = col; c.beginPath(); c.arc(x, y - 2 * s, 5.5 * s, 0, 7); c.fill();
  c.strokeStyle = 'rgba(30,40,20,.6)'; c.lineWidth = 1; c.stroke();
};
const sapin = (c: Ctx, x: number, y: number, s: number, col: string) => {
  c.fillStyle = col; c.beginPath(); c.moveTo(x, y - 12 * s); c.lineTo(x + 6 * s, y + 3 * s); c.lineTo(x - 6 * s, y + 3 * s); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(20,30,15,.6)'; c.stroke();
};
const montagne = (c: Ctx, x: number, y: number, s: number, sombre: boolean) => {
  c.fillStyle = sombre ? '#5a3a34' : '#b9b0a0'; c.beginPath(); c.moveTo(x - 14 * s, y + 8 * s); c.lineTo(x, y - 14 * s); c.lineTo(x + 14 * s, y + 8 * s); c.closePath(); c.fill();
  c.fillStyle = sombre ? '#3a2422' : '#8a8274'; c.beginPath(); c.moveTo(x, y - 14 * s); c.lineTo(x + 14 * s, y + 8 * s); c.lineTo(x + 2 * s, y + 8 * s); c.closePath(); c.fill();
  if (!sombre) { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x, y - 14 * s); c.lineTo(x + 4 * s, y - 8 * s); c.lineTo(x - 4 * s, y - 8 * s); c.closePath(); c.fill(); }
  c.strokeStyle = 'rgba(40,25,10,.7)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - 14 * s, y + 8 * s); c.lineTo(x, y - 14 * s); c.lineTo(x + 14 * s, y + 8 * s); c.stroke();
};

/** Un dessin par type de décor de zone (donnees.ts → Zone.decor). `r` donne l'aléatoire stable. */
export const DECORS: Record<Decor, (c: Ctx, x: number, y: number, r: () => number) => void> = {
  'bles': (c, x, y, r) => {
    if (r() >= 0.6) return;
    c.strokeStyle = 'rgba(140,110,40,.55)'; c.lineWidth = 1;
    for (let q = 0; q < 4; q++) { c.beginPath(); c.moveTo(x - 8 + q * 5, y + 5); c.lineTo(x - 6 + q * 5, y - 3); c.stroke(); }
  },
  'feuillus': (c, x, y, r) => { if (r() < 0.8) { arbre(c, x - 5, y, 0.9, '#4f7a32'); if (r() < 0.6) sapin(c, x + 6, y + 4, 0.8, '#2f5a33'); } },
  'bosquets': (c, x, y, r) => { if (r() < 0.4) arbre(c, x, y, 0.7, '#7a9a5a'); },
  'grands-arbres': (c, x, y, r) => { if (r() < 0.9) { arbre(c, x - 4, y - 2, 1.05, '#2f6a44'); arbre(c, x + 6, y + 5, 0.85, '#3d7a4e'); } },
  'montagnes': (c, x, y, r) => { if (r() < 0.75) montagne(c, x, y, 0.85 + r() * 0.4, false); },
  'pics-sombres': (c, x, y, r) => { if (r() < 0.7) montagne(c, x, y, 0.7 + r() * 0.4, true); },
  'failles': (c, x, y, r) => {
    if (r() >= 0.35) return;
    c.strokeStyle = 'rgba(70,30,20,.6)'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(x - 7, y); c.lineTo(x - 2, y - 4); c.lineTo(x + 3, y + 1); c.lineTo(x + 8, y - 3); c.stroke();
  },
  'roseaux': (c, x, y, r) => {
    if (r() >= 0.7) return;
    c.strokeStyle = 'rgba(40,60,40,.7)'; c.lineWidth = 1.2;
    for (let q = -1; q <= 1; q++) { c.beginPath(); c.moveTo(x + q * 4, y + 6); c.lineTo(x + q * 5, y - 5); c.stroke(); }
    c.fillStyle = 'rgba(70,110,125,.35)'; c.beginPath(); c.ellipse(x, y + 7, 9, 3, 0, 0, 7); c.fill();
  },
};

// ---------------------------------------------------------------- éléments ponctuels
function riviere(c: Ctx, pts: Case[]) {
  c.strokeStyle = ENCRE.eau; c.lineWidth = 3.2; c.lineCap = 'round';
  c.beginPath(); c.moveTo(px(pts[0][0]), py(pts[0][1]));
  for (let k = 1; k + 1 < pts.length; k += 2) c.quadraticCurveTo(px(pts[k][0]), py(pts[k][1]), px(pts[k + 1][0]), py(pts[k + 1][1]));
  c.stroke();
}

function motifBrume() {
  const f = document.createElement('canvas'); f.width = f.height = 16;
  const g = f.getContext('2d')!;
  g.fillStyle = 'rgba(228,210,168,.78)'; g.fillRect(0, 0, 16, 16);
  g.strokeStyle = 'rgba(120,90,50,.45)'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(-4, 16); g.lineTo(16, -4); g.moveTo(4, 20); g.lineTo(20, 4); g.stroke();
  return f;
}

function ville(c: Ctx, pos: Case, nom: string, capitale: boolean) {
  const [x, y] = centre(pos), s = capitale ? 1.3 : 1;
  c.fillStyle = '#efe2be'; c.strokeStyle = '#3a2814'; c.lineWidth = 1.6;
  c.beginPath(); c.arc(x, y, 15 * s, 0, 7); c.fill(); c.stroke();
  c.fillStyle = '#6a4a22'; c.beginPath();
  [[-9, 8], [-9, -2], [-6, -4], [-6, 0], [-3, 0], [-3, -7], [0, -10], [3, -7], [3, 0], [6, 0], [6, -4], [9, -2], [9, 8]]
    .forEach(([a, b], k) => k ? c.lineTo(x + a * s, y + b * s) : c.moveTo(x + a * s, y + b * s));
  c.closePath(); c.fill();
  c.font = `700 ${capitale ? 17 : 14}px Cinzel`; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = ENCRE.halo;
  c.strokeText(nom, x, y + 32 * s); c.fillStyle = '#2a1a0a'; c.fillText(nom, x, y + 32 * s);
}

function sanctuaire(c: Ctx, pos: Case) {
  const [x, y] = centre(pos);
  c.fillStyle = '#e8c15a'; c.strokeStyle = '#5a3a10'; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(x, y - 9); c.lineTo(x + 6, y); c.lineTo(x, y + 9); c.lineTo(x - 6, y); c.closePath(); c.fill(); c.stroke();
}

function donjon(c: Ctx, pos: Case) {
  const [x, y0] = centre(pos), y = y0 + 3;
  c.fillStyle = '#3a2a1a'; c.beginPath(); c.moveTo(x - 11, y + 4); c.quadraticCurveTo(x, y - 20, x + 11, y + 4); c.closePath(); c.fill();
  c.fillStyle = '#000'; c.beginPath(); c.moveTo(x - 5, y + 4); c.quadraticCurveTo(x, y - 8, x + 5, y + 4); c.closePath(); c.fill();
}

function nomDeZone(c: Ctx, pos: Case, nom: string, sous: string, couchant: boolean) {
  const [x, y] = centre(pos);
  c.font = '700 19px Cinzel'; c.lineWidth = 5; c.strokeStyle = 'rgba(240,228,196,.85)';
  c.strokeText(nom.toUpperCase(), x, y); c.fillStyle = couchant ? ENCRE.texteCouchant : ENCRE.texte; c.fillText(nom.toUpperCase(), x, y);
  c.font = 'italic 500 14px "Alegreya Sans"'; c.lineWidth = 4; c.strokeText(sous, x, y + 18); c.fillText(sous, x, y + 18);
}

function rose(c: Ctx, x: number, y: number) {
  c.save(); c.translate(x, y); c.fillStyle = 'rgba(60,40,20,.8)';
  for (let k = 0; k < 4; k++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(0, -46); c.lineTo(9, 0); c.lineTo(-9, 0); c.closePath(); c.fill(); }
  c.rotate(Math.PI / 4); c.fillStyle = 'rgba(160,120,60,.8)';
  for (let k = 0; k < 4; k++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(0, -28); c.lineTo(6, 0); c.lineTo(-6, 0); c.closePath(); c.fill(); }
  c.restore();
  c.font = '700 16px Cinzel'; c.fillStyle = ENCRE.texte; c.textAlign = 'center'; c.fillText('N', x, y - 52);
}

function cartouche(c: Ctx) {
  c.fillStyle = 'rgba(240,228,196,.85)'; c.strokeStyle = ENCRE.cote; c.lineWidth = 2;
  c.beginPath(); c.roundRect(40, 22, 330, 64, 8); c.fill(); c.stroke();
  c.font = '700 28px Cinzel'; c.fillStyle = ENCRE.texte; c.textAlign = 'left'; c.fillText("Terres d'Elnor", 60, 58);
  c.font = 'italic 14px "Alegreya Sans"'; c.fillStyle = ENCRE.cote; c.fillText('Chaque case est une carte de jeu · coordonnées (x, y)', 60, 77);
}
