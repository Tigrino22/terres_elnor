// Modèles low-poly du jeu, construits en code (style de la première maquette).
// Chaque modèle est assemblé en primitives puis « cuit » en une seule géométrie
// à couleurs de sommets : un seul appel de dessin par personnage ou par type de décor.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '../shared/rng';

type V3 = [number, number, number];
interface PartOpts { rot?: V3; scale?: V3; emissive?: boolean }

/** Collecte des primitives colorées, puis fusion en une géométrie. */
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
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
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
export const GLOW_MAT = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });

const Cyl = (a: number, b: number, h: number, s = 7) => new THREE.CylinderGeometry(a, b, h, s);
const Sph = (r: number, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h);
const Ico = (r: number, d = 0) => new THREE.IcosahedronGeometry(r, d);
const Box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);
const Cone = (r: number, h: number, s = 6) => new THREE.ConeGeometry(r, h, s);

const cache = new Map<string, THREE.BufferGeometry>();
function cached(key: string, make: () => THREE.BufferGeometry) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key)!;
}
const meshOf = (g: THREE.BufferGeometry) => { const m = new THREE.Mesh(g, MAT); m.castShadow = true; m.receiveShadow = true; return m; };

// ---------------------------------------------------------------- personnages
const SKIN = 0xeccaa4;

function archer(b: Builder, race: 'elfe' | 'humain') {
  const elf = race === 'elfe';
  const boots = 0x4a3220, trousers = elf ? 0x3c4a2e : 0x4a3a2e, tunic = elf ? 0x5d9046 : 0x8a3a2a, tunic2 = elf ? 0x46733a : 0x6e2c20, leather = 0x7a5532;
  const hair = elf ? 0xeadfae : 0x5a3a22, cape = elf ? 0x2b4a2a : 0x2e3550;
  for (const sx of [-1, 1]) {
    b.add(Cyl(0.055, 0.065, 0.2), boots, sx * 0.075, 0.1, 0.01);
    b.add(Cyl(0.05, 0.055, 0.3), trousers, sx * 0.075, 0.34, 0);
  }
  b.add(Cyl(0.15, 0.22, 0.36, 9), tunic, 0, 0.62, 0);
  b.add(Cyl(0.162, 0.162, 0.045, 9), leather, 0, 0.53, 0);
  b.add(Box(0.05, 0.04, 0.02), 0xd9b44a, 0, 0.53, 0.16);
  b.add(Cyl(0.18, 0.15, 0.22, 9), tunic2, 0, 0.84, 0);
  b.add(Cyl(0.1, 0.19, 0.06, 9), elf ? 0x7cae55 : 0xb8a070, 0, 0.95, 0);
  for (const sx of [-1, 1]) b.add(Sph(0.075, 8, 6), leather, sx * 0.19, 0.92, 0);
  b.add(Cyl(0.045, 0.05, 0.06), SKIN, 0, 0.99, 0);
  b.add(Sph(0.125, 12, 10), SKIN, 0, 1.09, 0);
  b.add(new THREE.SphereGeometry(0.135, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), hair, 0, 1.1, -0.012, { rot: [-0.35, 0, 0] });
  if (elf) b.add(Cyl(0.085, 0.12, 0.34, 9), hair, 0, 0.95, -0.075, { rot: [0.12, 0, 0] });
  else b.add(Cyl(0.09, 0.1, 0.12, 9), hair, 0, 1.05, -0.06);
  for (const sx of [-1, 1]) {
    if (elf) b.add(Cone(0.028, 0.15, 5), SKIN, sx * 0.14, 1.12, -0.01, { rot: [0, 0, -sx * (Math.PI / 2 - 0.45)] });
    else b.add(Sph(0.03, 6, 5), SKIN, sx * 0.125, 1.09, 0);
    b.add(Sph(0.016, 6, 5), elf ? 0x2e5f3a : 0x3a2a1a, sx * 0.045, 1.1, 0.112);
  }
  if (elf) b.add(new THREE.TorusGeometry(0.128, 0.008, 4, 20), 0xd8c070, 0, 1.13, 0, { rot: [Math.PI / 2 + 0.18, 0, 0] });
  else b.add(Box(0.12, 0.04, 0.03), hair, 0, 1.0, 0.1);
  b.add(Box(0.34, 0.6, 0.02), cape, 0, 0.66, -0.19, { rot: [0.18, 0, 0] });
  b.add(Cyl(0.05, 0.045, 0.38), leather, -0.08, 0.86, -0.2, { rot: [0.25, 0, 0.45] });
  for (let k = 0; k < 3; k++) b.add(Cone(0.02, 0.07, 4), 0xf1ece0, -0.17 + k * 0.025, 1.05 + k * 0.01, -0.25, { rot: [0.25, 0, 0.45] });
  b.add(Cyl(0.038, 0.042, 0.34), tunic2, 0.17, 0.9, 0.16, { rot: [Math.PI / 2, 0, -0.1] });
  b.add(Sph(0.035, 6, 5), SKIN, 0.15, 0.9, 0.34);
  b.add(Cyl(0.038, 0.042, 0.3), tunic2, -0.12, 0.92, 0.07, { rot: [Math.PI / 2 - 0.3, 0, 0.9] });
  b.add(Sph(0.035, 6, 5), SKIN, 0, 0.93, 0.07);
  const R = 0.34, bow = new THREE.TorusGeometry(R, 0.018, 5, 22, Math.PI * 0.86);
  bow.rotateZ(-Math.PI * 0.43); bow.rotateY(-Math.PI / 2);
  b.add(bow, 0x6e4322, 0.15, 0.9, 0.34 - R);
  b.add(Cyl(0.006, 0.006, 0.58, 3), 0xf5f0e0, 0.15, 0.9, 0.34 - R + R * Math.cos(Math.PI * 0.43));
  b.add(Cyl(0.008, 0.008, 0.42, 4), 0xd9c9a0, 0.08, 0.92, 0.25, { rot: [Math.PI / 2, 0, 0] });
}

