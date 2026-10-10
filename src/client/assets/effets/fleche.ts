// Flèche en vol : tige, pointe et empennage. Le tir automatique utilise la traînée ci-dessous ;
// les sorts ont la leur dans sorts/<sort>.ts.
import { Box, Builder, Cone, Cyl, cached } from '../kit';

export const AUTO_SHOT = { color: 0xd8ffd0, speed: 18, big: false };

export const arrowGeo = () => cached('fleche', () => {
  const b = new Builder();
  b.add(Cyl(0.012, 0.012, 0.46, 4), 0xe9dcb8);
  b.add(Cone(0.035, 0.09, 4), 0xd0d4d8, 0, 0.26, 0);
  b.add(Box(0.06, 0.08, 0.005), 0xf0f0f0, 0, -0.2, 0);
  return b.bake();
});
