// Simulation autoritaire du monde. Aucune dépendance au navigateur ni à Node :
// le serveur l'exécute pour tous les joueurs, le mode solo l'exécute dans la page.

import { ITEMS, MAPS, MOBS, NODES, RECIPES, SPELLS, START_MAP, MobDef, SpellId, Slot } from '../shared/data';
import { generateMap, moveWithCollision, nearestFree, MapData } from '../shared/mapgen';
import { rng, randInt, Rng } from '../shared/rng';
import { AUTO_EVERY, AUTO_RANGE, DT, MAX_LEVEL, computeStats, xpFactor, xpNext, Stats } from '../shared/stats';
import { MAX_RANK, Ranks, pointsLeft, rankLevel, rankOf, spellFx, spentPoints } from '../shared/ranks';
import type { AmiSave, ClientMsg, EntSnap, GameEvent, JoueurInfo, Race, SaveData, SelfState, ServerMsg } from '../shared/protocol';

export interface Client { send(msg: ServerMsg): void }

/** Sauvegarde automatique : toutes les 30 s, et à chaque étape importante. */
export const AUTOSAVE_EVERY = 30;

type Cd = SpellId | 'potPV' | 'potMP';

/** Seule voie jouable pour l'instant ; sera un choix à la création quand les autres voies arriveront. */
export const VOIE = 'Voie de l’Arc';
export const MAX_AMIS = 50;
/** Rafraîchissement de la liste des joueurs connectés, en secondes. */
const SOCIAL_EVERY = 2;
const memeNom = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export class Player {
  x = 0; z = 0; f = 0;
  level = 1; xp = 0; ecus = 0;
  hp = 0; sh = 0; mp = 0;
  stats: Stats;
  inv: Record<string, number> = { potPV: 3, potMP: 2 };
  equip: Partial<Record<Slot, string>> = {};
  ranks: Ranks = {};
  amis: AmiSave[] = [];
  lastSocial = '';
  /** appelé avec l'état du personnage à chaque sauvegarde */
  persist: ((s: SaveData) => void) | null = null;
  cds: Partial<Record<Cd, number>> = {};
  target: number | null = null;
  inputs: { seq: number; mx: number; mz: number }[] = [];
  lastSeq = 0;
  moveCredit = 0;
  moving = false;
  lastHurt = -99; lastAtk = -99; atkTimer = 0;
  dead = 0;
  portalCd = 0; portalMsgAt = -99;
  harvesting: { id: number; t: number; total: number } | null = null;
  priv: GameEvent[] = [];
  constructor(public id: number, public name: string, public race: Race, public client: Client, public mapId: string) {
    this.stats = computeStats(1, {});
    this.hp = this.stats.mhp; this.sh = this.stats.msh; this.mp = this.stats.mmp;
  }
  refreshStats() {
    const s = computeStats(this.level, this.equip);
    this.stats = s;
    this.hp = Math.min(this.hp, s.mhp); this.sh = Math.min(this.sh, s.msh); this.mp = Math.min(this.mp, s.mmp);
  }
  msg(text: string, c: 'm' | 'g' | 's' | 'w' | 'n' = 'n') { this.priv.push({ e: 'msg', text, c }); }
  toSave(): SaveData {
    return {
      v: 1, map: this.mapId, x: r2(this.x), z: r2(this.z), level: this.level, xp: this.xp, ecus: this.ecus,
      hp: this.dead ? this.stats.mhp : Math.round(this.hp), mp: Math.round(this.mp),
      inv: { ...this.inv }, equip: { ...this.equip }, ranks: { ...this.ranks }, amis: this.amis.map(a => ({ ...a })),
    };
  }
  /** Relit une sauvegarde en ignorant tout ce qui n'existe plus dans les données du jeu. */
  restore(s: SaveData) {
    const int = (n: unknown, lo: number, hi: number, d: number) => Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.floor(n as number))) : d;
    this.level = int(s.level, 1, MAX_LEVEL, 1);
    this.xp = int(s.xp, 0, xpNext(this.level), 0);
    this.ecus = int(s.ecus, 0, 1e9, 0);
    this.inv = {};
    for (const [k, q] of Object.entries(s.inv ?? {})) if (ITEMS[k] && int(q, 0, 1e6, 0) > 0) this.inv[k] = int(q, 0, 1e6, 0);
    this.equip = {};
    for (const [slot, id] of Object.entries(s.equip ?? {})) if (id && ITEMS[id]?.slot === slot) this.equip[slot as Slot] = id;
    this.ranks = {};
    for (const sp of SPELLS) {
      const r = int(s.ranks?.[sp.id], 1, MAX_RANK, 1);
      if (r > 1 && this.level >= rankLevel(sp.id, r)) this.ranks[sp.id] = r;
    }
    if (spentPoints(this.ranks) > this.level - 1) this.ranks = {};
    this.amis = [];
    for (const a of Array.isArray(s.amis) ? s.amis.slice(0, MAX_AMIS) : []) {
      const name = String(a?.name ?? '').slice(0, 16);
      if (name && !this.amis.some(b => memeNom(b.name, name))) this.amis.push({ name, race: a.race === 'humain' ? 'humain' : 'elfe', level: int(a.level, 1, MAX_LEVEL, 1) });
    }
    this.refreshStats();
    this.hp = int(s.hp, 1, this.stats.mhp, this.stats.mhp);
    this.mp = int(s.mp, 0, this.stats.mmp, this.stats.mmp);
    this.sh = this.stats.msh;
  }
}