export function playerModel(race: 'elfe' | 'humain') {
  return meshOf(cached('p-' + race, () => { const b = new Builder(); archer(b, race); return b.bake(); }));
}

function wolfGeo(alpha: boolean) {
  const b = new Builder();
  const fur = alpha ? 0x4a4f58 : 0x67707b, fur2 = alpha ? 0x737a84 : 0x9aa3ac;
  b.add(Ico(0.3, 1), fur, 0, 0.42, -0.05, { scale: [0.85, 0.78, 1.35] });
  b.add(Ico(0.24, 1), fur2, 0, 0.5, 0.22, { scale: [0.95, 1.05, 0.9] });
  b.add(Ico(0.15, 1), fur, 0, 0.66, 0.42, { scale: [0.95, 0.9, 1.1] });
  b.add(Box(0.1, 0.09, 0.2), fur2, 0, 0.62, 0.58);
  b.add(Sph(0.025, 6, 5), 0x1a1a1a, 0, 0.64, 0.69);
  b.add(Box(0.09, 0.03, 0.16), 0x2a2224, 0, 0.575, 0.57);
  for (const sx of [-1, 1]) {
    b.add(Cone(0.045, 0.13, 4), fur, sx * 0.07, 0.8, 0.38, { rot: [-0.2, 0, -sx * 0.25] });
    b.add(Sph(0.026, 6, 5), 0xff3a1e, sx * 0.055, 0.69, 0.53, { emissive: true });
    b.add(Cyl(0.045, 0.035, 0.36, 6), fur, sx * 0.12, 0.18, 0.25);
    b.add(Cyl(0.05, 0.035, 0.36, 6), fur, sx * 0.12, 0.18, -0.3);
  }
  b.add(Cone(0.07, 0.45, 6), fur2, 0, 0.5, -0.55, { rot: [-2.1, 0, 0] });
  if (alpha) {
    for (let k = 0; k < 5; k++) b.add(Cone(0.035, 0.16, 4), 0xd9d2c0, 0, 0.66 - k * 0.015, 0.15 - k * 0.12, { rot: [-0.5, 0, 0] });
    for (const sx of [-1, 1]) b.add(Cone(0.03, 0.16, 5), 0xe8e0c8, sx * 0.05, 0.58, 0.62, { rot: [Math.PI / 2 + 0.6, 0, 0] });
  }
  return b.bake();
}

