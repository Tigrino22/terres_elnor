// Buisson rond avec une fleur jaune.
import { Builder, Ico, cached } from '../kit';

export const buissonGeo = () => cached('buisson', () => {
  const b = new Builder();
  b.add(Ico(0.26), 0x46782d, 0, 0.16, 0, { scale: [1.2, 0.8, 1] });
  b.add(Ico(0.18), 0x558a35, 0.18, 0.14, 0.05, { rot: [0.5, 0.3, 0] });
  b.add(Ico(0.05), 0xf2d14b, 0.05, 0.32, 0.1);
  return b.bake();
});
