// Entrée de grotte : porche de pierre, ouverture noire, deux torches.
import { Builder, MAT, THREE, glowSprite } from '../kit';

export function grotteModel() {
  const g = new THREE.Group();
  const b = new Builder();
  b.add(new THREE.CylinderGeometry(0.62, 0.62, 0.3, 16, 1, false, 0, Math.PI), 0x0c0a08, 0, 0.62, 0, { rot: [Math.PI / 2, 0, Math.PI / 2] });
  b.add(new THREE.BoxGeometry(1.24, 0.62, 0.3), 0x0c0a08, 0, 0.31, 0);
  for (const sx of [-1, 1]) {
    b.add(new THREE.BoxGeometry(0.22, 1.2, 0.36), 0x5a4a3a, sx * 0.72, 0.6, 0.02);
    b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 5), 0x4a3020, sx * 0.95, 0.9, 0.2);
    b.add(new THREE.IcosahedronGeometry(0.07, 0), 0xffb040, sx * 0.95, 1.12, 0.2, { emissive: true });
  }
  b.add(new THREE.BoxGeometry(1.7, 0.2, 0.4), 0x5a4a3a, 0, 1.22, 0.02);
  const cave = new THREE.Mesh(b.bake(), MAT);
  cave.castShadow = true; cave.userData.own = true;
  g.add(cave);
  for (const sx of [-1, 1]) { const gl = glowSprite(0xffa040, 0.9, 0.6); gl.position.set(sx * 0.95, 1.12, 0.2); g.add(gl); }
  return g;
}