function boarGeo() {
  const b = new Builder();
  const hide = 0x6b4a32, dark = 0x4a3222;
  b.add(Ico(0.3, 1), hide, 0, 0.36, -0.02, { scale: [0.9, 0.85, 1.3] });
  b.add(Ico(0.2, 1), dark, 0, 0.42, 0.28, { scale: [1, 1, 1] });
  b.add(Box(0.16, 0.14, 0.18), hide, 0, 0.36, 0.45);
  b.add(Cyl(0.06, 0.07, 0.04, 8), 0xc89a88, 0, 0.36, 0.55, { rot: [Math.PI / 2, 0, 0] });
  for (let k = 0; k < 6; k++) b.add(Cone(0.03, 0.12, 4), 0x2e2016, 0, 0.62 - k * 0.012, 0.22 - k * 0.1, { rot: [-0.3, 0, 0] });
  for (const sx of [-1, 1]) {
    b.add(Cone(0.02, 0.14, 5), 0xf0e6cc, sx * 0.08, 0.36, 0.52, { rot: [-0.9, 0, sx * 0.4] });
    b.add(Sph(0.02, 6, 5), 0x150c08, sx * 0.07, 0.46, 0.44);
    b.add(Cone(0.04, 0.09, 4), dark, sx * 0.09, 0.56, 0.34, { rot: [0.3, 0, -sx * 0.4] });
    b.add(Cyl(0.05, 0.04, 0.22, 6), dark, sx * 0.13, 0.11, 0.22);
    b.add(Cyl(0.05, 0.04, 0.22, 6), dark, sx * 0.13, 0.11, -0.24);
  }
  return b.bake();
}

function gorrokGeo() {
  const b = new Builder();
  const skin = 0x6a7a4a, leather = 0x4a3020, iron = 0x6c6a66, red = 0x7a1e14;
  for (const sx of [-1, 1]) {
    b.add(Cyl(0.07, 0.08, 0.34, 6), 0x2e2418, sx * 0.1, 0.17, 0);
    b.add(Sph(0.09, 7, 5), skin, sx * 0.27, 0.72, 0.02);
  }
  b.add(Cyl(0.2, 0.24, 0.42, 8), leather, 0, 0.55, 0);
  b.add(Box(0.32, 0.18, 0.06), iron, 0, 0.66, 0.17);
  b.add(Cyl(0.25, 0.25, 0.06, 8), red, 0, 0.36, 0);
  b.add(Ico(0.15, 1), skin, 0, 0.92, 0.04, { scale: [1, 0.95, 1.05] });
  b.add(Box(0.18, 0.06, 0.06), skin, 0, 0.86, 0.15);
  for (const sx of [-1, 1]) {
    b.add(Cone(0.018, 0.07, 4), 0xf0e6cc, sx * 0.06, 0.88, 0.18, { rot: [0, 0, 0] });
    b.add(Sph(0.02, 5, 4), 0xffb020, sx * 0.05, 0.95, 0.15, { emissive: true });
    b.add(Cone(0.04, 0.12, 4), skin, sx * 0.15, 0.97, 0.0, { rot: [0, 0, -sx * 1.2] });
  }
  b.add(new THREE.SphereGeometry(0.16, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.45), iron, 0, 0.97, 0);
  b.add(Cone(0.03, 0.14, 4), 0xc8c0b0, 0, 1.13, 0);
  // hachoir
  b.push([-0.3, 0.6, 0.1], [0.6, 0, 0.3]);
  b.add(Cyl(0.02, 0.025, 0.5, 5), 0x4a3020, 0, 0.12, 0);
  b.add(Box(0.03, 0.22, 0.14), 0x8a8780, 0, 0.36, 0.06);
  b.pop();
  // bouclier rond
  b.push([0.32, 0.55, 0.08], [0, 0.6, 0]);
  b.add(Cyl(0.18, 0.18, 0.04, 10), 0x4a3424, 0, 0, 0, { rot: [Math.PI / 2, 0, 0] });
  b.add(Sph(0.05, 6, 4), iron, 0, 0, 0.03);
  b.pop();
  return b.bake();
}

