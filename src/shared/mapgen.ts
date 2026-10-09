// Génération déterministe d'une carte à partir de sa définition.
// Le serveur s'en sert pour les collisions, le client pour le décor 3D.

import { MapDef, PortalDef, Edge } from './data';
import { rng, makeNoise } from './rng';

export enum T { Herbe = 0, Chemin = 1, Eau = 2, Falaise = 3, Sable = 4 }
export type DecorKind = 'arbre' | 'sapin' | 'buisson' | 'rocher';
export interface Decor { kind: DecorKind; x: number; z: number; s: number; rot: number; v: number }
export interface PortalTile extends PortalDef { i: number; j: number; ii: number; jj: number }

export interface MapData {
  def: MapDef;
  size: number;
  tile: Uint8Array;
  blocked: Uint8Array;
  decor: Decor[];
  portals: PortalTile[];
  spawn: { x: number; z: number };
  cave?: { i: number; j: number };
}

const segDist = (px: number, pz: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2)) : 0;
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
};

export function portalTile(size: number, edge: Edge, at: number) {
  const m = size - 1;
  const pos = { N: [at, 0], S: [at, m], W: [0, at], E: [m, at] }[edge];
  const inward = { N: [0, 1], S: [0, -1], W: [1, 0], E: [-1, 0] }[edge];
  return { i: pos[0], j: pos[1], ii: inward[0], jj: inward[1] };
}

export function generateMap(def: MapDef): MapData {
  const N = def.size, r = rng(def.seed), noise = makeNoise(def.seed + 5);
  const c = (N - 1) / 2;
  const tile = new Uint8Array(N * N), blocked = new Uint8Array(N * N);
  const idx = (i: number, j: number) => j * N + i;
  const portals: PortalTile[] = def.portals.map(p => ({ ...p, ...portalTile(N, p.edge, p.at) }));

  // chemins : de chaque portail vers le centre, avec un coude
  const paths: [number, number, number, number][] = [];
  portals.forEach(p => {
    const mx = p.i + p.ii * 4, mz = p.j + p.jj * 4;
    paths.push([p.i, p.j, mx, mz], [mx, mz, c, c]);
  });
  const clear: [number, number, number][] = [[c, c, 3.2]];
  portals.forEach(p => clear.push([p.i + p.ii, p.j + p.jj, 2.6]));
  def.mobs.forEach(g => clear.push([g.i, g.j, g.count > 1 ? 3 : 2.4]));
  def.nodes.forEach(n => clear.push([n.i, n.j, 1.6]));
  const isClear = (i: number, j: number) => clear.some(([x, z, rad]) => Math.hypot(i - x, j - z) < rad);
  const onPath = (i: number, j: number) => paths.some(s => segDist(i, j, ...s) < 0.75 + Math.sin(i * 0.9 + j * 0.4) * 0.2);

  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = idx(i, j);
    let t: T = T.Herbe;
    if (def.pond) {
      const [pi, pj, pr] = def.pond;
      const d = Math.hypot(i - pi, (j - pj) * 0.8) + (noise(i * 0.5, j * 0.5) - 0.5) * 0.9;
      if (d < pr) t = T.Eau; else if (d < pr + 1.1) t = T.Sable;
    }
    if (def.cliff && j + (noise(i * 0.35, 3) - 0.5) * 3 < def.cliff && !isClear(i, j)) t = T.Falaise;
    if (onPath(i, j)) t = T.Chemin;
    tile[k] = t;
    if (t === T.Eau || t === T.Falaise) blocked[k] = 1;
  }

  // décor : densité forte sur les bords, clairières autour du chemin et des points d'intérêt
  const decor: Decor[] = [];
  const forest = def.ground === 'foret';
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = idx(i, j);
    const t = tile[k];
    const roll = r(), ox = (r() - 0.5) * 0.4, oz = (r() - 0.5) * 0.4, s = 0.85 + r() * 0.6, rot = r() * 6.28, v = r();
    if (t !== T.Herbe || isClear(i, j)) continue;
    const edge = Math.max(Math.abs(i - c), Math.abs(j - c)) / c;
    let dens = (forest ? 0.07 : 0.025) + Math.max(0, edge - 0.62) * (forest ? 2.6 : 1.9) + Math.max(0, noise(i * 0.25 + 40, j * 0.25 + 40) - 0.6) * (forest ? 1.2 : 0.6);
    if (onPathNear(i, j)) dens *= 0.2;
    if (roll < dens) { decor.push({ kind: r() < (forest ? 0.38 : 0.2) ? 'sapin' : 'arbre', x: i + ox, z: j + oz, s, rot, v }); blocked[k] = 1; }
    else if (roll < dens + 0.05) decor.push({ kind: 'buisson', x: i + ox, z: j + oz, s, rot, v });
    else if (roll < dens + 0.072) { decor.push({ kind: 'rocher', x: i + ox, z: j + oz, s, rot, v }); blocked[k] = 1; }
  }
  function onPathNear(i: number, j: number) { return paths.some(s => segDist(i, j, ...s) < 1.6); }

  // les cases de bord sont infranchissables sauf les portails
  for (let a = 0; a < N; a++) for (const [i, j] of [[a, 0], [a, N - 1], [0, a], [N - 1, a]]) {
    if (!portals.some(p => p.i === i && p.j === j)) blocked[idx(i, j)] = 1;
  }

  let cave: { i: number; j: number } | undefined;
  if (def.cave) {
    let j = def.cave.j;
    while (j < N - 1 && tile[idx(def.cave.i, j)] === T.Falaise) j++;
    cave = { i: def.cave.i, j: Math.max(1, j - 1) };
  }

  return { def, size: N, tile, blocked, decor, portals, spawn: { x: c, z: c }, cave };
}

export function isBlocked(m: MapData, x: number, z: number): boolean {
  const i = Math.round(x), j = Math.round(z);
  if (i < 0 || j < 0 || i >= m.size || j >= m.size) return true;
  return m.blocked[j * m.size + i] === 1;
}

/** Déplace un cercle de rayon `rad` en glissant le long des obstacles. */
export function moveWithCollision(m: MapData, x: number, z: number, dx: number, dz: number, rad = 0.28): { x: number; z: number } {
  const free = (px: number, pz: number) =>
    !isBlocked(m, px - rad, pz - rad) && !isBlocked(m, px + rad, pz - rad) && !isBlocked(m, px - rad, pz + rad) && !isBlocked(m, px + rad, pz + rad);
  // sous-pas pour ne jamais traverser une case
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.25));
  const sx = dx / steps, sz = dz / steps;
  for (let s = 0; s < steps; s++) {
    if (free(x + sx, z + sz)) { x += sx; z += sz; }
    else if (free(x + sx, z)) x += sx;
    else if (free(x, z + sz)) z += sz;
    else break;
  }
  return { x, z };
}

/** Case libre la plus proche (pour faire apparaître joueurs et monstres). */
export function nearestFree(m: MapData, x: number, z: number): { x: number; z: number } {
  for (let rad = 0; rad < m.size; rad++) {
    for (let dj = -rad; dj <= rad; dj++) for (let di = -rad; di <= rad; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== rad) continue;
      const i = Math.round(x) + di, j = Math.round(z) + dj;
      if (!isBlocked(m, i, j)) return { x: i, z: j };
    }
  }
  return { x, z };
}
