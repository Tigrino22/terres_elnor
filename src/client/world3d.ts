// Rendu 3D isométrique d'une carte : terrain, décor, portails, entités et effets.

import * as THREE from 'three';
import { MapData, T } from '../shared/mapgen';
import { rng, makeNoise } from '../shared/rng';
import type { EntSnap } from '../shared/protocol';
import {
  ARBRE_VARIANTES, AUTO_SHOT, BUTIN_HALO, MAT, MOB_ART, NODE_ART, SAPIN_VARIANTES, SOL, arbreGeo, arrowGeo, buissonGeo, butinModel,
  glowSprite, grotteModel, mobModel, nodeModel, playerModel, portalModel, rocherGeo, sapinGeo, trapModel,
} from './assets';

export interface View {
  id: number;
  k: EntSnap['k'];
  s?: string;
  obj: THREE.Group;
  body: THREE.Object3D;
  x: number; z: number; tx: number; tz: number;
  f: number; tf: number;
  snap: EntSnap;
  walk: number;
  hit: number;
  lunge: number;
  dying: number;
  ring?: THREE.Mesh;
  extra?: THREE.Object3D;
  /** équipement affiché, pour reconstruire le modèle quand il change */
  look?: string;
}

const mobScale = (kind?: string) => MOB_ART[kind ?? '']?.scale ?? 1;
const lookOf = (e: EntSnap) => `${e.s}|${e.eq ? Object.entries(e.eq).sort().join(',') : ''}`;

interface Fx { t: number; dur: number; obj: THREE.Object3D; update: (k: number, dt: number) => void }

const CAM_EL = THREE.MathUtils.degToRad(32);
const CAM_D = 60;
export const VIEW_H = 11.5;

export class World3D {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.OrthographicCamera;
  sun: THREE.DirectionalLight;
  mapGroup = new THREE.Group();
  fxGroup = new THREE.Group();
  views = new Map<number, View>();
  fx: Fx[] = [];
  portals: { update: (t: number) => void; x: number; z: number; label: string; open: boolean }[] = [];
  map: MapData | null = null;
  heightAt = (_x: number, _z: number) => 0;
  camTarget = new THREE.Vector3();
  W = 1; H = 1;
  selfId = 0;
  targetId: number | null = null;
  time = 0;
  caveAt: THREE.Vector3 | null = null;
  private selfRing: THREE.Mesh;
  private targetRing: THREE.Mesh;

