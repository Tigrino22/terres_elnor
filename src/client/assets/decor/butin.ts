// Sac de butin laissé par un monstre, avec son halo doré.
import { Builder, Cone, Sph, THREE, cached, glowSprite, meshOf } from '../kit';

export const BUTIN_HALO = 0xffe9a8;

export function butinModel() {
  const g = new THREE.Group();
  g.add(meshOf(cached('butin', () => {
    const b = new Builder();
    b.add(Sph(0.13, 9, 7), 0x8a6a3e, 0, 0.12, 0, { scale: [1, 0.9, 1] });
    b.add(Cone(0.06, 0.1, 6), 0x8a6a3e, 0, 0.26, 0, { rot: [Math.PI, 0, 0] });
    b.add(new THREE.TorusGeometry(0.045, 0.012, 4, 10), 0xc9a24a, 0, 0.23, 0, { rot: [Math.PI / 2, 0, 0] });
    return b.bake();
  })));
  const gl = glowSprite(0xffd36a, 1.1, 0.55); gl.position.y = 0.2; g.add(gl);
  return g;
}
