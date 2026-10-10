// Boîte à outils commune à tous les éléments graphiques : assemblage de primitives
// low-poly, matériaux partagés, aides pour les icônes SVG et les halos lumineux.
// Rien ici ne décrit un élément précis : chaque élément du jeu a son propre fichier.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export { THREE };
export type V3 = [number, number, number];
interface PartOpts { rot?: V3; scale?: V3; emissive?: boolean }

/** Collecte des primitives colorées, puis fusion en une seule géométrie (un appel de dessin). */
export class Builder {
  parts: THREE.BufferGeometry[] = [];
  private stack: THREE.Matrix4[] = [new THREE.Matrix4()];
  push(pos: V3, rot: V3 = [0, 0, 0], scale = 1) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(scale, scale, scale));
    this.stack.push(this.top.clone().multiply(m));
    return this;
  }
  pop() { this.stack.pop(); return this; }
  get top() { return this.stack[this.stack.length - 1]; }
  add(geo: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0, o: PartOpts = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(o.rot ?? [0, 0, 0]))),
      new THREE.Vector3(...(o.scale ?? [1, 1, 1])),
    );
    g.applyMatrix4(this.top.clone().multiply(m));
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    const c = new THREE.Color(color);
    if (o.emissive) c.multiplyScalar(1.6);
    const n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.parts.push(g);
    geo.dispose();
    return this;
  }
  bake(): THREE.BufferGeometry {
    const g = mergeGeometries(this.parts, false)!;
    g.computeVertexNormals();
    g.computeBoundingSphere();
    this.parts.forEach(p => p.dispose());
    return g;
  }
}

export const MAT = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, metalness: 0 });

// primitives
export const Cyl = (a: number, b: number, h: number, s = 7) => new THREE.CylinderGeometry(a, b, h, s);
export const Sph = (r: number, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h);
export const Ico = (r: number, d = 0) => new THREE.IcosahedronGeometry(r, d);
export const Box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);
export const Cone = (r: number, h: number, s = 6) => new THREE.ConeGeometry(r, h, s);
export const Dodeca = (r: number) => new THREE.DodecahedronGeometry(r, 0);
export const Octa = (r: number) => new THREE.OctahedronGeometry(r, 0);
export const Torus = (r: number, t: number, rs: number, ts: number, arc?: number) => new THREE.TorusGeometry(r, t, rs, ts, arc);
/** Calotte de sphère (cheveux, capuche, casque). */
export const Cap = (r: number, open: number, w = 12, h = 8) => new THREE.SphereGeometry(r, w, h, 0, Math.PI * 2, 0, Math.PI * open);

const cache = new Map<string, THREE.BufferGeometry>();
/** Une géométrie n'est cuite qu'une fois par clé, puis partagée. */
export function cached(key: string, make: () => THREE.BufferGeometry) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key)!;
}
export const meshOf = (g: THREE.BufferGeometry) => { const m = new THREE.Mesh(g, MAT); m.castShadow = true; m.receiveShadow = true; return m; };
export const bakeWith = (draw: (b: Builder) => void) => { const b = new Builder(); draw(b); return b.bake(); };

// ---------------------------------------------------------------- icônes (SVG 64 × 64)
/** Fond dégradé commun à toutes les icônes ; `bg` = [clair, sombre]. */
export const icon = (inner: string, bg: readonly [string, string]) => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs>
<radialGradient id="g${bg[0].slice(1)}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></radialGradient></defs>
<rect width="64" height="64" rx="6" fill="url(#g${bg[0].slice(1)})"/>${inner}</svg>`;

/** Fonds d'icône par famille. */
export const BG = {
  nature: ['#6fae4f', '#1d3a1a'], vent: ['#7fd6e6', '#163a4a'], feu: ['#f2a04a', '#4a1a0e'], bois: ['#c79a5a', '#3a2412'],
  sang: ['#e06060', '#3a0e0e'], mana: ['#6aa0f0', '#0e1e48'], ombre: ['#8a7ab8', '#1e1638'], pierre: ['#a59f92', '#2e2b26'],
  or: ['#f0cd6a', '#5a3a0e'], cendre: ['#3a352d', '#15120e'],
} as const;

/** Flèche dessinée dans une icône. */
export const arrowSvg = (x1: number, y1: number, x2: number, y2: number, c = '#f6efd8') => {
  const a = Math.atan2(y2 - y1, x2 - x1), hx = x2 - Math.cos(a) * 9, hy = y2 - Math.sin(a) * 9, px = Math.sin(a) * 5, py = -Math.cos(a) * 5;
  return `<line x1="${x1}" y1="${y1}" x2="${hx}" y2="${hy}" stroke="${c}" stroke-width="3" stroke-linecap="round"/>
  <polygon points="${x2},${y2} ${hx + px},${hy + py} ${hx - px},${hy - py}" fill="#e8ecf0"/>
  <path d="M${x1} ${y1} l${-Math.cos(a - 0.6) * 8} ${-Math.sin(a - 0.6) * 8} M${x1} ${y1} l${-Math.cos(a + 0.6) * 8} ${-Math.sin(a + 0.6) * 8}" stroke="#d9e8c8" stroke-width="2.4"/>`;
};

// ---------------------------------------------------------------- halos
let glowTex: THREE.Texture | null = null;
export function glowTexture() {
  if (glowTex) return glowTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d')!, g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(cv);
  return glowTex;
}
export function glowSprite(color: number, size: number, opacity = 0.5) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  sp.scale.set(size, size, size);
  return sp;
}
