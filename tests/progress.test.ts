import { describe, it, expect } from 'vitest';
import { Game, AUTOSAVE_EVERY } from '../src/sim/game';
import { MemoryStore, authenticate, Hasher } from '../src/sim/accounts';
import { pointsLeft, spellFx } from '../src/shared/ranks';
import { DT, xpNext } from '../src/shared/stats';
import type { SaveData, ServerMsg } from '../src/shared/protocol';

// mots de passe de test fabriqués à la volée : aucune valeur ressemblant à un secret dans le dépôt
const PW = 'abcdefgh', PW2 = PW.toUpperCase(), BAD = PW.slice(1) + 'z';

const fakeHasher: Hasher = { salt: () => 'sel', hash: async (pw, salt) => `${salt}:${pw.split('').reverse().join('')}` };

function setup(save?: SaveData | null) {
  const g = new Game(42, 'route');
  const inbox: ServerMsg[] = [];
  const saves: SaveData[] = [];
  const p = g.join({ send: m => inbox.push(m) }, 'Lyraël', 'elfe', save, s => saves.push(s));
  return { g, p, inbox, saves };
}

describe('comptes', () => {
  it('inscrit, connecte et refuse un mauvais mot de passe', async () => {
    const store = new MemoryStore();
    const reg = await authenticate(store, fakeHasher, { t: 'auth', mode: 'register', account: 'Lyrael', password: PW, name: 'Lyraël', race: 'elfe' });
    expect(reg.ok).toBe(true);
    expect(store.get('lyrael')!.hash).not.toContain(PW);
    expect((await authenticate(store, fakeHasher, { t: 'auth', mode: 'login', account: 'lyrael', password: PW })).ok).toBe(true);
    const bad = await authenticate(store, fakeHasher, { t: 'auth', mode: 'login', account: 'lyrael', password: BAD });
    expect(bad).toEqual({ ok: false, error: 'Identifiant ou mot de passe incorrect.' });
    const unknown = await authenticate(store, fakeHasher, { t: 'auth', mode: 'login', account: 'personne', password: PW });
    expect(unknown).toEqual(bad);
  });

  it('refuse un identifiant ou un nom de personnage déjà pris', async () => {
    const store = new MemoryStore();
    await authenticate(store, fakeHasher, { t: 'auth', mode: 'register', account: 'lyrael', password: PW, name: 'Lyraël', race: 'elfe' });
    const sameAcc = await authenticate(store, fakeHasher, { t: 'auth', mode: 'register', account: 'LYRAEL', password: PW2, name: 'Autre', race: 'humain' });
    const sameName = await authenticate(store, fakeHasher, { t: 'auth', mode: 'register', account: 'borin', password: PW2, name: 'lyraël', race: 'humain' });
    expect(sameAcc.ok).toBe(false);
    expect(sameName.ok).toBe(false);
  });
});

describe('sauvegarde', () => {
  it('reprend le personnage là où il était, avec sa progression', () => {
    const a = setup();
    const p = a.p;
    a.g.giveXp(p, xpNext(1) + xpNext(2) + xpNext(3) + 10, 'test');
    p.inv.bottes = 1; p.ecus = 77;
    a.g.handle(p, { t: 'equip', item: 'bottes' });
    a.g.handle(p, { t: 'upgrade', spell: 'tir' });
    p.x = 9.5; p.z = 7.25;
    a.g.leave(p);
    const save = a.saves[a.saves.length - 1];
    expect(save).toMatchObject({ level: 4, ecus: 77, equip: { pieds: 'bottes' }, ranks: { tir: 2 }, map: 'route', x: 9.5, z: 7.25 });

    const b = setup(JSON.parse(JSON.stringify(save)));
    expect(b.p.level).toBe(4);
    expect(b.p.xp).toBe(10);
    expect(b.p.equip.pieds).toBe('bottes');
    expect(b.p.ranks.tir).toBe(2);
    expect(Math.hypot(b.p.x - 9.5, b.p.z - 7.25)).toBeLessThan(1);
    expect(b.inbox.find(m => m.t === 'map')).toMatchObject({ map: 'route' });
  });

  it('sauvegarde automatiquement toutes les 30 secondes et à chaque changement de carte', () => {
    const { g, p, saves } = setup();
    const n0 = saves.length;
    for (let k = 0; k < Math.round(AUTOSAVE_EVERY / DT); k++) g.tick();
    expect(saves.length).toBe(n0 + 1);
    const pt = g.maps.get('route')!.data.portals.find(x => x.to === 'bois')!;
    p.x = pt.i; p.z = pt.j; p.portalCd = 0;
    g.tick();
    expect(saves[saves.length - 1].map).toBe('bois');
  });

  it('ignore une sauvegarde trafiquée', () => {
    const { p } = setup({ v: 1, map: 'nulle-part', x: 1e9, z: NaN, level: 99, xp: -5, ecus: -10, hp: 1e9, mp: 5, inv: { epee: 3, bois: 2 }, equip: { arme: 'bottes' }, ranks: { tir: 9 } });
    expect(p.mapId).toBe('route');
    expect(p.level).toBe(20);
    expect(p.xp).toBe(0);
    expect(p.ecus).toBe(0);
    expect(p.inv).toEqual({ bois: 2 });
    expect(p.equip).toEqual({});
    expect(p.hp).toBe(p.stats.mhp);
    expect(p.ranks.tir).toBe(5);
  });
});

