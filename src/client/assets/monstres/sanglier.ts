// Sanglier des plaines : corps brun trapu, crête de soies, défenses ivoire.
import { Box, Cone, Cyl, Ico, Sph } from '../kit';
import type { MobArt } from '../types';

export const sanglier: MobArt = {
  scale: 1, labelY: 1.05,
  build(b) {
    const hide = 0x6b4a32, dark = 0x4a3222;
    b.add(Ico(0.3, 1), hide, 0, 0.36, -0.02, { scale: [0.9, 0.85, 1.3] });
    b.add(Ico(0.2, 1), dark, 0, 0.42, 0.28);
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
  },
};
