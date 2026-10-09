// Forme d'arc tenue en main, partagée par les arcs ; chaque arc choisit ses couleurs et ses ornements.

import { Cyl, THREE, type Builder } from '../kit';

export interface BowLook { wood: number; string?: number; radius?: number; thickness?: number }

/** Dessine l'arc et la flèche encochée ; renvoie les deux extrémités pour y poser des ornements. */
export function drawBow(b: Builder, l: BowLook) {
  const R = l.radius ?? 0.34, arc = Math.PI * 0.86;
  const bow = new THREE.TorusGeometry(R, l.thickness ?? 0.018, 5, 22, arc);
  bow.rotateZ(-Math.PI * 0.43); bow.rotateY(-Math.PI / 2);
  const cx = 0.15, cy = 0.9, cz = 0.34 - R;
  b.add(bow, l.wood, cx, cy, cz);
  const sz = cz + R * Math.cos(Math.PI * 0.43), half = R * Math.sin(Math.PI * 0.43);
  b.add(Cyl(0.006, 0.006, half * 2, 3), l.string ?? 0xf5f0e0, cx, cy, sz);
  b.add(Cyl(0.008, 0.008, 0.42, 4), 0xd9c9a0, 0.08, 0.92, 0.25, { rot: [Math.PI / 2, 0, 0] });
  return { top: [cx, cy + half, sz] as const, bottom: [cx, cy - half, sz] as const, grip: [cx, cy, 0.34] as const };
}