class Mob {
  x: number; z: number; f = 0;
  hp: number;
  state: 'idle' | 'chase' | 'return' | 'dead' = 'idle';
  target: number | null = null;
  atkTimer = 0; special = 0;
  rootUntil = 0; markUntil = 0; markBonus = 0.25;
  respawnAt = 0;
  wander: { x: number; z: number } | null = null; wanderAt = 0;
  tagged = new Map<number, number>();
  constructor(public id: number, public kind: string, public def: MobDef, public hx: number, public hz: number, public group: number) {
    this.x = hx; this.z = hz; this.hp = def.hp;
    this.special = def.special?.every ?? 0;
  }
}

interface Loot { id: number; x: number; z: number; owner: number; items: Record<string, number>; ecus: number; until: number; freeAt: number }
interface Node { id: number; kind: keyof typeof NODES; x: number; z: number; until: number }
interface Trap { id: number; owner: number; x: number; z: number; armAt: number; until: number; root: number; mult: number }
interface Pending { at: number; run: () => void }

export class MapInstance {
  data: MapData;
  mobs: Mob[] = [];
  loots: Loot[] = [];
  nodes: Node[] = [];
  traps: Trap[] = [];
  pending: Pending[] = [];
  players = new Set<Player>();
  events: GameEvent[] = [];
  constructor(public game: Game, public id: string) {
    this.data = generateMap(MAPS[id]);
    const def = MAPS[id];
    def.mobs.forEach((g, gi) => {
      for (let k = 0; k < g.count; k++) {
        const a = (k / g.count) * Math.PI * 2, d = g.count > 1 ? 1.3 : 0;
        const p = nearestFree(this.data, g.i + Math.cos(a) * d, g.j + Math.sin(a) * d);
        this.mobs.push(new Mob(game.newId(), g.kind, MOBS[g.kind], p.x, p.z, gi));
      }
    });
    def.nodes.forEach(n => this.nodes.push({ id: game.newId(), kind: n.kind, x: n.i, z: n.j, until: 0 }));
  }
  get time() { return this.game.time; }
}

const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
const r2 = (n: number) => Math.round(n * 100) / 100;

export class Game {
  time = 0;
  tickN = 0;
  maps = new Map<string, MapInstance>();
  players = new Map<number, Player>();
  private nextId = 1;
  r: Rng;

  /** `start` : carte des nouveaux personnages (START_MAP en jeu ; les tests en choisissent une autre). */
  constructor(seed = 1, public start = START_MAP) {
    this.r = rng(seed);
    for (const id of Object.keys(MAPS)) this.maps.set(id, new MapInstance(this, id));
  }
  newId() { return this.nextId++; }

  // ------------------------------------------------------------------ connexion
  /** Fait entrer un personnage, neuf ou repris d'une sauvegarde, là où il s'était arrêté. */
  join(client: Client, name: string, race: Race, save?: SaveData | null, persist?: (s: SaveData) => void): Player {
    const clean = (name || '').replace(/[^\p{L}\p{N} '-]/gu, '').trim().slice(0, 16) || 'Voyageur';
    const back = !!save && !!this.maps.get(save.map);
    const p = new Player(this.newId(), clean, race === 'humain' ? 'humain' : 'elfe', client, back ? save!.map : this.start);
    if (save) p.restore(save);
    p.persist = persist ?? null;
    this.players.set(p.id, p);
    const m = this.maps.get(p.mapId)!;
    const s = back && Number.isFinite(save!.x) && Number.isFinite(save!.z) ? nearestFree(m.data, save!.x, save!.z) : nearestFree(m.data, m.data.spawn.x, m.data.spawn.z);
    p.x = s.x; p.z = s.z;
    p.portalCd = 1.5;
    m.players.add(p);
    client.send({ t: 'welcome', you: p.id });
    client.send({ t: 'map', map: m.id, x: p.x, z: p.z });
    if (save) {
      p.msg(`Bon retour, ${p.name}. Tu reprends là où tu t’étais arrêté.`, 'g');
      const pts = pointsLeft(p.level, p.ranks);
      if (pts) p.msg(`${pts} point${pts > 1 ? 's' : ''} de sort à dépenser : touche K.`, 's');
    } else {
      p.msg(`Bienvenue dans les Terres d'Elnor, ${p.name}.`, 'g');
      p.msg('ZQSD ou flèches pour bouger, l’arc tire tout seul. Sorts 1 à 6, potions 7 et 8.', 's');
    }
    this.broadcastChat('', `${p.name} arrive sur ${m.data.def.name}.`);
    for (const q of this.players.values()) if (q !== p && q.amis.some(a => memeNom(a.name, p.name))) q.msg(`Ton ami ${p.name} vient de se connecter.`, 'g');
    this.socialDirty = true;
    this.save(p);
    return p;
  }

  save(p: Player) { p.persist?.(p.toSave()); }
  saveAll() { for (const p of this.players.values()) this.save(p); }

  leave(p: Player) {
    this.save(p);
    p.persist = null;
    this.maps.get(p.mapId)?.players.delete(p);
    this.players.delete(p.id);
    for (const m of this.maps.values()) for (const mob of m.mobs) if (mob.target === p.id) { mob.target = null; mob.state = 'return'; }
    // ses amis gardent son dernier niveau pour l'afficher hors ligne
    for (const q of this.players.values()) for (const a of q.amis) if (memeNom(a.name, p.name)) { a.level = p.level; a.race = p.race; }
    this.socialDirty = true;
  }

  // ------------------------------------------------------------------ amis et joueurs connectés
  socialDirty = true;

  private info(p: Player): JoueurInfo {
    const d = MAPS[p.mapId];
    return { name: p.name, race: p.race, voie: VOIE, level: p.level, online: true, map: d.name, coords: d.coords };
  }

  /** Envoie à chacun la liste des connectés et de ses amis, seulement si elle a changé. */
  private sendSocial() {
    const online = [...this.players.values()].map(p => this.info(p)).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    for (const p of this.players.values()) {
      const amis = p.amis.map(a => {
        const on = online.find(o => memeNom(o.name, a.name));
        if (on) { a.race = on.race; a.level = on.level; a.name = on.name; return on; }
        return { name: a.name, race: a.race, voie: VOIE, level: a.level, online: false };
      }).sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name, 'fr'));
      const json = JSON.stringify([online, amis]);
      if (json === p.lastSocial) continue;
      p.lastSocial = json;
      p.client.send({ t: 'social', online, amis });
    }
  }

