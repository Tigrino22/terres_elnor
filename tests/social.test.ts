import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/game';
import { MAPS, START_MAP } from '../src/shared/data';
import { isBlocked } from '../src/shared/mapgen';
import type { ServerMsg } from '../src/shared/protocol';

const entrer = (g: Game, name: string, save?: Parameters<Game['join']>[3]) => {
  const inbox: ServerMsg[] = [];
  const saves: unknown[] = [];
  const p = g.join({ send: m => inbox.push(m) }, name, 'elfe', save, s => saves.push(s));
  return { p, inbox, saves, social: () => inbox.filter(m => m.t === 'social').at(-1) as Extract<ServerMsg, { t: 'social' }> | undefined };
};

describe('carte de départ', () => {
  it('tous les nouveaux personnages apparaissent sur la même carte, sûre, autour du feu de camp', () => {
    const g = new Game(5);
    const a = entrer(g, 'Lyraël'), b = entrer(g, 'Borin');
    expect(START_MAP).toBe('halte');
    expect(a.p.mapId).toBe('halte');
    expect(b.p.mapId).toBe('halte');
    expect(Math.hypot(a.p.x - b.p.x, a.p.z - b.p.z)).toBeLessThan(3);
    const m = g.maps.get('halte')!;
    expect(m.mobs.length).toBe(0);
    expect(m.data.camp).toBeTruthy();
    expect(isBlocked(m.data, a.p.x, a.p.z)).toBe(false);
  });

  it('la carte de départ est reliée à la Route de Valcourt dans les deux sens', () => {
    expect(MAPS.halte.portals.some(p => p.to === 'route')).toBe(true);
    expect(MAPS.route.portals.some(p => p.to === 'halte')).toBe(true);
  });
});

describe('amis et joueurs connectés', () => {
  it('chacun voit la liste des connectés avec niveau, race, voie et carte', () => {
    const g = new Game(5);
    const a = entrer(g, 'Lyraël'), b = entrer(g, 'Borin');
    g.tick();
    const s = a.social()!;
    expect(s.online.map(o => o.name)).toEqual(['Borin', 'Lyraël']);
    expect(s.online[0]).toMatchObject({ level: 1, race: 'elfe', voie: 'Voie de l’Arc', online: true, map: 'Halte de Valcourt', coords: [4, 0] });
    g.leave(b.p); g.tick();
    expect(a.social()!.online.map(o => o.name)).toEqual(['Lyraël']);
  });

  it('ajoute un ami connecté, le garde hors ligne et le retrouve dans la sauvegarde', () => {
    const g = new Game(5);
    const a = entrer(g, 'Lyraël'), b = entrer(g, 'Borin');
    g.handle(a.p, { t: 'ami', name: 'borin', add: true });
    g.handle(a.p, { t: 'ami', name: 'Inconnu', add: true });
    g.handle(a.p, { t: 'ami', name: 'Lyraël', add: true });
    g.tick();
    expect(a.social()!.amis).toEqual([expect.objectContaining({ name: 'Borin', online: true })]);
    b.p.level = 7;
    g.tick();
    g.leave(b.p); g.tick();
    expect(a.social()!.amis).toEqual([expect.objectContaining({ name: 'Borin', online: false, level: 7 })]);
    expect(a.p.toSave().amis).toEqual([{ name: 'Borin', race: 'elfe', level: 7 }]);

    const g2 = new Game(6);
    const a2 = entrer(g2, 'Lyraël', a.p.toSave());
    g2.tick();
    expect(a2.social()!.amis[0]).toMatchObject({ name: 'Borin', online: false });
    const b2 = entrer(g2, 'Borin');
    g2.tick();
    expect(a2.social()!.amis[0]).toMatchObject({ name: 'Borin', online: true });
    expect(a2.inbox.some(m => m.t === 'ev' && m.ev.some(e => e.e === 'msg' && e.text.includes('Borin vient de se connecter')))).toBe(true);

    g2.handle(a2.p, { t: 'ami', name: 'Borin', add: false });
    g2.tick();
    expect(a2.social()!.amis).toEqual([]);
    void b2;
  });

  it('ignore une liste d’amis trafiquée dans la sauvegarde', () => {
    const g = new Game(5);
    const save = entrer(new Game(1), 'X').p.toSave();
    const a = entrer(g, 'Lyraël', { ...save, amis: [...Array(80)].map((_, k) => ({ name: `Ami${k}`, race: 'orc' as never, level: 999 })) });
    expect(a.p.amis.length).toBe(50);
    expect(a.p.amis[0]).toEqual({ name: 'Ami0', race: 'elfe', level: 20 });
  });
});