  constructor(public canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.background = new THREE.Color(SOL.ciel);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    this.scene.add(new THREE.HemisphereLight(0xd8ecff, 0x4a3d24, 1.15));
    this.sun = new THREE.DirectionalLight(0xffe8c4, 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun, this.sun.target, this.mapGroup, this.fxGroup);
    const ringMat = (c: number) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, depthWrite: false });
    this.selfRing = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.44, 32), ringMat(0x9cff8a));
    this.targetRing = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.6, 32), ringMat(0xff5a3a));
    for (const r of [this.selfRing, this.targetRing]) { r.rotation.x = -Math.PI / 2; r.visible = false; this.scene.add(r); }
    this.resize();
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.W = w; this.H = h;
    this.renderer.setSize(w, h, false);
    const aspect = w / h, vh = VIEW_H * (aspect < 1 ? 1.5 : 1), vw = vh * aspect;
    Object.assign(this.camera, { left: -vw / 2, right: vw / 2, top: vh / 2, bottom: -vh / 2 });
    this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------------ carte
  loadMap(m: MapData) {
    this.map = m;
    for (const v of this.views.values()) this.scene.remove(v.obj);
    this.views.clear();
    this.fx.forEach(f => this.fxGroup.remove(f.obj)); this.fx = [];
    this.mapGroup.traverse(o => { if ((o as THREE.Mesh).geometry && o.userData.own && !o.userData.shared) (o as THREE.Mesh).geometry.dispose(); });
    this.mapGroup.clear();
    this.portals = [];
    this.caveAt = null;
    const N = m.size, idx = (i: number, j: number) => j * N + i;
    const r = rng(m.def.seed + 1), noise = makeNoise(m.def.seed + 2);
    const top = new Float32Array(N * N);
    const tileAt = (i: number, j: number) => (i < 0 || j < 0 || i >= N || j >= N ? -1 : m.tile[idx(i, j)]);
    const nearWater = (i: number, j: number) => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (tileAt(i + a, j + b) === T.Eau) return true; return false; };
    this.heightAt = (x, z) => { const i = Math.round(x), j = Math.round(z); return i < 0 || j < 0 || i >= N || j >= N ? 0 : Math.max(0, top[idx(i, j)]); };

    const base = new THREE.Mesh(new THREE.PlaneGeometry(N * 3, N * 3), new THREE.MeshStandardMaterial({ color: SOL.socle, roughness: 1 }));
    base.rotation.x = -Math.PI / 2; base.position.set(N / 2, -0.16, N / 2); base.receiveShadow = true;
    this.own(base);

    const slabs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.975, 0.16, 0.975), new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), N * N);
    const cols = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), N * N);
    slabs.receiveShadow = true; cols.receiveShadow = true; cols.castShadow = true;
    const m4 = new THREE.Matrix4(), c = new THREE.Color();
    const forest = m.def.ground === 'foret';
    const herbe = forest ? SOL.herbeForet : SOL.herbe;
    const grassA = new THREE.Color(herbe[0]), grassB = new THREE.Color(herbe[1]);
    const dirt = new THREE.Color(SOL.chemin), sand = new THREE.Color(SOL.sable), mud = new THREE.Color(SOL.vase), rock = new THREE.Color(SOL.roche);
    let k = 0, ci = 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++, k++) {
      const t = m.tile[k], n = noise(i * 0.18, j * 0.18);
      let h = 0;
      if (t === T.Eau) { h = -0.32; c.copy(mud); }
      else if (t === T.Chemin) c.copy(dirt).offsetHSL(0, 0, (r() - 0.5) * 0.06);
      else if (t === T.Sable || nearWater(i, j)) c.copy(sand).lerp(grassA, 0.35).offsetHSL(0, 0, (r() - 0.5) * 0.05);
      else if (t === T.Falaise) { h = 0.9; c.copy(grassA).lerp(grassB, 0.5).offsetHSL(0.01, -0.05, 0.03); }
      else c.copy(grassA).lerp(grassB, THREE.MathUtils.clamp(n * 1.5 - 0.25, 0, 1)).offsetHSL((r() - 0.5) * 0.02, 0, (r() - 0.5) * 0.06);
      top[k] = h;
      m4.makeTranslation(i, h - 0.08, j); slabs.setMatrixAt(k, m4); slabs.setColorAt(k, c);
      if (h > 0.05) {
        const hg = h + 0.04;
        m4.compose(new THREE.Vector3(i, h - 0.16 - hg / 2 + 0.001, j), new THREE.Quaternion(), new THREE.Vector3(1, hg, 1));
        cols.setMatrixAt(ci, m4); cols.setColorAt(ci, c.copy(rock).offsetHSL(0, 0, (r() - 0.5) * 0.08)); ci++;
      }
    }
    cols.count = ci;
    this.own(slabs); if (ci) this.own(cols);

    // eau
    const water = Array.from({ length: N * N }, (_, q) => q).filter(q => m.tile[q] === T.Eau);
    if (water.length) {
      const wm = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: SOL.eau, roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.86 }), water.length);
      water.forEach((q, n) => { m4.compose(new THREE.Vector3(q % N, -0.09, Math.floor(q / N)), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), new THREE.Vector3(1, 1, 1)); wm.setMatrixAt(n, m4); });
      wm.receiveShadow = true;
      this.own(wm);
    }

    // herbes et fleurs
    const tufts = new THREE.InstancedMesh(new THREE.ConeGeometry(0.03, 0.15, 3), new THREE.MeshStandardMaterial({ flatShading: true, roughness: 1 }), N * N * 4);
    const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.035, 0), new THREE.MeshStandardMaterial({ roughness: 0.6 }), N * N);
    let ti = 0, fi = 0;
    const fc = SOL.fleurs;
    const q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s3 = new THREE.Vector3();
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const t = m.tile[idx(i, j)];
      if (t === T.Eau || t === T.Chemin) continue;
      const nt = 1 + Math.floor(r() * 3), h = top[idx(i, j)];
      for (let u = 0; u < nt; u++) {
        const s = 0.7 + r() * 0.8;
        v.set(i + (r() - 0.5) * 0.9, h + 0.08 * s, j + (r() - 0.5) * 0.9);
        q.setFromEuler(e.set((r() - 0.5) * 0.5, r() * 3, (r() - 0.5) * 0.5));
        m4.compose(v, q, s3.set(s, s, s)); tufts.setMatrixAt(ti, m4);
        tufts.setColorAt(ti, c.set(forest ? SOL.touffesForet : SOL.touffes).offsetHSL((r() - 0.5) * 0.04, 0, (r() - 0.2) * 0.1)); ti++;
      }
      if (r() < (forest ? 0.18 : 0.3)) {
        m4.makeTranslation(i + (r() - 0.5) * 0.8, h + 0.1, j + (r() - 0.5) * 0.8);
        flowers.setMatrixAt(fi, m4); flowers.setColorAt(fi, c.set(fc[Math.floor(r() * fc.length)])); fi++;
      }
    }
    tufts.count = ti; flowers.count = fi; tufts.receiveShadow = true;
    this.own(tufts); this.own(flowers);

    // forêt autour de la carte (pur décor) : la carte ne s'arrête pas sur du vide
    const RING = 6, ring: typeof m.decor = [];
    const corridor = (i: number, j: number) => m.portals.some(p => {
      const ox = -p.ii, oz = -p.jj, dx = i - p.i, dz = j - p.j;
      return dx * ox + dz * oz > 0 && Math.abs(dx * oz - dz * ox) < 1.2;
    });
    const ringSlabs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.975, 0.16, 0.975), new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), (N + 2 * RING) ** 2);
    let ri = 0;
    for (let j = -RING; j < N + RING; j++) for (let i = -RING; i < N + RING; i++) {
      if (i >= 0 && j >= 0 && i < N && j < N) continue;
      const path = corridor(i, j);
      m4.makeTranslation(i, -0.08, j); ringSlabs.setMatrixAt(ri, m4);
      ringSlabs.setColorAt(ri++, path ? c.copy(dirt).offsetHSL(0, 0, (r() - 0.5) * 0.05) : c.copy(grassB).offsetHSL(0, -0.05, -0.04 + (r() - 0.5) * 0.04));
      if (path) continue;
      const roll = r(), x = i + (r() - 0.5) * 0.5, z = j + (r() - 0.5) * 0.5;
      if (roll < 0.82) ring.push({ kind: r() < (forest ? 0.4 : 0.25) ? 'sapin' : 'arbre', x, z, s: 0.95 + r() * 0.6, rot: r() * 6.28, v: r() });
      else if (roll < 0.9) ring.push({ kind: 'buisson', x, z, s: 1, rot: r() * 6.28, v: 0 });
    }
    ringSlabs.count = ri; ringSlabs.receiveShadow = true;
    this.own(ringSlabs);

    // décor instancié : un appel de dessin par variante
    const groups = new Map<string, { geo: () => THREE.BufferGeometry; list: typeof m.decor }>();
    for (const d of [...m.decor, ...ring]) {
      const variant = d.kind === 'arbre' ? Math.floor(d.v * ARBRE_VARIANTES) : d.kind === 'sapin' ? Math.floor(d.v * SAPIN_VARIANTES) : 0;
      const key = d.kind + variant;
      if (!groups.has(key)) groups.set(key, {
        geo: () => d.kind === 'arbre' ? arbreGeo(variant) : d.kind === 'sapin' ? sapinGeo(variant) : d.kind === 'buisson' ? buissonGeo() : rocherGeo(), list: [],
      });
      groups.get(key)!.list.push(d);
    }
    for (const { geo, list } of groups.values()) {
      const im = new THREE.InstancedMesh(geo(), MAT, list.length);
      list.forEach((d, n) => {
        const s = d.kind === 'sapin' ? d.s * 1.1 : d.kind === 'rocher' || d.kind === 'buisson' ? 0.8 + d.s * 0.3 : d.s;
        m4.compose(v.set(d.x, this.heightAt(d.x, d.z), d.z), q.setFromEuler(e.set(0, d.rot, 0)), s3.set(s, s, s));
        im.setMatrixAt(n, m4);
      });
      im.castShadow = true; im.receiveShadow = true; im.userData.shared = true;
      this.own(im);
    }

    // falaise : rochers au pied
    for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
      if (m.tile[idx(i, j)] === T.Falaise || m.tile[idx(i, j)] === T.Eau) continue;
      if (m.tile[idx(i, j - 1)] === T.Falaise && r() < 0.35) {
        const rm = new THREE.Mesh(rocherGeo(), MAT); rm.position.set(i + (r() - 0.5) * 0.4, 0, j - 0.3); rm.rotation.y = r() * 6; rm.castShadow = true; rm.userData.shared = true; this.own(rm);
      }
    }

    // grotte
    if (m.cave) {
      const cave = grotteModel();
      cave.position.set(m.cave.i, 0, m.cave.j - 0.35);
      this.mapGroup.add(cave);
      this.caveAt = new THREE.Vector3(m.cave.i, 1.5, m.cave.j);
    }

    // portails
    for (const p of m.portals) {
      const ox = -p.ii, oz = -p.jj;
      const pm = portalModel(Math.atan2(-ox, -oz), !!p.to);
      pm.group.position.set(p.i, 0, p.j);
      this.mapGroup.add(pm.group);
      this.portals.push({ update: pm.update, x: p.i, z: p.j, label: p.label, open: !!p.to });
    }

    // soleil : ombres sur toute la carte
    const cx = (N - 1) / 2;
    this.sun.position.set(cx - 14, 22, cx + 8);
    this.sun.target.position.set(cx, 0, cx);
    Object.assign(this.sun.shadow.camera, { left: -N * 0.8, right: N * 0.8, top: N * 0.8, bottom: -N * 0.8, near: 1, far: 90 });
    this.sun.shadow.camera.updateProjectionMatrix();
  }

  private own(o: THREE.Object3D) { o.userData.own = true; this.mapGroup.add(o); }

  // ------------------------------------------------------------------ entités
  sync(ents: EntSnap[], self: { x: number; z: number } | null) {
    const seen = new Set<number>();
    for (const e of ents) {
      seen.add(e.id);
      let v = this.views.get(e.id);
      if (!v) { v = this.makeView(e); this.views.set(e.id, v); }
      v.snap = e;
      if (e.id === this.selfId && self) { v.tx = self.x; v.tz = self.z; }
      else { v.tx = e.x; v.tz = e.z; }
      if (e.f !== undefined && e.id !== this.selfId) v.tf = e.f;
      if (e.k === 'p' && v.look !== lookOf(e)) this.redress(v, e);
      if (e.k === 'n') v.body.scale.setScalar((e.fl ?? 0) & 16 ? 0.45 : 1);
      if (v.extra) v.extra.visible = !!((e.fl ?? 0) & 2);
    }
    for (const [id, v] of this.views) if (!seen.has(id) && !v.dying) { this.scene.remove(v.obj); this.views.delete(id); }
  }

  private makeView(e: EntSnap): View {
    const obj = new THREE.Group();
    let body: THREE.Object3D;
    let extra: THREE.Object3D | undefined;
    if (e.k === 'p') body = playerModel((e.s as 'elfe' | 'humain') ?? 'elfe', e.eq);
    else if (e.k === 'm') {
      body = mobModel(e.s ?? 'loup');
      extra = trapModel(); extra.visible = false; extra.scale.setScalar(0.8); obj.add(extra);
    } else if (e.k === 'l') body = butinModel();
    else body = nodeModel(e.s ?? 'frene');
    obj.add(body);
    if (e.k === 'n' || e.k === 'l') {
      const art = e.k === 'n' ? NODE_ART[(e.s ?? 'frene') as keyof typeof NODE_ART] : null;
      const mark = glowSprite(art ? art.glow : BUTIN_HALO, art ? 1.2 : 0.6, 0.35);
      mark.position.y = art ? art.glowY : 0.35; obj.add(mark);
    }
    obj.position.set(e.x, this.heightAt(e.x, e.z), e.z);
    this.scene.add(obj);
    return { id: e.id, k: e.k, s: e.s, obj, body, x: e.x, z: e.z, tx: e.x, tz: e.z, f: e.f ?? 0, tf: e.f ?? 0, snap: e, walk: 0, hit: 0, lunge: 0, dying: 0, extra, look: e.k === 'p' ? lookOf(e) : undefined };
  }

  /** Le joueur a changé d'équipement : on remplace son modèle, rien d'autre ne bouge. */
  private redress(v: View, e: EntSnap) {
    const body = playerModel((e.s as 'elfe' | 'humain') ?? 'elfe', e.eq);
    body.position.copy(v.body.position); body.rotation.copy(v.body.rotation); body.scale.copy(v.body.scale);
    v.obj.remove(v.body); v.obj.add(body);
    v.body = body; v.look = lookOf(e);
  }

  setSelfFacing(f: number) { const v = this.views.get(this.selfId); if (v) v.tf = f; }

  // ------------------------------------------------------------------ effets
  addFx(obj: THREE.Object3D, dur: number, update: (k: number, dt: number) => void) {
    this.fxGroup.add(obj);
    this.fx.push({ t: 0, dur, obj, update });
  }

  posOf(id: number, y = 0.8) {
    const v = this.views.get(id);
    return v ? new THREE.Vector3(v.x, this.heightAt(v.x, v.z) + y * (v.k === 'm' ? mobScale(v.s) ** 0.7 : 1), v.z) : null;
  }

  arrow(from: THREE.Vector3, to: THREE.Vector3, speed = AUTO_SHOT.speed, color = AUTO_SHOT.color, big = AUTO_SHOT.big) {
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(arrowGeo(), MAT); shaft.userData.shared = true;
    g.add(shaft);
    const trail = new THREE.Mesh(new THREE.CylinderGeometry(big ? 0.06 : 0.035, 0.002, big ? 1.8 : 1.1, 6, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    trail.position.y = big ? -1.0 : -0.65; g.add(trail);
    const glow = glowSprite(color, big ? 1.1 : 0.6, 0.6); g.add(glow);
    const d = from.distanceTo(to), dur = Math.max(0.08, d / speed);
    const dir = to.clone().sub(from).normalize();
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    this.addFx(g, dur, k => {
      g.position.lerpVectors(from, to, k);
      g.position.y += Math.sin(k * Math.PI) * d * 0.06;
    });
  }

  ringFx(x: number, z: number, r: number, color: number, dur: number, grow = true) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, this.heightAt(x, z) + 0.06, z);
    this.addFx(m, dur, k => { const s = r * (grow ? 0.3 + 0.7 * k : 1); m.scale.set(s, s, s); (m.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k); });
  }

  telegraph(x: number, z: number, r: number, dur: number) {
    const g = new THREE.Group();
    const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0xff3a1e, transparent: true, opacity: 0.25, depthWrite: false }));
    const edge = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 48), new THREE.MeshBasicMaterial({ color: 0xff6a3a, transparent: true, opacity: 0.95, depthWrite: false }));
    const inner = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0.35, depthWrite: false }));
    for (const o of [fill, edge, inner]) { o.rotation.x = -Math.PI / 2; g.add(o); }
    fill.scale.setScalar(r); edge.scale.setScalar(r);
    g.position.set(x, this.heightAt(x, z) + 0.05, z);
    this.addFx(g, dur, k => { inner.scale.setScalar(Math.max(0.01, r * k)); (edge.material as THREE.MeshBasicMaterial).opacity = 0.6 + 0.4 * Math.sin(k * 30); });
  }

  rain(x: number, z: number, r: number, color: number) {
    const rr = rng(Math.floor(x * 100 + z));
    for (let w = 0; w < 3; w++) for (let n = 0; n < 7; n++) {
      const a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * r;
      const tx = x + Math.cos(a) * d, tz = z + Math.sin(a) * d;
      const delay = w * 0.5 + rr() * 0.2;
      const to = new THREE.Vector3(tx, this.heightAt(tx, tz), tz);
      const from = to.clone().add(new THREE.Vector3(-1.5, 6, -1.5));
      setTimeout(() => this.arrow(from, to, 22, color), delay * 1000);
    }
    this.ringFx(x, z, r, color, 1.6, false);
  }

  levelUp(id: number) {
    const p = this.posOf(id, 0); if (!p) return;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 4, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.copy(p).add(new THREE.Vector3(0, 2, 0));
    this.addFx(beam, 1.6, k => { (beam.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - k); beam.scale.set(1 + k, 1, 1 + k); });
    this.ringFx(p.x, p.z, 2.4, 0xffd36a, 1.2);
  }

  dash(x0: number, z0: number, x1: number, z1: number, color = 0xd8ffff) {
    for (let k = 0; k < 4; k++) {
      const t = k / 4, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      const s = glowSprite(color, 0.9, 0.5); s.position.set(x, this.heightAt(x, z) + 0.6, z);
      this.addFx(s, 0.5, q => { s.material.opacity = 0.5 * (1 - q); });
    }
  }

  // ------------------------------------------------------------------ image
  frame(dt: number, followX: number, followZ: number) {
    this.time += dt;
    const t = this.time;
    const ease = 1 - Math.exp(-dt * 14);
    for (const v of this.views.values()) {
      if (v.dying) {
        v.dying += dt;
        v.body.rotation.z = Math.min(1.4, v.dying * 3);
        v.obj.position.y -= dt * 0.25;
        if (v.dying > 1.2) { this.scene.remove(v.obj); this.views.delete(v.id); }
        continue;
      }
      const px = v.x, pz = v.z;
      if (v.id === this.selfId) { v.x = v.tx; v.z = v.tz; }
      else { v.x += (v.tx - v.x) * ease; v.z += (v.tz - v.z) * ease; }
      const moved = Math.hypot(v.x - px, v.z - pz);
      v.walk = moved > 0.002 ? v.walk + moved * 9 : v.walk * 0.85;
      let df = v.tf - v.f; df = Math.atan2(Math.sin(df), Math.cos(df)); v.f += df * Math.min(1, dt * 14);
      const h = this.heightAt(v.x, v.z);
      v.obj.position.set(v.x, h, v.z);
      v.obj.rotation.y = v.f;
      const bob = v.k === 'p' || v.k === 'm' ? Math.abs(Math.sin(v.walk)) * (moved > 0.002 ? 0.06 : 0) : 0;
      v.hit = Math.max(0, v.hit - dt * 4);
      v.lunge = Math.max(0, v.lunge - dt * 3);
      v.body.position.y = bob;
      v.body.position.z = Math.sin(v.lunge * Math.PI) * 0.3;
      const base = v.k === 'm' ? mobScale(v.s) : 1;
      if (v.k === 'p' || v.k === 'm') v.body.scale.set(base * (1 + v.hit * 0.12), base * (1 - v.hit * 0.1), base * (1 + v.hit * 0.12));
      if (v.k === 'l') { v.body.rotation.y = t * 1.5; v.body.position.y = 0.05 + Math.sin(t * 3) * 0.05; }
      if (v.k === 'p' && (v.snap.fl ?? 0) & 1) { v.body.rotation.z = 1.3; v.body.position.y = 0.1; } else if (v.k === 'p') v.body.rotation.z = 0;
    }
    // anneaux de sélection
    const me = this.views.get(this.selfId);
    this.selfRing.visible = !!me;
    if (me) this.selfRing.position.set(me.x, this.heightAt(me.x, me.z) + 0.04, me.z);
    const tg = this.targetId != null ? this.views.get(this.targetId) : undefined;
    this.targetRing.visible = !!tg && !tg.dying;
    if (tg) { const s = tg.k === 'm' && mobScale(tg.s) > 1 ? 1.6 : 1; this.targetRing.scale.set(s, s, s); this.targetRing.position.set(tg.x, this.heightAt(tg.x, tg.z) + 0.05, tg.z); this.targetRing.rotation.z = t; }

    this.portals.forEach(p => p.update(t));
    this.fx = this.fx.filter(f => {
      f.t += dt;
      const k = Math.min(1, f.t / f.dur);
      f.update(k, dt);
      if (k >= 1) {
        this.fxGroup.remove(f.obj);
        f.obj.traverse(o => { const m = o as THREE.Mesh; if (m.geometry && !(o instanceof THREE.Sprite) && !o.userData.shared) m.geometry.dispose(); });
        return false;
      }
      return true;
    });

    // caméra qui suit le joueur
    this.camTarget.x += (followX - this.camTarget.x) * Math.min(1, dt * 6);
    this.camTarget.z += (followZ - this.camTarget.z) * Math.min(1, dt * 6);
    const c = this.camTarget;
    this.camera.position.set(c.x + CAM_D * Math.cos(CAM_EL) * Math.SQRT1_2, CAM_D * Math.sin(CAM_EL), c.z + CAM_D * Math.cos(CAM_EL) * Math.SQRT1_2);
    this.camera.lookAt(c);
    this.renderer.render(this.scene, this.camera);
  }

  snapCamera(x: number, z: number) { this.camTarget.set(x, 0, z); }

  project(x: number, y: number, z: number) {
    const p = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: (p.x + 1) / 2 * this.W, y: (1 - p.y) / 2 * this.H, on: Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1 };
  }

  /** Entité la plus proche du clic, en coordonnées écran. */
  pick(sx: number, sy: number, kinds: EntSnap['k'][]): View | null {
    let best: View | null = null, bd = 46;
    for (const v of this.views.values()) {
      if (v.dying || !kinds.includes(v.k) || v.id === this.selfId) continue;
      const tall = (v.k === 'm' && mobScale(v.s) > 1) || (v.k === 'n' && v.s === 'frene') ? 0.8 : 0.4;
      const p = this.project(v.x, this.heightAt(v.x, v.z) + tall, v.z);
      const d = Math.hypot(p.x - sx, p.y - sy);
      if (d < bd) { bd = d; best = v; }
    }
    return best;
  }

  /** Point du sol sous le curseur. */
  ground(sx: number, sy: number) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(sx / this.W * 2 - 1, -(sy / this.H) * 2 + 1), this.camera);
    const p = new THREE.Vector3();
    return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p) ? p : null;
  }
}