export function mobModel(model: string) {
  const g = cached('m-' + model, () =>
    model === 'loup' ? wolfGeo(false) : model === 'alpha' ? wolfGeo(true) : model === 'sanglier' ? boarGeo() : gorrokGeo());
  const m = meshOf(g);
  if (model === 'alpha') m.scale.setScalar(1.45);
  return m;
}

// ---------------------------------------------------------------- décor
export function treeGeo(variant: number) {
  const r = rng(100 + variant), b = new Builder();
  b.add(Cyl(0.07, 0.12, 0.75, 6), 0x5b3b22, 0, 0.37, 0);
  b.add(Cyl(0.03, 0.05, 0.35, 5), 0x5b3b22, 0.12, 0.7, 0, { rot: [0, 0, -0.7] });
  const greens = [[0x3f6b2a, 0x4f8233, 0x365f24, 0x5b8c38], [0x4a7a2e, 0x5e9238, 0x3c6a28, 0x6a9a3e], [0x56702a, 0x6a8a30, 0x485e24, 0x7a9638]][variant % 3];
  for (const [x, y, z, rad] of [[0, 1.15, 0, 0.48], [0.3, 0.95, 0.1, 0.36], [-0.28, 0.98, -0.05, 0.38], [0.05, 0.92, 0.32, 0.34], [-0.05, 1.45, -0.05, 0.32]])
    b.add(Ico(rad), greens[Math.floor(r() * 4)], x, y, z, { rot: [r(), r(), r()] });
  return b.bake();
}
export function pineGeo(variant: number) {
  const b = new Builder(), col = variant ? 0x2a4f2d : 0x2f5a33;
  b.add(Cyl(0.06, 0.1, 0.5, 6), 0x4e321d, 0, 0.25, 0);
  b.add(Cone(0.55, 0.75, 7), col, 0, 0.75, 0);
  b.add(Cone(0.43, 0.65, 7), col, 0, 1.15, 0, { rot: [0, 0.4, 0] });
  b.add(Cone(0.3, 0.55, 7), col, 0, 1.5, 0, { rot: [0, 0.8, 0] });
  return b.bake();
}
export function bushGeo() {
  const b = new Builder();
  b.add(Ico(0.26), 0x46782d, 0, 0.16, 0, { scale: [1.2, 0.8, 1] });
  b.add(Ico(0.18), 0x558a35, 0.18, 0.14, 0.05, { rot: [0.5, 0.3, 0] });
  b.add(Ico(0.05), 0xf2d14b, 0.05, 0.32, 0.1);
  return b.bake();
}
export function rockGeo() {
  const b = new Builder();
  b.add(new THREE.DodecahedronGeometry(0.28, 0), 0x8d8a80, 0, 0.14, 0, { scale: [1.3, 0.8, 1], rot: [0.3, 0.5, 0.2] });
  b.add(new THREE.DodecahedronGeometry(0.15, 0), 0x7c7a71, 0.26, 0.08, 0.12, { rot: [0.6, 0.2, 0.4] });
  return b.bake();
}

