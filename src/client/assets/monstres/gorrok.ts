// Éclaireur gorrok : peau olivâtre, casque de fer à pointe, hachoir et bouclier rond.
import { Box, Cap, Cone, Cyl, Ico, Sph } from '../kit';
import type { MobArt } from '../types';

export const gorrok: MobArt = {
  scale: 1, labelY: 1.35,
  build(b) {
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
      b.add(Cone(0.018, 0.07, 4), 0xf0e6cc, sx * 0.06, 0.88, 0.18);
      b.add(Sph(0.02, 5, 4), 0xffb020, sx * 0.05, 0.95, 0.15, { emissive: true });
      b.add(Cone(0.04, 0.12, 4), skin, sx * 0.15, 0.97, 0.0, { rot: [0, 0, -sx * 1.2] });
    }
    b.add(Cap(0.16, 0.45, 8, 6), iron, 0, 0.97, 0);
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
  },
};
