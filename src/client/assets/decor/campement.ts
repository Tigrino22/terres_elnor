// Campement de la carte de départ : feu de camp (cercle de pierres, bûches, flammes) et tentes.
import { Builder, MAT, THREE, glowSprite } from '../kit';

export function feuDeCampModel() {
  const g = new THREE.Group();
  const b = new Builder();
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    b.add(new THREE.DodecahedronGeometry(0.11, 0), 0x8a8478, Math.cos(a) * 0.42, 0.07, Math.sin(a) * 0.42);
  }
  for (const a of [0, 1.1, 2.2]) b.add(new THREE.CylinderGeometry(0.05, 0.06, 0.62, 6), 0x5a3a20, 0, 0.1, 0, { rot: [Math.PI / 2, a, 0] });
  b.add(new THREE.ConeGeometry(0.2, 0.55, 6), 0xff8a2a, 0, 0.42, 0, { emissive: true });
  b.add(new THREE.ConeGeometry(0.11, 0.38, 5), 0xffe07a, 0.02, 0.4, 0.02, { emissive: true });
  const m = new THREE.Mesh(b.bake(), MAT);
  m.castShadow = true; m.userData.own = true;
  g.add(m);
  const gl = glowSprite(0xffa040, 2.2, 0.8); gl.position.set(0, 0.5, 0); g.add(gl);
  const lum = new THREE.PointLight(0xffa050, 6, 6, 1.6); lum.position.set(0, 0.9, 0); g.add(lum);
  return g;
}

/** Tente de toile, ouverte vers l'avant (+z). `couleur` : toile. */
export function tenteModel(couleur = 0xc9a86a) {
  const b = new Builder();
  b.add(new THREE.ConeGeometry(0.75, 1.1, 4), couleur, 0, 0.55, 0, { rot: [0, Math.PI / 4, 0] });
  b.add(new THREE.BoxGeometry(0.34, 0.5, 0.05), 0x2a1c10, 0, 0.25, 0.5);
  b.add(new THREE.CylinderGeometry(0.025, 0.025, 1.45, 5), 0x5a3a20, 0, 0.72, 0);
  b.add(new THREE.BoxGeometry(0.22, 0.14, 0.01), 0xb8322a, 0.11, 1.32, 0);
  const m = new THREE.Mesh(b.bake(), MAT);
  m.castShadow = true; m.userData.own = true;
  return m;
}
