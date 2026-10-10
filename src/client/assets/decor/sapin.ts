// Sapin à trois étages, deux nuances de vert.
import { Builder, Cone, Cyl, cached } from '../kit';

export const SAPIN_VARIANTES = 2;

export const sapinGeo = (variant: number) => cached('sapin' + variant, () => {
  const b = new Builder(), col = variant ? 0x2a4f2d : 0x2f5a33;
  b.add(Cyl(0.06, 0.1, 0.5, 6), 0x4e321d, 0, 0.25, 0);
  b.add(Cone(0.55, 0.75, 7), col, 0, 0.75, 0);
  b.add(Cone(0.43, 0.65, 7), col, 0, 1.15, 0, { rot: [0, 0.4, 0] });
  b.add(Cone(0.3, 0.55, 7), col, 0, 1.5, 0, { rot: [0, 0.8, 0] });
  return b.bake();
});
