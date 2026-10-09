// Carte du monde façon parchemin (reprise de la première maquette).
// Chaque case est une carte du jeu ; la case courante est encadrée.
/* eslint-disable */
// @ts-nocheck
import { rng, makeNoise } from '../shared/rng';

export const WM = { W: 1250, H: 900, CELL: 30, C0: -18, R0: -12, ox: 60, oy: 72 };
export const cellAt = (px: number, py: number) => ({ cx: Math.floor((px - WM.ox) / WM.CELL) + WM.C0, cy: Math.floor((py - WM.oy) / WM.CELL) + WM.R0 });

export function drawWorldMap(cv: HTMLCanvasElement, here: [number, number], open: [number, number][]) {
  const c = cv.getContext('2d')!;
  const Wm = 1250, Hm = 900, CELL = 30, C0 = -18, C1 = 17, R0 = -12, R1 = 12;
  const ox = 60, oy = 72;
  const X = cx => ox + (cx - C0) * CELL, Y = cy => oy + (cy - R0) * CELL;
  const r = rng(5), n = makeNoise(31), n2 = makeNoise(77);
  // parchment
  c.fillStyle = '#e4d0a2'; c.fillRect(0, 0, Wm, Hm);
  for (let k = 0; k < 2600; k++) { c.fillStyle = `rgba(${120 + r() * 40},${90 + r() * 30},${50},${r() * 0.05})`; c.beginPath(); c.arc(r() * Wm, r() * Hm, 4 + r() * 40, 0, 7); c.fill(); }
  // sea tint + waves
  c.fillStyle = 'rgba(70,110,125,.15)'; c.fillRect(0, 0, Wm, Hm);
  c.strokeStyle = 'rgba(50,80,95,.35)'; c.lineWidth = 1.2;
  for (let k = 0; k < 140; k++) { const x = ox + r() * 1080, y = oy + r() * 750; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 5, y - 4, x + 10, y); c.quadraticCurveTo(x + 15, y + 4, x + 20, y); c.stroke(); }
  // land
  const land = (cx, cy) => {
    const a = ((cx + 0.5) / 16.5) ** 2 + ((cy - 0.3) / 10.4) ** 2 + (n(cx * 0.22 + 3, cy * 0.22) - 0.5) * 1.1;
    const bay = ((cx + 5) / 3) ** 2 + ((cy - 11) / 3) ** 2 < 1;
    const lake = ((cx - 8) / 1.8) ** 2 + ((cy - 2) / 1.4) ** 2 < 1;
    return a < 0.92 && !bay && !lake;
  };
  const zones = [
    { id: 'plaines', name: "Plaines d'Aldmar", lv: 'niv. 1 à 8', col: '#d7c76e', seed: [-1, 1], disc: true },
    { id: 'fenrel', name: 'Bois de Fenrel', lv: 'niv. 8 à 14', col: '#6f9c48', seed: [4, -3], disc: true },
    { id: 'cote', name: 'Côte des Brumes', lv: 'niv. 5 à 10', col: '#a9bf8c', seed: [-12, -1], disc: true },
    { id: 'sylvae', name: 'Forêt de Sylvaë', lv: 'niv. 10 à 18', col: '#3f8256', seed: [-9, 6], disc: 0.5 },
    { id: 'brasemont', name: 'Monts de Brasemont', lv: 'niv. 14 à 20', col: '#a39a8a', seed: [-3, -8], disc: 0.3 },
    { id: 'saule', name: 'Marais de Gris-Saule', lv: 'niv. 12 à 18', col: '#7f9070', seed: [3, 7], disc: 0.2 },
    { id: 'cendres', name: 'Marches cendrées', lv: 'niv. 20 à 30', col: '#9a6a52', seed: [11, -3], disc: 0 },
    { id: 'desolation', name: 'Désolation de Cendrebrume', lv: 'niv. 30 et plus', col: '#6a4440', seed: [14, 5], disc: 0 },
  ];
  const zoneOf = (cx, cy) => {
    let best = null, bd = 1e9;
    zones.forEach(z => { const d = Math.hypot(cx - z.seed[0], (cy - z.seed[1]) * 1.15) + (n2(cx * 0.3 + z.seed[0], cy * 0.3) - 0.5) * 4; if (d < bd) { bd = d; best = z; } });
    return best;
  };
  const cells = [];
  for (let cx = C0; cx <= C1; cx++) for (let cy = R0; cy <= R1; cy++) if (land(cx, cy)) cells.push({ cx, cy, z: zoneOf(cx, cy) });
  const landPath = new Path2D();
  cells.forEach(({ cx, cy }) => { landPath.moveTo(X(cx) + CELL / 2 + 22, Y(cy) + CELL / 2); landPath.arc(X(cx) + CELL / 2, Y(cy) + CELL / 2, 22, 0, Math.PI * 2); });
  // coastline: ink outline then fill
  c.save(); c.fillStyle = '#5a4126';
  const coast = new Path2D(); cells.forEach(({ cx, cy }) => { coast.moveTo(X(cx) + CELL / 2 + 24, Y(cy) + CELL / 2); coast.arc(X(cx) + CELL / 2, Y(cy) + CELL / 2, 24, 0, Math.PI * 2); }); c.fill(coast); c.restore();
  c.fillStyle = '#eadcb4'; c.fill(landPath);
  c.save(); c.clip(landPath);
  // zone tints (smoothed by drawing big soft blobs per cell)
  cells.forEach(({ cx, cy, z }) => { c.fillStyle = z.col + '88'; c.beginPath(); c.arc(X(cx) + CELL / 2, Y(cy) + CELL / 2, 21, 0, 7); c.fill(); });
  // texture
  for (let k = 0; k < 900; k++) { c.fillStyle = `rgba(60,40,10,${r() * 0.06})`; c.beginPath(); c.arc(ox + r() * 1080, oy + r() * 750, 2 + r() * 10, 0, 7); c.fill(); }
  // glyphs
  const tree = (x, y, s, col) => { c.fillStyle = '#4a3420'; c.fillRect(x - 1, y, 2, 5 * s); c.fillStyle = col; c.beginPath(); c.arc(x, y - 2 * s, 5.5 * s, 0, 7); c.fill(); c.strokeStyle = 'rgba(30,40,20,.6)'; c.lineWidth = 1; c.stroke(); };
  const pineG = (x, y, s, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(x, y - 12 * s); c.lineTo(x + 6 * s, y + 3 * s); c.lineTo(x - 6 * s, y + 3 * s); c.closePath(); c.fill(); c.strokeStyle = 'rgba(20,30,15,.6)'; c.stroke(); };
  const mount = (x, y, s, dark) => { c.fillStyle = dark ? '#5a3a34' : '#b9b0a0'; c.beginPath(); c.moveTo(x - 14 * s, y + 8 * s); c.lineTo(x, y - 14 * s); c.lineTo(x + 14 * s, y + 8 * s); c.closePath(); c.fill(); c.fillStyle = dark ? '#3a2422' : '#8a8274'; c.beginPath(); c.moveTo(x, y - 14 * s); c.lineTo(x + 14 * s, y + 8 * s); c.lineTo(x + 2 * s, y + 8 * s); c.closePath(); c.fill(); if (!dark) { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x, y - 14 * s); c.lineTo(x + 4 * s, y - 8 * s); c.lineTo(x - 4 * s, y - 8 * s); c.closePath(); c.fill(); } c.strokeStyle = 'rgba(40,25,10,.7)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - 14 * s, y + 8 * s); c.lineTo(x, y - 14 * s); c.lineTo(x + 14 * s, y + 8 * s); c.stroke(); };
  cells.forEach(({ cx, cy, z }) => {
    const x = X(cx) + CELL / 2 + (r() - 0.5) * 10, y = Y(cy) + CELL / 2 + (r() - 0.5) * 10;
    if (z.id === 'fenrel' && r() < 0.8) { tree(x - 5, y, 0.9, '#4f7a32'); if (r() < 0.6) pineG(x + 6, y + 4, 0.8, '#2f5a33'); }
    if (z.id === 'sylvae' && r() < 0.9) { tree(x - 4, y - 2, 1.05, '#2f6a44'); tree(x + 6, y + 5, 0.85, '#3d7a4e'); }
    if (z.id === 'brasemont' && r() < 0.75) mount(x, y, 0.85 + r() * 0.4, false);
    if (z.id === 'desolation' && r() < 0.7) mount(x, y, 0.7 + r() * 0.4, true);
    if (z.id === 'cendres' && r() < 0.35) { c.strokeStyle = 'rgba(70,30,20,.6)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x - 7, y); c.lineTo(x - 2, y - 4); c.lineTo(x + 3, y + 1); c.lineTo(x + 8, y - 3); c.stroke(); }
    if (z.id === 'saule' && r() < 0.7) { c.strokeStyle = 'rgba(40,60,40,.7)'; c.lineWidth = 1.2; for (let q = -1; q <= 1; q++) { c.beginPath(); c.moveTo(x + q * 4, y + 6); c.lineTo(x + q * 5, y - 5); c.stroke(); } c.fillStyle = 'rgba(70,110,125,.35)'; c.beginPath(); c.ellipse(x, y + 7, 9, 3, 0, 0, 7); c.fill(); }
    if (z.id === 'plaines' && r() < 0.6) { c.strokeStyle = 'rgba(140,110,40,.55)'; c.lineWidth = 1; for (let q = 0; q < 4; q++) { c.beginPath(); c.moveTo(x - 8 + q * 5, y + 5); c.lineTo(x - 6 + q * 5, y - 3); c.stroke(); } }
    if (z.id === 'cote' && r() < 0.4) tree(x, y, 0.7, '#7a9a5a');
  });
  // lake + rivers
  c.restore();
  c.fillStyle = 'rgba(70,120,140,.55)'; c.strokeStyle = '#3a5a68'; c.lineWidth = 2;
  c.beginPath(); c.ellipse(X(8) + 15, Y(2) + 15, 52, 38, 0.2, 0, 7); c.fill(); c.stroke();
  c.save(); c.clip(landPath);
  const river = (pts) => { c.strokeStyle = '#4f7f96'; c.lineWidth = 3.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let k = 2; k < pts.length; k += 4) c.quadraticCurveTo(pts[k], pts[k + 1], pts[k + 2], pts[k + 3]); c.stroke(); };
  river([X(-3), Y(-7), X(-1), Y(-4), X(1), Y(-2), X(4), Y(0), X(7) + 10, Y(2) + 10]);
  river([X(9) + 30, Y(3) + 20, X(10), Y(6), X(8), Y(9), X(6), Y(12), X(5), Y(14)]);
  river([X(-6), Y(-6), X(-9), Y(-3), X(-10), Y(0), X(-14), Y(1), X(-19), Y(2)]);
  // grid
  c.strokeStyle = 'rgba(70,45,20,.28)'; c.lineWidth = 1;
  for (let cx = C0; cx <= C1 + 1; cx++) { c.beginPath(); c.moveTo(X(cx), Y(R0)); c.lineTo(X(cx), Y(R1 + 1)); c.stroke(); }
  for (let cy = R0; cy <= R1 + 1; cy++) { c.beginPath(); c.moveTo(X(C0), Y(cy)); c.lineTo(X(C1 + 1), Y(cy)); c.stroke(); }
  // fog of war
  const discovered = (cx, cy, z) => z.disc === true || (z.disc && n(cx * 0.5 + 9, cy * 0.5 + 2) < z.disc + 0.25 && Math.hypot(cx - 2, cy + 1) < 13);
  const fog = document.createElement('canvas'); fog.width = 16; fog.height = 16; const fc = fog.getContext('2d');
  fc.fillStyle = 'rgba(228,210,168,.78)'; fc.fillRect(0, 0, 16, 16); fc.strokeStyle = 'rgba(120,90,50,.45)'; fc.lineWidth = 1.2; fc.beginPath(); fc.moveTo(-4, 16); fc.lineTo(16, -4); fc.moveTo(4, 20); fc.lineTo(20, 4); fc.stroke();
  const pat = c.createPattern(fog, 'repeat');
  cells.forEach(({ cx, cy, z }) => { if (!discovered(cx, cy, z)) { c.fillStyle = pat; c.fillRect(X(cx) - 1, Y(cy) - 1, CELL + 2, CELL + 2); } });
  c.restore();
  // roads
  c.setLineDash([6, 5]); c.strokeStyle = '#7a5a2a'; c.lineWidth = 2.4;
  const road = (a, b, cxp, cyp) => { c.beginPath(); c.moveTo(X(a[0]) + 15, Y(a[1]) + 15); c.quadraticCurveTo(X(cxp) + 15, Y(cyp) + 15, X(b[0]) + 15, Y(b[1]) + 15); c.stroke(); };
  road([0, 0], [4, -2], 2, 0); road([0, 0], [-9, 5], -5, 4); road([0, 0], [-3, -8], -3, -3); road([0, 0], [-12, -1], -6, -2); road([4, -2], [3, 7], 7, 3);
  c.setLineDash([]);
  // icons
  const city = (cx, cy, name, big) => {
    const x = X(cx) + 15, y = Y(cy) + 15, s = big ? 1.3 : 1;
    c.fillStyle = '#efe2be'; c.strokeStyle = '#3a2814'; c.lineWidth = 1.6;
    c.beginPath(); c.arc(x, y, 15 * s, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#6a4a22'; c.beginPath(); const p = [[-9, 8], [-9, -2], [-6, -4], [-6, 0], [-3, 0], [-3, -7], [0, -10], [3, -7], [3, 0], [6, 0], [6, -4], [9, -2], [9, 8]]; p.forEach(([a, b], k) => k ? c.lineTo(x + a * s, y + b * s) : c.moveTo(x + a * s, y + b * s)); c.closePath(); c.fill();
    c.font = `700 ${big ? 17 : 14}px Cinzel`; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = 'rgba(240,228,196,.9)'; c.strokeText(name, x, y + 32 * s); c.fillStyle = '#2a1a0a'; c.fillText(name, x, y + 32 * s);
  };
  const shrine = (cx, cy) => { const x = X(cx) + 15, y = Y(cy) + 15; c.fillStyle = '#e8c15a'; c.strokeStyle = '#5a3a10'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, y - 9); c.lineTo(x + 6, y); c.lineTo(x, y + 9); c.lineTo(x - 6, y); c.closePath(); c.fill(); c.stroke(); };
  const dungeon = (cx, cy) => { const x = X(cx) + 15, y = Y(cy) + 18; c.fillStyle = '#3a2a1a'; c.beginPath(); c.moveTo(x - 11, y + 4); c.quadraticCurveTo(x, y - 20, x + 11, y + 4); c.closePath(); c.fill(); c.fillStyle = '#000'; c.beginPath(); c.moveTo(x - 5, y + 4); c.quadraticCurveTo(x, y - 8, x + 5, y + 4); c.closePath(); c.fill(); };
  [[2, -4], [-4, 2], [-7, 6], [6, 1], [-11, -3], [-1, -6]].forEach(([a, b]) => shrine(a, b));
  [[-6, -2], [6, -5], [2, 9], [-12, 7]].forEach(([a, b]) => dungeon(a, b));
  city(0, 0, 'Valcourt', true); city(-9, 5, 'Feuillaube', false); city(-3, -8, 'Forge-Haute', false); city(-12, -1, 'Port-Brume', false);
  city(15, 0, 'Gorr-Nakh', false);
  // zone labels
  c.textAlign = 'center';
  const zl = (cx, cy, name, lv, dark) => { const x = X(cx) + 15, y = Y(cy) + 15; c.font = '700 19px Cinzel'; c.lineWidth = 5; c.strokeStyle = 'rgba(240,228,196,.85)'; c.strokeText(name.toUpperCase(), x, y); c.fillStyle = dark ? '#7a1e10' : '#3a2410'; c.fillText(name.toUpperCase(), x, y); c.font = 'italic 500 14px "Alegreya Sans"'; c.lineWidth = 4; c.strokeText(lv, x, y + 18); c.fillText(lv, x, y + 18); };
  zl(-2, 3, "Plaines d'Aldmar", 'niv. 1 à 8'); zl(5, -5, 'Bois de Fenrel', 'niv. 8 à 14'); zl(-12, -4, 'Côte des Brumes', 'niv. 5 à 10');
  zl(-9, 9, 'Forêt de Sylvaë', 'niv. 10 à 18'); zl(-4, -10, 'Monts de Brasemont', 'niv. 14 à 20'); zl(3, 5, 'Marais de Gris-Saule', 'niv. 12 à 18');
  zl(11, -6, 'Marches cendrées', 'niv. 20 à 30 · Couchant', true); zl(14, 7, 'Désolation de Cendrebrume', 'niv. 30+ · Couchant', true);
    // cartes jouables en V1
  open.forEach(([a, b]) => { c.strokeStyle = 'rgba(40,25,10,.8)'; c.lineWidth = 1.5; c.strokeRect(X(a) + 2, Y(b) + 2, CELL - 4, CELL - 4); c.fillStyle = 'rgba(255,240,180,.28)'; c.fillRect(X(a) + 2, Y(b) + 2, CELL - 4, CELL - 4); });
  const px = X(here[0]), py = Y(here[1]);
  c.strokeStyle = '#ffe08a'; c.lineWidth = 3; c.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2);
  c.strokeStyle = 'rgba(210,58,42,.5)'; c.lineWidth = 2; c.beginPath(); c.arc(px + 15, py + 15, 22, 0, 7); c.stroke();
  c.fillStyle = '#d23a2a'; c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.beginPath(); c.arc(px + 15, py + 15, 8, 0, 7); c.fill(); c.stroke();
  const cx0 = 140, cy0 = 790;
  c.save(); c.translate(cx0, cy0); c.fillStyle = 'rgba(60,40,20,.8)';
  for (let k = 0; k < 4; k++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(0, -46); c.lineTo(9, 0); c.lineTo(-9, 0); c.closePath(); c.fill(); }
  c.rotate(Math.PI / 4); c.fillStyle = 'rgba(160,120,60,.8)'; for (let k = 0; k < 4; k++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(0, -28); c.lineTo(6, 0); c.lineTo(-6, 0); c.closePath(); c.fill(); }
  c.restore(); c.font = '700 16px Cinzel'; c.fillStyle = '#3a2410'; c.textAlign = 'center'; c.fillText('N', cx0, cy0 - 52);
  c.fillStyle = 'rgba(240,228,196,.85)'; c.strokeStyle = '#5a4126'; c.lineWidth = 2;
  c.beginPath(); c.roundRect(40, 22, 330, 64, 8); c.fill(); c.stroke();
  c.font = '700 28px Cinzel'; c.fillStyle = '#3a2410'; c.textAlign = 'left'; c.fillText("Terres d'Elnor", 60, 58);
  c.font = 'italic 14px "Alegreya Sans"'; c.fillStyle = '#5a4126'; c.fillText('Chaque case est une carte de jeu · coordonnées (x, y)', 60, 77);
  c.strokeStyle = '#5a4126'; c.lineWidth = 6; c.strokeRect(10, 10, Wm - 20, Hm - 20); c.lineWidth = 1.5; c.strokeRect(20, 18, Wm - 40, Hm - 36);
  const vg = c.createRadialGradient(Wm / 2, Hm / 2, 300, Wm / 2, Hm / 2, 760); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(70,40,10,.35)'); c.fillStyle = vg; c.fillRect(0, 0, Wm, Hm);
  return { zones, zoneOf, land };
}