// ---------------------------------------------------------------- ressources et butin
export function nodeModel(kind: string) {
  const g = cached('n-' + kind, () => {
    const b = new Builder(), r = rng(7);
    if (kind === 'frene') {
      b.add(Cyl(0.08, 0.13, 0.9, 6), 0xc8b89a, 0, 0.45, 0);
      for (const [x, y, z, rad] of [[0, 1.25, 0, 0.45], [0.28, 1.05, 0.1, 0.32], [-0.26, 1.08, -0.05, 0.34], [0, 1.55, 0, 0.28]])
        b.add(Ico(rad), [0x8ab84a, 0x9cc858, 0x7aa83e][Math.floor(r() * 3)], x, y, z, { rot: [r(), r(), r()] });
      b.add(Box(0.22, 0.04, 0.04), 0xe0c070, 0.12, 0.42, 0.12, { rot: [0, 0.6, 0] });
    } else if (kind === 'cuivre') {
      b.add(new THREE.DodecahedronGeometry(0.34, 0), 0x77736b, 0, 0.18, 0, { scale: [1.3, 0.85, 1.1], rot: [0.3, 0.5, 0.1] });
      b.add(new THREE.DodecahedronGeometry(0.2, 0), 0x6a665f, 0.3, 0.1, 0.15, { rot: [0.4, 0.1, 0.7] });
      for (let k = 0; k < 6; k++) b.add(new THREE.OctahedronGeometry(0.07 + r() * 0.05, 0), 0xe0874a, (r() - 0.5) * 0.45, 0.3 + r() * 0.15, (r() - 0.5) * 0.35, { scale: [0.7, 1.6, 0.7], rot: [r() - 0.5, 0, r() - 0.5], emissive: true });
    } else {
      for (let k = 0; k < 7; k++) b.add(Cone(0.03, 0.3, 3), 0x3f7a35, (r() - 0.5) * 0.22, 0.14, (r() - 0.5) * 0.22, { rot: [(r() - 0.5) * 0.6, 0, (r() - 0.5) * 0.6] });
      for (const [a, y, c] of [[0, 0.32, 0], [0.08, 0.27, 0.05], [-0.07, 0.25, -0.04], [0.02, 0.24, -0.08]]) b.add(Ico(0.05), 0x9fd8ff, a, y, c, { emissive: true });
    }
    return b.bake();
  });
  return meshOf(g);
}

export function lootModel() {
  return meshOf(cached('loot', () => {
    const b = new Builder();
    b.add(Sph(0.13, 9, 7), 0x8a6a3e, 0, 0.12, 0, { scale: [1, 0.9, 1] });
    b.add(Cone(0.06, 0.1, 6), 0x8a6a3e, 0, 0.26, 0, { rot: [Math.PI, 0, 0] });
    b.add(new THREE.TorusGeometry(0.045, 0.012, 4, 10), 0xc9a24a, 0, 0.23, 0, { rot: [Math.PI / 2, 0, 0] });
    return b.bake();
  }));
}

export function trapModel() {
  return meshOf(cached('trap', () => {
    const b = new Builder(), r = rng(9);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      b.add(Cone(0.035, 0.28, 4), 0x4a2a12, Math.cos(a) * 0.4, 0.12, Math.sin(a) * 0.4, { rot: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5] });
      if (r() < 0.5) b.add(Ico(0.04), 0xe06a8a, Math.cos(a) * 0.36, 0.22, Math.sin(a) * 0.36);
    }
    b.add(new THREE.TorusGeometry(0.4, 0.04, 4, 18), 0x3a5a22, 0, 0.03, 0, { rot: [Math.PI / 2, 0, 0] });
    return b.bake();
  }));
}

// ---------------------------------------------------------------- textures utilitaires
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

let beamTex: THREE.Texture | null = null;
function beamTexture() {
  if (beamTex) return beamTex;
  const cv = document.createElement('canvas'); cv.width = 8; cv.height = 128;
  const c = cv.getContext('2d')!, g = c.createLinearGradient(0, 128, 0, 0);
  g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 8, 128);
  beamTex = new THREE.CanvasTexture(cv);
  return beamTex;
}

let runeTex: THREE.Texture | null = null;
function runeTexture() {
  if (runeTex) return runeTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const c = cv.getContext('2d')!;
  c.translate(128, 128);
  c.strokeStyle = '#fff'; c.lineWidth = 7;
  c.beginPath(); c.arc(0, 0, 112, 0, Math.PI * 2); c.stroke();
  c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 92, 0, Math.PI * 2); c.stroke();
  c.lineWidth = 5;
  for (let k = 0; k < 12; k++) {
    c.save(); c.rotate((k / 12) * Math.PI * 2);
    c.beginPath(); c.moveTo(-6, -104); c.lineTo(0, -96); c.lineTo(6, -104); c.moveTo(0, -96); c.lineTo(0, -88); c.stroke();
    c.restore();
  }
  runeTex = new THREE.CanvasTexture(cv);
  return runeTex;
}