  private ami(p: Player, nom: string, add: boolean) {
    const name = String(nom ?? '').trim().slice(0, 16);
    if (!name) return;
    if (!add) {
      const before = p.amis.length;
      p.amis = p.amis.filter(a => !memeNom(a.name, name));
      if (p.amis.length < before) p.msg(`${name} n’est plus dans tes amis.`, 's');
    } else {
      const q = [...this.players.values()].find(o => memeNom(o.name, name));
      if (!q) { p.msg(`Aucun personnage connecté ne s’appelle « ${name} ».`, 'w'); return; }
      if (q === p) { p.msg('Tu ne peux pas t’ajouter toi-même.', 'w'); return; }
      if (p.amis.some(a => memeNom(a.name, q.name))) { p.msg(`${q.name} est déjà dans tes amis.`, 'w'); return; }
      if (p.amis.length >= MAX_AMIS) { p.msg(`Pas plus de ${MAX_AMIS} amis.`, 'w'); return; }
      p.amis.push({ name: q.name, race: q.race, level: q.level });
      p.msg(`${q.name} est maintenant dans tes amis.`, 'g');
      q.msg(`${p.name} t’a ajouté à ses amis.`, 's');
    }
    p.lastSocial = '';
    this.socialDirty = true;
    this.save(p);
  }

  broadcastChat(from: string, text: string) {
    for (const p of this.players.values()) p.client.send({ t: 'chat', from, text });
  }

  // ------------------------------------------------------------------ messages
  handle(p: Player, msg: ClientMsg) {
    const m = this.maps.get(p.mapId)!;
    switch (msg.t) {
      case 'input': {
        if (!Number.isFinite(msg.seq) || !Number.isFinite(msg.mx) || !Number.isFinite(msg.mz)) return;
        // direction normalisée : en diagonale on ne va pas plus vite qu'en ligne droite
        const l = Math.hypot(msg.mx, msg.mz);
        const mx = l > 1e-6 ? msg.mx / l : 0, mz = l > 1e-6 ? msg.mz / l : 0;
        if (p.inputs.length < 40) p.inputs.push({ seq: msg.seq, mx, mz });
        break;
      }
      case 'target': {
        if (msg.id === null) { p.target = null; break; }
        if (m.mobs.some(o => o.id === msg.id && o.state !== 'dead')) p.target = msg.id;
        break;
      }
      case 'cast': this.cast(p, m, msg.spell, msg.mx ?? 0, msg.mz ?? 0); break;
      case 'use': this.usePotion(p, msg.item); break;
      case 'harvest': {
        const n = m.nodes.find(o => o.id === msg.id);
        if (!n || p.dead) return;
        if (n.until > this.time) { p.msg('Cette ressource repousse, reviens plus tard.', 'w'); return; }
        if (dist(p, n) > 1.9) { p.msg('Approche-toi pour récolter.', 'w'); return; }
        p.harvesting = { id: n.id, t: 0, total: NODES[n.kind].time };
        break;
      }
      case 'craft': this.craft(p, msg.recipe); break;
      case 'equip': this.equip(p, msg.item); break;
      case 'unequip': this.unequip(p, msg.slot); break;
      case 'upgrade': this.upgrade(p, msg.spell); break;
      case 'resetSpells': this.resetSpells(p); break;
      case 'ami': this.ami(p, msg.name, !!msg.add); break;
      case 'chat': {
        const text = String(msg.text || '').slice(0, 160).trim();
        if (text) this.broadcastChat(p.name, text);
        break;
      }
    }
  }

  // ------------------------------------------------------------------ boucle
  tick() {
    this.time += DT;
    this.tickN++;
    for (const m of this.maps.values()) this.tickMap(m);
    for (const m of this.maps.values()) this.broadcast(m);
    if (this.socialDirty || this.tickN % Math.round(SOCIAL_EVERY / DT) === 0) { this.socialDirty = false; this.sendSocial(); }
    if (this.tickN % Math.round(AUTOSAVE_EVERY / DT) === 0) this.saveAll();
  }

