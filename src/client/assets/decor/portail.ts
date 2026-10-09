// Portail de bord de carte, volontairement très visible : arche de pierre,
// colonne de lumière, cercle de runes qui tourne, flèche qui flotte et particules.
import { Box, Builder, Ico, THREE, glowSprite, meshOf } from '../kit';
import { rng } from '../../../shared/rng';

let beamTex: THREE.Texture | null = null;
function beamTexture() {
  if (beamTex) return beamTex;
  const cv = document.createElement('canvas'); cv.width = 8; cv.height = 128;
  const c = cv.getContext('2d')!, g = c.createLinearGradient(0, 128, 0, 0);
  g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 8, 128);
  beamTex = new THREE.CanvasTexture(cv);
  return beamTex;
}

let runeTex: THREE.Texture | null = null;
function runeTexture() {
  if (runeTex) return runeTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const c = cv.getContext('2d')!;
  c.translate(128, 128);
  c.strokeStyle = '#fff'; c.lineWidth = 7;
  c.beginPath(); c.arc(0, 0, 112, 0, Math.PI * 2); c.stroke();
  c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 92, 0, Math.PI * 2); c.stroke();
  c.lineWidth = 5;
  for (let k = 0; k < 12; k++) {
    c.save(); c.rotate((k / 12) * Math.PI * 2);
    c.beginPath(); c.moveTo(-6, -104); c.lineTo(0, -96); c.lineTo(6, -104); c.moveTo(0, -96); c.lineTo(0, -88); c.stroke();
    c.restore();
  }
  runeTex = new THREE.CanvasTexture(cv);
  return runeTex;
}

export function portalModel(dir: number, open: boolean) {
  const g = new THREE.Group();
  const col = open ? 0xffd36a : 0x8a8f9a, rune = open ? 0x7ff0ff : 0x9aa0aa;
  // arche
  const b = new Builder();
  for (const sx of [-1, 1]) {
    b.add(Box(0.22, 1.7, 0.26), 0x8d877a, sx * 0.72, 0.85, 0);
    b.add(Box(0.3, 0.18, 0.34), 0x77726a, sx * 0.72, 0.09, 0);
    b.add(Box(0.04, 0.5, 0.02), rune, sx * 0.72, 1.0, 0.135, { emissive: true });
  }
  b.add(Box(1.8, 0.24, 0.32), 0x8d877a, 0, 1.78, 0);
  b.add(Box(0.3, 0.3, 0.36), 0x77726a, 0, 1.78, 0, { rot: [0, 0, Math.PI / 4] });
  b.add(Ico(0.09), rune, 0, 1.78, 0.2, { emissive: true });
  const arch = meshOf(b.bake());
  arch.rotation.y = dir;
  g.add(arch);
  // colonne de lumière
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.62, 3.6, 28, 1, true),
    new THREE.MeshBasicMaterial({ map: beamTexture(), color: col, transparent: true, opacity: open ? 0.55 : 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  beam.position.y = 1.8;
  g.add(beam);
  // cercle de runes au sol
  const ring = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 1.9),
    new THREE.MeshBasicMaterial({ map: runeTexture(), color: col, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04;
  g.add(ring);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.95, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.25, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.03;
  g.add(disc);
  // flèche flottante
  const sh = new THREE.Shape();
  sh.moveTo(0, 0.32); sh.lineTo(0.26, 0.02); sh.lineTo(0.1, 0.02); sh.lineTo(0.1, -0.28); sh.lineTo(-0.1, -0.28); sh.lineTo(-0.1, 0.02); sh.lineTo(-0.26, 0.02); sh.closePath();
  const ag = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false });
  ag.rotateX(-Math.PI / 2); ag.translate(0, 0, 0);
  const arrow = new THREE.Mesh(ag, new THREE.MeshBasicMaterial({ color: open ? 0xffe8a0 : 0xb0b4bc, toneMapped: false }));
  const arrowHolder = new THREE.Group();
  arrowHolder.rotation.y = dir;
  arrowHolder.add(arrow);
  arrow.position.y = 2.35;
  g.add(arrowHolder);
  const glow = glowSprite(col, 3.4, open ? 0.5 : 0.2);
  glow.position.y = 0.9;
  g.add(glow);
  // particules
  const N = 26, pos = new Float32Array(N * 3), seeds: number[] = [];
  const r = rng(3);
  for (let k = 0; k < N; k++) seeds.push(r() * 10, r() * Math.PI * 2, 0.2 + r() * 0.5);
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: open ? 0xfff0b0 : 0xcfd4dc, size: 0.09, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(pts);
  const update = (t: number) => {
    ring.rotation.z = t * (open ? 0.8 : 0.2);
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    (beam.material as THREE.MeshBasicMaterial).opacity = (open ? 0.4 : 0.18) + pulse * (open ? 0.25 : 0.06);
    glow.material.opacity = (open ? 0.35 : 0.15) + pulse * 0.2;
    arrow.position.y = 2.35 + Math.sin(t * 2.5) * 0.12;
    arrow.position.z = 0;
    for (let k = 0; k < N; k++) {
      const ph = (seeds[k * 3] + t * 0.45) % 1, a = seeds[k * 3 + 1] + t * 0.6, rad = seeds[k * 3 + 2];
      pos[k * 3] = Math.cos(a) * rad; pos[k * 3 + 1] = ph * 3; pos[k * 3 + 2] = Math.sin(a) * rad;
    }
    pg.attributes.position.needsUpdate = true;
  };
  return { group: g, update };
}
