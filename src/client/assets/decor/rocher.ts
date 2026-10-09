// Rocher gris à deux blocs.
import { Builder, Dodeca, cached } from '../kit';

export const rocherGeo = () => cached('rocher', () => {
  const b = new Builder();
  b.add(Dodeca(0.28), 0x8d8a80, 0, 0.14, 0, { scale: [1.3, 0.8, 1], rot: [0.3, 0.5, 0.2] });
  b.add(Dodeca(0.15), 0x7c7a71, 0.26, 0.08, 0.12, { rot: [0.6, 0.2, 0.4] });
  return b.bake();
});