  private tickMap(m: MapInstance) {
    const t = this.time;
    // effets différés (flèches en vol, volées, ruées)
    const due = m.pending.filter(q => q.at <= t);
    m.pending = m.pending.filter(q => q.at > t);
    due.forEach(q => q.run());

    for (const p of [...m.players]) this.tickPlayer(p, m);
    for (const mob of m.mobs) this.tickMob(mob, m);
    // les monstres ne s'empilent pas
    for (let a = 0; a < m.mobs.length; a++) for (let b = a + 1; b < m.mobs.length; b++) {
      const A = m.mobs[a], B = m.mobs[b];
      if (A.state === 'dead' || B.state === 'dead') continue;
      const d = dist(A, B), min = A.def.radius + B.def.radius;
      if (d > 0.001 && d < min) {
        const push = (min - d) / 2, nx = (A.x - B.x) / d, nz = (A.z - B.z) / d;
        Object.assign(A, moveWithCollision(m.data, A.x, A.z, nx * push, nz * push));
        Object.assign(B, moveWithCollision(m.data, B.x, B.z, -nx * push, -nz * push));
      }
    }
    // pièges
    for (const tr of m.traps) {
      if (tr.armAt > t) continue;
      const hit = m.mobs.find(o => o.state !== 'dead' && dist(o, tr) < 1.0 + o.def.radius);
      if (!hit) continue;
      const owner = this.players.get(tr.owner);
      m.events.push({ e: 'aoe', x: tr.x, z: tr.z, r: 2, kind: 'piege' });
      for (const o of m.mobs) if (o.state !== 'dead' && dist(o, tr) < 2) {
        o.rootUntil = t + tr.root;
        if (owner && owner.mapId === m.id) this.hitMob(owner, m, o, tr.mult);
      }
      tr.until = 0;
    }
    m.traps = m.traps.filter(tr => {
      if (tr.until > t) return true;
      m.events.push({ e: 'trap', id: tr.id, x: tr.x, z: tr.z, on: false });
      return false;
    });
    m.loots = m.loots.filter(l => l.until > t);
    for (const n of m.nodes) if (n.until && n.until <= t) n.until = 0;
  }

  private tickPlayer(p: Player, m: MapInstance) {
    const t = this.time;
    if (p.dead) {
      p.inputs.length && (p.lastSeq = p.inputs[p.inputs.length - 1].seq);
      p.inputs.length = 0;
      if (t >= p.dead) {
        p.dead = 0;
        const s = nearestFree(m.data, m.data.spawn.x, m.data.spawn.z);
        p.x = s.x; p.z = s.z;
        p.hp = p.stats.mhp; p.sh = p.stats.msh; p.mp = Math.max(p.mp, p.stats.mmp / 2);
        p.msg('Tu reviens à la vie au centre de la carte.', 's');
        p.client.send({ t: 'map', map: m.id, x: p.x, z: p.z });
      }
      return;
    }
    // déplacement : une entrée = un pas de durée DT. Le crédit gagne un pas par tick (3 au plus en réserve)
    // pour rattraper un retard réseau, sans jamais permettre d'aller plus vite qu'un pas par tick en moyenne.
    p.moveCredit = Math.min(3, p.moveCredit + 1);
    let n = Math.min(2, Math.floor(p.moveCredit));
    p.moving = false;
    while (n-- > 0 && p.inputs.length) {
      p.moveCredit--;
      const inp = p.inputs.shift()!;
      p.lastSeq = inp.seq;
      if (inp.mx || inp.mz) {
        const sp = p.stats.speed * DT;
        const r = moveWithCollision(m.data, p.x, p.z, inp.mx * sp, inp.mz * sp);
        p.x = r.x; p.z = r.z; p.f = Math.atan2(inp.mx, inp.mz);
        p.moving = true;
      }
    }
    if (p.moving && p.harvesting) { p.harvesting = null; p.msg('Récolte interrompue.', 'w'); }

    // portails
    p.portalCd -= DT;
    for (const pt of m.data.portals) {
      if (Math.hypot(p.x - pt.i, p.z - pt.j) > 0.75) continue;
      if (!pt.to) {
        if (t - p.portalMsgAt > 3) { p.msg(`${pt.label} : cette carte ouvrira plus tard.`, 'w'); p.portalMsgAt = t; }
        continue;
      }
      if (p.portalCd <= 0) { this.transfer(p, m, pt.to); return; }
    }

    // régénération
    p.mp = Math.min(p.stats.mmp, p.mp + (3 + p.stats.mmp * 0.012) * DT);
    if (t - p.lastHurt > 4) p.sh = Math.min(p.stats.msh, p.sh + p.stats.msh * 0.15 * DT);
    if (t - p.lastHurt > 6 && t - p.lastAtk > 6) p.hp = Math.min(p.stats.mhp, p.hp + p.stats.mhp * 0.04 * DT);
    for (const k of Object.keys(p.cds) as Cd[]) if ((p.cds[k] ?? 0) <= t) delete p.cds[k];

    // récolte
    if (p.harvesting) {
      const node = m.nodes.find(o => o.id === p.harvesting!.id);
      if (!node || node.until > t || dist(p, node) > 2.2) p.harvesting = null;
      else if ((p.harvesting.t += DT) >= p.harvesting.total) {
        const def = NODES[node.kind];
        const qty = 1 + (this.r() < 0.35 ? 1 : 0);
        this.give(p, def.item, qty);
        node.until = t + def.respawn;
        p.harvesting = null;
      }
    }

    // ramassage du butin
    for (const l of m.loots) {
      if (dist(p, l) > 1.1 || (l.owner !== p.id && t < l.freeAt)) continue;
      for (const [k, q] of Object.entries(l.items)) this.give(p, k, q);
      if (l.ecus) { p.ecus += l.ecus; p.priv.push({ e: 'loot', item: 'ecus', n: l.ecus }); }
      l.until = 0;
    }

    // attaque automatique
    p.atkTimer -= DT;
    let tg = p.target != null ? m.mobs.find(o => o.id === p.target && o.state !== 'dead') : undefined;
    if (!tg) {
      p.target = null;
      let best: Mob | undefined, bd = AUTO_RANGE;
      for (const o of m.mobs) {
        // les monstres passifs ne sont visés que sur demande (Tab ou clic)
        if (o.state === 'dead' || (!o.def.aggro && o.target !== p.id)) continue;
        const d = dist(p, o);
        // on vise d'abord ce qui nous attaque, puis le plus proche
        const score = d - (o.target === p.id ? 3 : 0);
        if (d <= AUTO_RANGE && score < bd) { bd = score; best = o; }
      }
      if (best) { tg = best; p.target = best.id; }
    }
    if (tg && p.atkTimer <= 0 && !p.harvesting && dist(p, tg) <= AUTO_RANGE) {
      p.atkTimer = AUTO_EVERY;
      p.lastAtk = t;
      if (!p.moving) p.f = Math.atan2(tg.x - p.x, tg.z - p.z);
      m.events.push({ e: 'shot', from: p.id, to: tg.id });
      const target = tg;
      m.pending.push({ at: t + dist(p, tg) / 18, run: () => target.state !== 'dead' && p.mapId === m.id && this.hitMob(p, m, target, 1) });
    }
  }

