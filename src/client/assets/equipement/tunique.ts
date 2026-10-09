// Tunique de cuir : cuir de sanglier brun cousu double, coutures claires, ceinture sombre.

import { BG, Box, Cyl, Sph, icon } from '../kit';
import type { ItemArt } from '../types';

export const tunique: ItemArt = {
  icon: icon(`<path d="M18 12 L26 8 Q32 14 38 8 L46 12 L54 24 L46 28 L46 56 L18 56 L18 28 L10 24z" fill="#7a5232"/><path d="M24 20 V52 M40 20 V52" stroke="#c8a06a" stroke-width="1.5" stroke-dasharray="3 2"/><rect x="18" y="36" width="28" height="5" fill="#3a2414"/><rect x="29" y="35" width="6" height="7" fill="#b8b0a0"/><path d="M26 8 Q32 20 38 8" fill="#a07850"/>`, BG.bois),
  wear(b) {
    const leather = 0x7a5232, dark = 0x5e3e24, stitch = 0xc8a06a;
    b.add(Cyl(0.155, 0.225, 0.36, 9), leather, 0, 0.62, 0);
    b.add(Cyl(0.165, 0.165, 0.05, 9), 0x3a2414, 0, 0.53, 0);
    b.add(Box(0.05, 0.045, 0.02), 0xb8b0a0, 0, 0.53, 0.165);
    b.add(Cyl(0.185, 0.155, 0.22, 9), dark, 0, 0.84, 0);
    b.add(Cyl(0.1, 0.19, 0.06, 9), 0xa07850, 0, 0.95, 0);
    for (const sx of [-1, 1]) {
      b.add(Sph(0.08, 8, 6), dark, sx * 0.19, 0.92, 0);
      b.add(Box(0.008, 0.3, 0.008), stitch, sx * 0.07, 0.68, 0.19, { rot: [0.18, 0, 0] });
    }
    b.add(Cyl(0.04, 0.044, 0.34), leather, 0.17, 0.9, 0.16, { rot: [Math.PI / 2, 0, -0.1] });
    b.add(Cyl(0.04, 0.044, 0.3), leather, -0.12, 0.92, 0.07, { rot: [Math.PI / 2 - 0.3, 0, 0.9] });
  },
};