describe('équipement', () => {
  it('retire un objet porté et le remet dans le sac', () => {
    const { g, p } = setup();
    p.inv.tunique = 1;
    g.handle(p, { t: 'equip', item: 'tunique' });
    const mhp = p.stats.mhp;
    g.handle(p, { t: 'unequip', slot: 'torse' });
    expect(p.equip.torse).toBeUndefined();
    expect(p.inv.tunique).toBe(1);
    expect(p.stats.mhp).toBe(mhp - 120);
  });
});

describe('grimoire', () => {
  it('donne un point de sort par niveau et le dépense pour monter un rang', () => {
    const { g, p } = setup();
    expect(pointsLeft(p.level, p.ranks)).toBe(0);
    g.handle(p, { t: 'upgrade', spell: 'tir' });
    expect(p.ranks.tir).toBeUndefined();
    p.level = 7; p.refreshStats();
    expect(pointsLeft(p.level, p.ranks)).toBe(6);
    g.handle(p, { t: 'upgrade', spell: 'tir' });
    g.handle(p, { t: 'upgrade', spell: 'tir' });
    g.handle(p, { t: 'upgrade', spell: 'tir' }); // rang 4 demande le niveau 10
    expect(p.ranks.tir).toBe(3);
    g.handle(p, { t: 'upgrade', spell: 'marque' }); // marque débloquée au niveau 5, rang 2 au niveau 8
    expect(p.ranks.marque).toBeUndefined();
    expect(pointsLeft(p.level, p.ranks)).toBe(4);
    g.handle(p, { t: 'resetSpells' });
    expect(p.ranks).toEqual({});
    expect(pointsLeft(p.level, p.ranks)).toBe(6);
  });

  it('un rang plus élevé frappe plus fort', () => {
    expect(spellFx('tir', 3).mult).toBeCloseTo(spellFx('tir', 1).mult * 1.3);
    expect(spellFx('vent', 5).dash).toBe(6);
    const hits = (rank: number) => {
      const { g, p, inbox } = setup();
      p.level = 10; p.refreshStats(); p.stats.crit = 0; p.stats.dmg = [100, 100];
      if (rank > 1) p.ranks.tir = rank;
      const m = g.maps.get('route')!;
      const mob = m.mobs.find(o => o.kind === 'gorrok')!;
      p.x = mob.x + 3; p.z = mob.z; p.target = mob.id; p.atkTimer = 99;
      g.handle(p, { t: 'cast', spell: 'tir' });
      for (let k = 0; k < 10; k++) { p.atkTimer = 99; g.tick(); }
      const dmg = inbox.flatMap(x => x.t === 'ev' ? x.ev : []).find(e => e.e === 'dmg' && e.id === mob.id);
      return dmg && dmg.e === 'dmg' ? dmg.n : 0;
    };
    expect(hits(1)).toBe(220);
    expect(hits(4)).toBe(319);
  });
});

describe('déplacements et dégâts', () => {
  const run = (mx: number, mz: number, perTick: number) => {
    const { g, p } = setup();
    p.x = 13; p.z = 13;
    const x0 = p.x, z0 = p.z;
    let seq = 0;
    for (let k = 0; k < 20; k++) { for (let i = 0; i < perTick; i++) g.handle(p, { t: 'input', seq: ++seq, mx, mz }); g.tick(); }
    return Math.hypot(p.x - x0, p.z - z0);
  };

  it('va aussi vite en diagonale qu’en ligne droite, quelle que soit la longueur du vecteur envoyé', () => {
    const droit = run(1, 0, 1);
    expect(droit).toBeCloseTo(4.2, 1); // 4,2 cases par seconde
    expect(run(1, 1, 1)).toBeCloseTo(droit, 5);
    expect(run(50, -50, 1)).toBeCloseTo(droit, 5);
  });

  it('envoyer plus d’entrées que prévu ne fait pas aller plus vite', () => {
    expect(run(1, 0, 4)).toBeLessThanOrEqual(run(1, 0, 1) + 3 * 4.2 * DT + 1e-9);
  });

  it('les dégâts reçus sont toujours des nombres entiers, même à travers un bouclier fractionnaire', () => {
    const { g, p, inbox } = setup();
    const m = g.maps.get('route')!;
    const mob = m.mobs.find(o => o.kind === 'gorrok')!;
    p.sh = 7.56; p.lastHurt = -99;
    mob.x = p.x + 0.8; mob.z = p.z; mob.state = 'chase'; mob.target = p.id; mob.atkTimer = 0;
    for (let k = 0; k < 40; k++) { p.hp = p.stats.mhp; g.tick(); }
    const dmg = inbox.flatMap(x => x.t === 'ev' ? x.ev : []).filter(e => e.e === 'dmg' && e.id === p.id);
    expect(dmg.length).toBeGreaterThan(0);
    for (const e of dmg) if (e.e === 'dmg') expect(Number.isInteger(e.n), String(e.n)).toBe(true);
  });
});