  private transfer(p: Player, from: MapInstance, toId: string) {
    const to = this.maps.get(toId);
    if (!to) return;
    from.players.delete(p);
    for (const mob of from.mobs) if (mob.target === p.id) { mob.target = null; mob.state = 'return'; }
    const back = to.data.portals.find(pt => pt.to === from.id) ?? to.data.portals[0];
    const s = nearestFree(to.data, back.i + back.ii * 2, back.j + back.jj * 2);
    p.x = s.x; p.z = s.z;
    p.mapId = toId;
    p.target = null; p.harvesting = null;
    p.portalCd = 1.5;
    if (p.inputs.length) p.lastSeq = p.inputs[p.inputs.length - 1].seq;
    p.inputs.length = 0;
    to.players.add(p);
    p.client.send({ t: 'map', map: toId, x: p.x, z: p.z });
    p.msg(`Tu entres dans ${to.data.def.name} (${to.data.def.coords.join(', ').replace('-', '−')}).`, 's');
    this.save(p);
  }

  // ------------------------------------------------------------------ monstres
  private tickMob(o: Mob, m: MapInstance) {
    const t = this.time, d = o.def;
    if (o.state === 'dead') {
      if (t >= o.respawnAt) {
        const s = nearestFree(m.data, o.hx + (this.r() - 0.5) * 2, o.hz + (this.r() - 0.5) * 2);
        o.x = s.x; o.z = s.z; o.hp = d.hp; o.state = 'idle'; o.target = null; o.tagged.clear();
        o.rootUntil = 0; o.markUntil = 0;
      }
      return;
    }
    const rooted = o.rootUntil > t;
    const step = (tx: number, tz: number, speed: number) => {
      if (rooted) return;
      const dx = tx - o.x, dz = tz - o.z, l = Math.hypot(dx, dz);
      if (l < 0.01) return;
      const s = Math.min(l, speed * DT);
      const r = moveWithCollision(m.data, o.x, o.z, (dx / l) * s, (dz / l) * s, Math.min(0.3, d.radius));
      o.x = r.x; o.z = r.z; o.f = Math.atan2(dx, dz);
    };

    if (o.state === 'idle') {
      if (o.hp < d.hp) o.hp = Math.min(d.hp, o.hp + d.hp * 0.05 * DT);
      if (d.aggro > 0) {
        let best: Player | undefined, bd = d.aggro;
        for (const p of m.players) if (!p.dead && dist(p, o) < bd) { bd = dist(p, o); best = p; }
        if (best) this.aggro(m, o, best.id);
      }
      if (o.state === 'idle') {
        if (!o.wander || t > o.wanderAt) {
          o.wander = { x: o.hx + (this.r() - 0.5) * 4, z: o.hz + (this.r() - 0.5) * 4 };
          o.wanderAt = t + 4 + this.r() * 5;
        }
        if (dist(o, o.wander) > 0.2) step(o.wander.x, o.wander.z, d.speed * 0.35);
      }
      return;
    }
    if (o.state === 'return') {
      step(o.hx, o.hz, d.speed * 1.4);
      o.hp = Math.min(d.hp, o.hp + d.hp * 0.25 * DT);
      if (rooted || Math.hypot(o.x - o.hx, o.z - o.hz) < 0.4) { o.state = 'idle'; o.tagged.clear(); }
      return;
    }
    // poursuite
    const p = o.target != null ? this.players.get(o.target) : undefined;
    if (!p || p.dead || p.mapId !== m.id || Math.hypot(o.x - o.hx, o.z - o.hz) > 11) {
      o.target = null; o.state = 'return'; return;
    }
    const dp = dist(o, p);
    o.atkTimer -= DT;
    if (d.special && (o.special -= DT) <= 0 && dp < 7) {
      o.special = d.special.every;
      const sp = d.special, cx = p.x, cz = p.z;
      m.events.push({ e: 'tele', x: r2(cx), z: r2(cz), r: sp.radius, dur: sp.windup });
      m.pending.push({
        at: t + sp.windup, run: () => {
          if (o.state === 'dead') return;
          const x0 = o.x, z0 = o.z;
          const r = moveWithCollision(m.data, o.x, o.z, cx - o.x, cz - o.z, 0.3);
          o.x = r.x; o.z = r.z;
          m.events.push({ e: 'dash', id: o.id, x0: r2(x0), z0: r2(z0), x1: r2(o.x), z1: r2(o.z) });
          m.events.push({ e: 'aoe', x: r2(cx), z: r2(cz), r: sp.radius, kind: 'ruee' });
          for (const q of m.players) if (!q.dead && Math.hypot(q.x - cx, q.z - cz) < sp.radius) this.hurt(q, m, sp.dmg);
        },
      });
    }
    if (dp > d.range + d.radius * 0.5) step(p.x, p.z, d.speed);
    else {
      o.f = Math.atan2(p.x - o.x, p.z - o.z);
      if (o.atkTimer <= 0) { o.atkTimer = d.atkEvery; this.hurt(p, m, randInt(this.r, d.dmg[0], d.dmg[1])); }
    }
  }

