// Grisecroc, l'alpha : loup géant au pelage sombre, crête d'os et crocs sortis.
import { Box, Cone, Cyl, Ico, Sph } from '../kit';
import type { MobArt } from '../types';

export const alpha: MobArt = {
  scale: 1.45, labelY: 1.65,
  build(b) {
    const fur = 0x4a4f58, fur2 = 0x737a84;
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
      b.add(Cone(0.03, 0.16, 5), 0xe8e0c8, sx * 0.05, 0.58, 0.62, { rot: [Math.PI / 2 + 0.6, 0, 0] });
    }
    b.add(Cone(0.07, 0.45, 6), fur2, 0, 0.5, -0.55, { rot: [-2.1, 0, 0] });
    for (let k = 0; k < 5; k++) b.add(Cone(0.035, 0.16, 4), 0xd9d2c0, 0, 0.66 - k * 0.015, 0.15 - k * 0.12, { rot: [-0.5, 0, 0] });
  },
};