/**
 * Portail de bord de carte, volontairement très visible : arche de pierre,
 * colonne de lumière, cercle de runes qui tourne, flèche qui flotte et particules.
 */
export function portalModel(dir: number, open: boolean) {
  const g = new THREE.Group();
  const col = open ? 0xffd36a : 0x8a8f9a, rune = open ? 0x7ff0ff : 0x9aa0aa;
  // arche
  const b = new Builder();
  for (const sx of [-1, 1]) {
    b.add(Box(0.22, 1.7, 0.26), 0x8d877a, sx * 0.72, 0.85, 0);
    b.add(Box(0.3, 0.18, 0.34), 0x77726a, sx * 0.72, 0.09, 0);
    b.add(Box(0.04, 0.5, 0.02), rune, sx * 0.72, 1.0, 0.135, { emissive: true });
  }
  b.add(Box(1.8, 0.24, 0.32), 0x8d877a, 0, 1.78, 0);
  b.add(Box(0.3, 0.3, 0.36), 0x77726a, 0, 1.78, 0, { rot: [0, 0, Math.PI / 4] });
  b.add(Ico(0.09), rune, 0, 1.78, 0.2, { emissive: true });
  const arch = meshOf(b.bake());
  arch.rotation.y = dir;
  g.add(arch);
  // colonne de lumière
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.62, 3.6, 28, 1, true),
    new THREE.MeshBasicMaterial({ map: beamTexture(), color: col, transparent: true, opacity: open ? 0.55 : 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  beam.position.y = 1.8;
  g.add(beam);
  // cercle de runes au sol
  const ring = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 1.9),
    new THREE.MeshBasicMaterial({ map: runeTexture(), color: col, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04;
  g.add(ring);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.95, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.25, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.03;
  g.add(disc);
  // flèche flottante
  const sh = new THREE.Shape();
  sh.moveTo(0, 0.32); sh.lineTo(0.26, 0.02); sh.lineTo(0.1, 0.02); sh.lineTo(0.1, -0.28); sh.lineTo(-0.1, -0.28); sh.lineTo(-0.1, 0.02); sh.lineTo(-0.26, 0.02); sh.closePath();
  const ag = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false });
  ag.rotateX(-Math.PI / 2); ag.translate(0, 0, 0);
  const arrow = new THREE.Mesh(ag, new THREE.MeshBasicMaterial({ color: open ? 0xffe8a0 : 0xb0b4bc, toneMapped: false }));
  const arrowHolder = new THREE.Group();
  arrowHolder.rotation.y = dir;
  arrowHolder.add(arrow);
  arrow.position.y = 2.35;
  g.add(arrowHolder);
  const glow = glowSprite(col, 3.4, open ? 0.5 : 0.2);
  glow.position.y = 0.9;
  g.add(glow);
  // particules
  const N = 26, pos = new Float32Array(N * 3), seeds: number[] = [];
  const r = rng(3);
  for (let k = 0; k < N; k++) seeds.push(r() * 10, r() * Math.PI * 2, 0.2 + r() * 0.5);
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: open ? 0xfff0b0 : 0xcfd4dc, size: 0.09, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(pts);
  const update = (t: number) => {
    ring.rotation.z = t * (open ? 0.8 : 0.2);
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    (beam.material as THREE.MeshBasicMaterial).opacity = (open ? 0.4 : 0.18) + pulse * (open ? 0.25 : 0.06);
    glow.material.opacity = (open ? 0.35 : 0.15) + pulse * 0.2;
    arrow.position.y = 2.35 + Math.sin(t * 2.5) * 0.12;
    arrow.position.z = 0;
    for (let k = 0; k < N; k++) {
      const ph = (seeds[k * 3] + t * 0.45) % 1, a = seeds[k * 3 + 1] + t * 0.6, rad = seeds[k * 3 + 2];
      pos[k * 3] = Math.cos(a) * rad; pos[k * 3 + 1] = ph * 3; pos[k * 3 + 2] = Math.sin(a) * rad;
    }
    pg.attributes.position.needsUpdate = true;
  };
  return { group: g, update };
}