  private aggro(m: MapInstance, o: Mob, pid: number) {
    if (o.state === 'dead' || o.state === 'return') return;
    const was = o.state;
    o.target = pid; o.state = 'chase';
    if (was === 'idle') {
      o.atkTimer = 0.6;
      // la meute suit
      for (const k of m.mobs) if (k !== o && k.group === o.group && k.state === 'idle' && dist(k, o) < 6) { k.target = pid; k.state = 'chase'; k.atkTimer = 0.8; }
    }
  }

  private hurt(p: Player, m: MapInstance, n: number) {
    if (p.dead) return;
    p.lastHurt = this.time;
    // dégâts toujours entiers : le bouclier (qui se recharge par fractions) absorbe un nombre entier de points
    let rest = Math.max(0, Math.round(n));
    if (p.sh > 0) {
      const a = Math.min(rest, Math.ceil(p.sh));
      p.sh = Math.max(0, p.sh - a); rest -= a;
      if (a) m.events.push({ e: 'dmg', id: p.id, n: a, shield: true });
    }
    if (rest > 0) { p.hp -= rest; m.events.push({ e: 'dmg', id: p.id, n: rest }); }
    if (p.hp <= 0) {
      p.hp = 0; p.dead = this.time + 4; p.target = null; p.harvesting = null;
      m.events.push({ e: 'die', id: p.id });
      p.msg('Tu es tombé au combat. Retour au centre de la carte dans 4 s.', 'w');
      for (const o of m.mobs) if (o.target === p.id) { o.target = null; o.state = 'return'; }
    }
  }

  private hitMob(p: Player, m: MapInstance, o: Mob, mult: number) {
    if (o.state === 'dead') return;
    const [a, b] = p.stats.dmg;
    const crit = this.r() < p.stats.crit;
    let n = (a + this.r() * (b - a)) * mult * (crit ? 1.5 : 1) * (o.markUntil > this.time ? 1 + o.markBonus : 1);
    n = Math.max(1, Math.round(n));
    o.hp -= n;
    o.tagged.set(p.id, (o.tagged.get(p.id) ?? 0) + n);
    p.lastAtk = this.time;
    m.events.push({ e: 'dmg', id: o.id, n, crit });
    if (o.hp <= 0) return this.killMob(m, o);
    if (o.state === 'idle') this.aggro(m, o, p.id);
  }

  private killMob(m: MapInstance, o: Mob) {
    const d = o.def;
    o.hp = 0; o.state = 'dead'; o.respawnAt = this.time + d.respawn;
    m.events.push({ e: 'die', id: o.id });
    let top: Player | undefined, topN = -1;
    for (const [pid, n] of o.tagged) {
      const p = this.players.get(pid);
      if (!p || p.mapId !== m.id) continue;
      this.giveXp(p, Math.round(d.xp * xpFactor(p.level, d.level)), d.name);
      if (n > topN) { topN = n; top = p; }
    }
    if (!top) return;
    const items: Record<string, number> = {};
    for (const l of d.loot) if (this.r() < l.chance) items[l.item] = randInt(this.r, l.min, l.max);
    m.loots.push({ id: this.newId(), x: r2(o.x), z: r2(o.z), owner: top.id, items, ecus: randInt(this.r, d.ecus[0], d.ecus[1]), until: this.time + 90, freeAt: this.time + 30 });
  }

  giveXp(p: Player, n: number, from: string) {
    if (p.level >= MAX_LEVEL || n <= 0) return;
    const before = p.level;
    p.xp += n;
    p.msg(`+${n} XP (${from})`, 'g');
    while (p.level < MAX_LEVEL && p.xp >= xpNext(p.level)) {
      p.xp -= xpNext(p.level);
      p.level++;
      p.refreshStats();
      p.hp = p.stats.mhp; p.sh = p.stats.msh; p.mp = p.stats.mmp;
      this.maps.get(p.mapId)?.events.push({ e: 'levelup', id: p.id, level: p.level });
      p.msg(`Niveau ${p.level} ! Tes PV, ton bouclier, ton mana et tes dégâts augmentent.`, 'g');
      const sp = SPELLS.find(s => s.level === p.level);
      if (sp) p.msg(`Nouveau sort : ${sp.name}.`, 'g');
      p.msg('+1 point de sort : ouvre le grimoire avec K pour améliorer un sort.', 's');
    }
    if (p.level !== before) this.save(p);
  }

