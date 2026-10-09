import { describe, it, expect } from 'vitest';
import { MAPS } from '../src/shared/data';
import { generateMap, isBlocked } from '../src/shared/mapgen';
import { Game } from '../src/sim/game';
import type { ServerMsg } from '../src/shared/protocol';

function reachable(id: string) {
  const m = generateMap(MAPS[id]);
  const N = m.size, seen = new Uint8Array(N * N);
  const q: [number, number][] = [[Math.round(m.spawn.x), Math.round(m.spawn.z)]];
  seen[q[0][1] * N + q[0][0]] = 1;
  while (q.length) {
    const [i, j] = q.pop()!;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = i + a, z = j + b;
      if (x < 0 || z < 0 || x >= N || z >= N || seen[z * N + x] || isBlocked(m, x, z)) continue;
      seen[z * N + x] = 1; q.push([x, z]);
    }
  }
  return { m, seen };
}

function setup() {
  const g = new Game(42);
  const inbox: ServerMsg[] = [];
  const p = g.join({ send: m => inbox.push(m) }, 'Lyraël', 'elfe');
  return { g, p, inbox };
}

describe('cartes', () => {
  it('sont identiques à chaque génération (serveur et client voient la même carte)', () => {
    for (const id of Object.keys(MAPS)) {
      const a = generateMap(MAPS[id]), b = generateMap(MAPS[id]);
      expect(Array.from(a.blocked)).toEqual(Array.from(b.blocked));
      expect(a.decor).toEqual(b.decor);
    }
  });
  it('relient le centre à chaque portail, monstre et ressource', () => {
    for (const id of Object.keys(MAPS)) {
      const { m, seen } = reachable(id);
      const ok = (i: number, j: number) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => seen[(j + b) * m.size + i + a]);
      for (const p of m.portals) expect(seen[p.j * m.size + p.i], `${id} portail ${p.edge}`).toBe(1);
      for (const g of MAPS[id].mobs) expect(ok(g.i, g.j), `${id} monstres ${g.kind}`).toBe(true);
      for (const n of MAPS[id].nodes) expect(ok(n.i, n.j), `${id} ressource ${n.kind}`).toBe(true);
    }
  });
});

describe('simulation', () => {
  it('déplace le joueur selon ses entrées et acquitte la dernière', () => {
    const { g, p } = setup();
    const x0 = p.x;
    for (let s = 1; s <= 10; s++) g.handle(p, { t: 'input', seq: s, mx: 1, mz: 0 });
    for (let k = 0; k < 10; k++) g.tick();
    expect(p.x).toBeGreaterThan(x0 + 1.5);
    expect(p.lastSeq).toBe(10);
  });

  it('ne laisse pas sortir de la carte', () => {
    const { g, p } = setup();
    for (let s = 1; s <= 400; s++) { g.handle(p, { t: 'input', seq: s, mx: 1, mz: 0.3 }); g.tick(); }
    expect(p.x).toBeLessThan(MAPS.route.size - 1);
    expect(p.mapId).toBe('route');
  });

  it('tire automatiquement, tue un sanglier, gagne de l’XP et ramasse le butin', () => {
    const { g, p } = setup();
    const m = g.maps.get('route')!;
    const boar = m.mobs.find(o => o.kind === 'sanglier')!;
    p.x = boar.x + 3; p.z = boar.z;
    boar.hx = boar.x; boar.hz = boar.z;
    g.handle(p, { t: 'target', id: boar.id });
    for (let k = 0; k < 20 * 20 && boar.state !== 'dead'; k++) { p.hp = p.stats.mhp; g.tick(); }
    expect(boar.state).toBe('dead');
    expect(p.xp + (p.level > 1 ? 1 : 0)).toBeGreaterThan(0);
    const loot = m.loots[0];
    if (loot) { p.x = loot.x; p.z = loot.z; g.tick(); }
    expect(m.loots.length).toBe(0);
    expect(p.ecus).toBeGreaterThan(0);
  });

  it('change de carte en marchant sur un portail', () => {
    const { g, p, inbox } = setup();
    const m = g.maps.get('route')!;
    const pt = m.data.portals.find(x => x.to === 'bois')!;
    p.x = pt.i + pt.ii; p.z = pt.j + pt.jj;
    for (let s = 1; s <= 80 && p.mapId === 'route'; s++) { g.handle(p, { t: 'input', seq: s, mx: -pt.ii, mz: -pt.jj }); g.tick(); }
    expect(p.mapId).toBe('bois');
    expect(inbox.some(x => x.t === 'map' && x.map === 'bois')).toBe(true);
    expect(g.maps.get('bois')!.players.has(p)).toBe(true);
    expect(m.players.has(p)).toBe(false);
  });

  it('fabrique un lingot avec trois minerais', () => {
    const { g, p } = setup();
    p.inv.cuivre = 4;
    g.handle(p, { t: 'craft', recipe: 'lingot' });
    expect(p.inv.lingot).toBe(1);
    expect(p.inv.cuivre).toBe(1);
  });

  it('équipe automatiquement un objet fabriqué et augmente les stats', () => {
    const { g, p } = setup();
    p.level = 4; p.refreshStats();
    const dmg0 = p.stats.dmg[0];
    Object.assign(p.inv, { bois: 6, lingot: 2, croc: 3 });
    p.ecus = 30;
    g.handle(p, { t: 'craft', recipe: 'arcFrene' });
    expect(p.equip.arme).toBe('arcFrene');
    expect(p.stats.dmg[0]).toBe(dmg0 + 8);
  });

  it('la ruée de l’alpha est annoncée puis frappe la zone', () => {
    const g = new Game(3);
    const inbox: ServerMsg[] = [];
    const p = g.join({ send: m => inbox.push(m) }, 'Borin', 'humain');
    const lis = g.maps.get('lisiere')!;
    g.maps.get('route')!.players.delete(p);
    p.mapId = 'lisiere'; lis.players.add(p);
    lis.mobs.forEach(o => { if (o.kind !== 'alpha') o.state = 'dead', o.respawnAt = 1e9; });
    const alpha = lis.mobs.find(o => o.kind === 'alpha')!;
    p.x = alpha.x + 1; p.z = alpha.z; p.level = 20; p.refreshStats(); p.hp = p.stats.mhp; p.sh = 0;
    p.atkTimer = 99;
    let tele = false, hp0 = p.hp;
    for (let k = 0; k < 20 * 12; k++) {
      p.atkTimer = 99;
      g.tick();
      for (const msg of inbox.splice(0)) if (msg.t === 'ev' && msg.ev.some(e => e.e === 'tele')) tele = true;
    }
    expect(tele).toBe(true);
    expect(p.hp).toBeLessThan(hp0);
  });
});
