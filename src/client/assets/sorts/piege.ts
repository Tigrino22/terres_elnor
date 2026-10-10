// Piège de ronces : icône, couleur de l'éclat au sol et modèle 3D posé par terre.
import { BG, Builder, Cone, Ico, THREE, cached, icon, meshOf } from '../kit';
import { rng } from '../../../shared/rng';
import type { SpellArt } from '../types';

export const piege: SpellArt = {
  icon: icon(`<path d="M10 50 Q20 30 32 44 Q44 28 54 50" stroke="#4a2a12" stroke-width="5" fill="none"/><path d="M14 44 l-4 -6 M24 36 l-2 -7 M33 42 l1 -8 M42 34 l2 -7 M50 44 l5 -5" stroke="#cfe8a0" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="20" r="6" fill="#e06a8a"/>`, BG.nature),
  ground: 0x8ae05a,
};

/** Couronne de ronces posée au sol ; aussi affichée sous un monstre immobilisé. */
export function trapModel() {
  return meshOf(cached('piege', () => {
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