  private give(p: Player, item: string, n: number) {
    p.inv[item] = (p.inv[item] ?? 0) + n;
    p.priv.push({ e: 'loot', item, n });
  }

  // ------------------------------------------------------------------ sorts
  private cast(p: Player, m: MapInstance, id: SpellId, mx: number, mz: number) {
    const sp = SPELLS.find(s => s.id === id);
    if (!sp || p.dead) return;
    const t = this.time;
    if (p.level < sp.level) return p.msg(`${sp.name} se débloque au niveau ${sp.level}.`, 'w');
    if ((p.cds[id] ?? 0) > t) return;
    const fx = spellFx(id, rankOf(p.ranks, id));
    if (p.mp < fx.mana) return p.msg('Pas assez de mana.', 'w');
    const tg = p.target != null ? m.mobs.find(o => o.id === p.target && o.state !== 'dead') : undefined;
    let dx = mx, dz = mz;
    if (!dx && !dz) { if (tg) { dx = tg.x - p.x; dz = tg.z - p.z; } else { dx = Math.sin(p.f); dz = Math.cos(p.f); } }
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;

    switch (id) {
      case 'tir':
      case 'marque': {
        if (!tg) return p.msg('Il faut une cible (Tab).', 'w');
        if (dist(p, tg) > sp.range) return p.msg('Cible trop loin.', 'w');
        p.f = Math.atan2(tg.x - p.x, tg.z - p.z);
        m.events.push({ e: 'shot', from: p.id, to: tg.id, spell: id });
        if (id === 'tir') m.pending.push({ at: t + dist(p, tg) / 22, run: () => this.hitMob(p, m, tg, fx.mult) });
        else { tg.markUntil = t + fx.markDur; tg.markBonus = fx.mark; if (tg.state === 'idle') this.aggro(m, tg, p.id); }
        break;
      }
      case 'percante': {
        if (tg && !mx && !mz) { dx = tg.x - p.x; dz = tg.z - p.z; const k = Math.hypot(dx, dz) || 1; dx /= k; dz /= k; }
        const ex = p.x + dx * sp.range, ez = p.z + dz * sp.range;
        p.f = Math.atan2(dx, dz);
        m.events.push({ e: 'shot', from: p.id, to: 0, spell: id, tx: r2(ex), tz: r2(ez) });
        for (const o of m.mobs) {
          if (o.state === 'dead') continue;
          const px = o.x - p.x, pz = o.z - p.z, along = px * dx + pz * dz;
          if (along < 0 || along > sp.range) continue;
          if (Math.abs(px * dz - pz * dx) < 0.55 + o.def.radius) m.pending.push({ at: t + along / 24, run: () => this.hitMob(p, m, o, fx.mult) });
        }
        break;
      }
      case 'pluie': {
        const cx = tg && dist(p, tg) <= sp.range ? tg.x : p.x + dx * 4, cz = tg && dist(p, tg) <= sp.range ? tg.z : p.z + dz * 4;
        m.events.push({ e: 'aoe', x: r2(cx), z: r2(cz), r: r2(fx.radius), kind: 'pluie' });
        [0.35, 0.85, 1.35].forEach(w => m.pending.push({
          at: t + w, run: () => { for (const o of m.mobs) if (o.state !== 'dead' && Math.hypot(o.x - cx, o.z - cz) < fx.radius + o.def.radius) this.hitMob(p, m, o, fx.mult); },
        }));
        break;
      }
      case 'piege': {
        const tr = { id: this.newId(), owner: p.id, x: r2(p.x), z: r2(p.z), armAt: t + 0.5, until: t + 20, root: fx.root, mult: fx.mult };
        m.traps.push(tr);
        m.events.push({ e: 'trap', id: tr.id, x: tr.x, z: tr.z, on: true });
        break;
      }
      case 'vent': {
        const x0 = p.x, z0 = p.z;
        const r = moveWithCollision(m.data, p.x, p.z, dx * fx.dash, dz * fx.dash);
        p.x = r.x; p.z = r.z; p.f = Math.atan2(dx, dz);
        m.events.push({ e: 'dash', id: p.id, x0: r2(x0), z0: r2(z0), x1: r2(p.x), z1: r2(p.z) });
        break;
      }
    }
    p.mp -= fx.mana;
    p.cds[id] = t + fx.cd;
    p.lastAtk = t;
    if (p.harvesting) p.harvesting = null;
  }

  private usePotion(p: Player, item: 'potPV' | 'potMP') {
    if (p.dead || (p.inv[item] ?? 0) <= 0 || (p.cds[item] ?? 0) > this.time) return;
    p.inv[item]--;
    if (!p.inv[item]) delete p.inv[item];
    p.cds[item] = this.time + 10;
    const m = this.maps.get(p.mapId)!;
    if (item === 'potPV') {
      const n = Math.round(p.stats.mhp * 0.4);
      p.hp = Math.min(p.stats.mhp, p.hp + n);
      m.events.push({ e: 'dmg', id: p.id, n, heal: true });
    } else p.mp = Math.min(p.stats.mmp, p.mp + p.stats.mmp * 0.4);
  }

  // ------------------------------------------------------------------ atelier
  private craft(p: Player, id: string) {
    const rc = RECIPES.find(r => r.id === id);
    if (!rc) return;
    if (p.level < rc.level) return p.msg(`Recette disponible au niveau ${rc.level}.`, 'w');
    for (const [k, q] of Object.entries(rc.needs)) if ((p.inv[k] ?? 0) < q) return p.msg(`Il manque ${q - (p.inv[k] ?? 0)} × ${ITEMS[k].name}.`, 'w');
    if (p.ecus < rc.cost) return p.msg('Pas assez d’écus.', 'w');
    for (const [k, q] of Object.entries(rc.needs)) { p.inv[k] -= q; if (!p.inv[k]) delete p.inv[k]; }
    p.ecus -= rc.cost;
    this.give(p, rc.out, rc.qty);
    p.msg(`Fabriqué : ${ITEMS[rc.out].name}.`, 'g');
    const def = ITEMS[rc.out];
    if (def.slot && !p.equip[def.slot]) this.equip(p, rc.out);
    this.save(p);
  }

  private equip(p: Player, id: string) {
    const def = ITEMS[id];
    if (!def?.slot || !(p.inv[id] > 0)) return;
    const old = p.equip[def.slot];
    p.inv[id]--; if (!p.inv[id]) delete p.inv[id];
    if (old) p.inv[old] = (p.inv[old] ?? 0) + 1;
    p.equip[def.slot] = id;
    p.refreshStats();
    p.msg(`Équipé : ${def.name}.`, 's');
  }

  private unequip(p: Player, slot: Slot) {
    const id = p.equip[slot];
    if (!id) return;
    delete p.equip[slot];
    p.inv[id] = (p.inv[id] ?? 0) + 1;
    p.refreshStats();
    p.msg(`Retiré : ${ITEMS[id].name}.`, 's');
  }

  // ------------------------------------------------------------------ grimoire
  private upgrade(p: Player, id: SpellId) {
    const sp = SPELLS.find(s => s.id === id);
    if (!sp) return;
    const r = rankOf(p.ranks, id);
    if (p.level < sp.level) return p.msg(`${sp.name} se débloque au niveau ${sp.level}.`, 'w');
    if (r >= MAX_RANK) return p.msg(`${sp.name} est déjà au rang maximum.`, 'w');
    if (pointsLeft(p.level, p.ranks) <= 0) return p.msg('Plus de point de sort : monte de niveau pour en gagner.', 'w');
    if (p.level < rankLevel(id, r + 1)) return p.msg(`Le rang ${r + 1} de ${sp.name} demande le niveau ${rankLevel(id, r + 1)}.`, 'w');
    p.ranks[id] = r + 1;
    p.msg(`${sp.name} passe au rang ${r + 1}.`, 'g');
    this.save(p);
  }

  private resetSpells(p: Player) {
    if (!Object.keys(p.ranks).length) return;
    p.ranks = {};
    p.msg(`Points de sort rendus : ${pointsLeft(p.level, p.ranks)} à répartir.`, 's');
    this.save(p);
  }

  // ------------------------------------------------------------------ diffusion
  private broadcast(m: MapInstance) {
    const t = this.time;
    if (!m.players.size) { m.events.length = 0; return; }
    const ents: EntSnap[] = [];
    for (const p of m.players) ents.push({
      id: p.id, k: 'p', x: r2(p.x), z: r2(p.z), s: p.race, name: p.name, lv: p.level,
      hp: Math.round(p.hp), mhp: p.stats.mhp, f: r2(p.f), fl: (p.dead ? 1 : 0) | (t - p.lastAtk < 4 ? 8 : 0), tg: p.target ?? undefined, eq: p.equip,
    });
    for (const o of m.mobs) if (o.state !== 'dead') ents.push({
      id: o.id, k: 'm', x: r2(o.x), z: r2(o.z), s: o.kind, lv: o.def.level, hp: Math.round(o.hp), mhp: o.def.hp, f: r2(o.f),
      fl: (o.rootUntil > t ? 2 : 0) | (o.markUntil > t ? 4 : 0) | (o.state === 'chase' ? 8 : 0), tg: o.target ?? undefined,
    });
    for (const l of m.loots) ents.push({ id: l.id, k: 'l', x: l.x, z: l.z });
    for (const n of m.nodes) ents.push({ id: n.id, k: 'n', x: n.x, z: n.z, s: n.kind, fl: n.until > t ? 16 : 0 });
    const ev = m.events;
    m.events = [];
    for (const p of m.players) {
      p.client.send({ t: 'snap', tick: this.tickN, ack: p.lastSeq, ents });
      const mine = p.priv.length ? ev.concat(p.priv) : ev;
      p.priv = [];
      if (mine.length) p.client.send({ t: 'ev', ev: mine });
      p.client.send({ t: 'self', s: this.selfState(p) });
    }
  }

  selfState(p: Player): SelfState {
    const t = this.time;
    const cds: SelfState['cds'] = {};
    for (const [k, v] of Object.entries(p.cds)) if (v! > t) cds[k as Cd] = r2(v! - t);
    return {
      id: p.id, name: p.name, race: p.race, level: p.level, xp: p.xp, xpNext: xpNext(p.level),
      hp: Math.round(p.hp), mhp: p.stats.mhp, sh: Math.round(p.sh), msh: p.stats.msh, mp: Math.round(p.mp), mmp: p.stats.mmp,
      ecus: p.ecus, dmg: p.stats.dmg, crit: p.stats.crit, speed: p.stats.speed, cds, inv: { ...p.inv }, equip: { ...p.equip },
      ranks: { ...p.ranks }, points: pointsLeft(p.level, p.ranks),
      target: p.target, harvesting: p.harvesting && { ...p.harvesting, t: r2(p.harvesting.t) }, dead: p.dead ? r2(Math.max(0, p.dead - t)) : 0,
    };
  }
}
