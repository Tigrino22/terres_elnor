// Point d'entrée du navigateur : écran d'accueil, boucle de jeu, prédiction locale.

import './style.css';
import * as THREE from 'three';
import { ITEMS, MAPS, MOBS, NODES, SPELLS, SpellId } from '../shared/data';
import { generateMap, moveWithCollision, MapData } from '../shared/mapgen';
import { DT } from '../shared/stats';
import type { EntSnap, GameEvent, Race, SelfState, ServerMsg } from '../shared/protocol';
import { World3D } from './world3d';
import { Hud } from './hud';
import { connectWs, localGame, Transport } from './net';
import { MOB_ART, NODE_ART, SPELL_ART, playerModel, trapModel } from './assets';

const canvas = document.getElementById('view') as HTMLCanvasElement;
const world = new World3D(canvas);
const coords = (c: [number, number]) => `(${c[0]}, ${c[1]})`.replace('-', '−');

let net: Transport | null = null;
let selfId = 0;
let self: SelfState | null = null;
let map: MapData | null = null;
let ents: EntSnap[] = [];
let pred = { x: 0, z: 0 }, prev = { x: 0, z: 0 };
let pending: { seq: number; mx: number; mz: number }[] = [];
let seq = 0, acc = 0;
let facing = 0;
let lootAt = 0, lootStack = 0;
const traps = new Map<number, THREE.Object3D>();
const keys = new Set<string>();

const hud = new Hud({
  cast: id => castSpell(id),
  use: item => { net?.send({ t: 'use', item }); hud.flashSlot(item); },
  craft: recipe => net?.send({ t: 'craft', recipe }),
  equip: item => net?.send({ t: 'equip', item }),
  unequip: slot => net?.send({ t: 'unequip', slot }),
  upgrade: spell => net?.send({ t: 'upgrade', spell }),
  resetSpells: () => net?.send({ t: 'resetSpells' }),
  chat: text => net?.send({ t: 'chat', text }),
  ami: (name, add) => net?.send({ t: 'ami', name, add }),
});

// ------------------------------------------------------------------ entrées
function moveInput(): [number, number] {
  if (hud.chatFocused || !self || self.dead) return [0, 0];
  let h = 0, v = 0;
  if (keys.has('z') || keys.has('w') || keys.has('arrowup')) v += 1;
  if (keys.has('s') || keys.has('arrowdown')) v -= 1;
  if (keys.has('d') || keys.has('arrowright')) h += 1;
  if (keys.has('q') || keys.has('a') || keys.has('arrowleft')) h -= 1;
  if (!h && !v) return [0, 0];
  // haut de l'écran = (-1, -1) dans le monde, droite = (1, -1)
  let mx = (h - v) * Math.SQRT1_2, mz = (-h - v) * Math.SQRT1_2;
  const l = Math.hypot(mx, mz); mx /= l; mz /= l;
  return [mx, mz];
}

function castSpell(id: SpellId) {
  if (!net || !self) return;
  const [mx, mz] = moveInput();
  net.send({ t: 'cast', spell: id, mx, mz });
  hud.flashSlot(id);
}

function cycleTarget() {
  if (!self) return;
  const mobs = ents.filter(e => e.k === 'm').map(e => ({ e, d: Math.hypot(e.x - pred.x, e.z - pred.z) })).filter(o => o.d < 14).sort((a, b) => a.d - b.d);
  if (!mobs.length) return;
  const k = mobs.findIndex(o => o.e.id === self!.target);
  const next = mobs[(k + 1) % mobs.length].e;
  net?.send({ t: 'target', id: next.id });
}

function harvestNearest() {
  const n = ents.filter(e => e.k === 'n' && !((e.fl ?? 0) & 16)).map(e => ({ e, d: Math.hypot(e.x - pred.x, e.z - pred.z) })).sort((a, b) => a.d - b.d)[0];
  if (!n) return;
  if (n.d > 1.9) { hud.say('Approche-toi d’une ressource pour la récolter.', 'w'); return; }
  net?.send({ t: 'harvest', id: n.e.id });
}

addEventListener('keydown', e => {
  if (!net || hud.chatFocused) return;
  const k = e.key.toLowerCase();
  if (e.key === 'Tab') { e.preventDefault(); cycleTarget(); return; }
  if (e.key === 'Enter') { e.preventDefault(); hud.focusChat(); return; }
  if (e.key === 'Escape') { if (hud.anyWindow()) hud.closeWindows(); else net.send({ t: 'target', id: null }); return; }
  const digit = /^(Digit|Numpad)([1-9])$/.exec(e.code);
  if (digit) {
    const n = Number(digit[2]);
    if (n <= SPELLS.length) castSpell(SPELLS[n - 1].id);
    else if (n === 7) hud['act'].use('potPV');
    else if (n === 8) hud['act'].use('potMP');
    return;
  }
  if (e.code === 'Space') { e.preventDefault(); castSpell('vent'); return; }
  if (k === 'e') harvestNearest();
  else if (k === 'c') hud.toggleEquip();
  else if (k === 'k') hud.toggleSpells();
  else if (k === 'i') hud.toggleInv('sac');
  else if (k === 'f') hud.toggleInv('atelier');
  else if (k === 'm') hud.toggleMap();
  else if (k === 'o') hud.toggleAmis();
  else if (k === 'h') hud.toggle('#help');
  keys.add(k);
  if (k.startsWith('arrow')) e.preventDefault();
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
addEventListener('resize', () => world.resize());

canvas.addEventListener('mousedown', e => {
  if (!net) return;
  canvas.focus();
  const v = world.pick(e.clientX, e.clientY, ['m', 'n']);
  if (!v) return;
  if (v.k === 'm') net.send({ t: 'target', id: v.id });
  else if (v.k === 'n') {
    if (Math.hypot(v.x - pred.x, v.z - pred.z) > 1.9) hud.say('Approche-toi pour récolter.', 'w');
    else net.send({ t: 'harvest', id: v.id });
  }
});
canvas.addEventListener('mousemove', e => { canvas.style.cursor = net && world.pick(e.clientX, e.clientY, ['m', 'n']) ? 'pointer' : 'default'; });

// ------------------------------------------------------------------ messages du serveur
function onMessage(m: ServerMsg) {
  switch (m.t) {
    case 'auth':
      if (m.ok) net = conn;
      authWait?.(m); authWait = null;
      break;
    case 'kicked': net = null; lost('Session fermée', m.reason); break;
    case 'welcome': selfId = m.you; world.selfId = m.you; break;
    case 'map': enterMap(m.map, m.x, m.z); break;
    case 'snap': {
      ents = m.ents;
      const me = ents.find(e => e.id === selfId);
      if (me && map) {
        // réconciliation : position du serveur + entrées pas encore traitées
        pending = pending.filter(p => p.seq > m.ack);
        let x = me.x, z = me.z;
        const sp = (self?.speed ?? 4.2) * DT;
        for (const p of pending) { const r = moveWithCollision(map, x, z, p.mx * sp, p.mz * sp); x = r.x; z = r.z; }
        if (Math.hypot(x - pred.x, z - pred.z) > 2.5) prev = { x, z };
        pred = { x, z };
      }
      world.sync(ents, pred);
      break;
    }
    case 'self': {
      const lvl = self?.level;
      if (!self || JSON.stringify(self.equip) !== JSON.stringify(m.s.equip)) renderPortraits(m.s);
      self = m.s;
      world.targetId = m.s.target;
      hud.updateSelf(m.s);
      if (lvl && m.s.level > lvl) hud.banner(`Niveau ${m.s.level}`, 'PV, bouclier, mana et dégâts augmentent · +1 point de sort (K)');
      break;
    }
    case 'ev': m.ev.forEach(onEvent); break;
    case 'chat': hud.chatLine(m.from, m.text); break;
    case 'social': hud.setSocial(m.online, m.amis); break;
  }
}

function enterMap(id: string, x: number, z: number) {
  const first = !map;
  hud.fade(true);
  setTimeout(() => {
    map = generateMap(MAPS[id]);
    world.loadMap(map);
    traps.forEach(t => world.scene.remove(t)); traps.clear();
    pred = { x, z }; prev = { x, z }; pending = [];
    world.snapCamera(x, z);
    hud.setMap(map);
    hud.here = map.def.coords;
    hud.fade(false);
    hud.banner(map.def.name, `Carte ${coords(map.def.coords)} · ${map.def.zone} · niv. ${map.def.levels}`);
  }, first ? 0 : 220);
}

function screenOf(id: number, y = 1.6) {
  const p = world.posOf(id, y); if (!p) return null;
  return world.project(p.x, p.y, p.z);
}

function onEvent(ev: GameEvent) {
  switch (ev.e) {
    case 'shot': {
      const from = world.posOf(ev.from, 0.95);
      if (!from) return;
      const to = ev.tx !== undefined ? new THREE.Vector3(ev.tx, 0.7, ev.tz) : world.posOf(ev.to, 0.55);
      if (!to) return;
      const shot = ev.spell ? SPELL_ART[ev.spell].shot : undefined;
      if (shot) world.arrow(from, to, shot.speed, shot.color, shot.big); else world.arrow(from, to);
      if (ev.from === selfId) facing = Math.atan2(to.x - from.x, to.z - from.z);
      break;
    }
    case 'dmg': {
      ev.n = Math.round(ev.n);
      const v = world.views.get(ev.id);
      const p = screenOf(ev.id); if (!p) return;
      if (v && !ev.heal) v.hit = 1;
      const isPlayer = v?.k === 'p';
      if (ev.heal) hud.floatText(p.x, p.y, `+${ev.n}`, '#8af27a', 22);
      else if (ev.shield) hud.floatText(p.x, p.y, `−${ev.n}`, '#cfe0ff', 18);
      else if (isPlayer) hud.floatText(p.x, p.y, `−${ev.n}`, '#ff6a5a', ev.id === selfId ? 24 : 18);
      else hud.floatText(p.x, p.y, ev.crit ? `${ev.n} !` : String(ev.n), ev.crit ? '#ffd23a' : '#ffffff', ev.crit ? 32 : 22);
      if (isPlayer && !ev.heal) for (const o of world.views.values()) if (o.k === 'm' && o.snap.tg === ev.id && Math.hypot(o.x - v!.x, o.z - v!.z) < 2.2) o.lunge = 1;
      break;
    }
    case 'die': {
      const v = world.views.get(ev.id);
      if (v && v.k === 'm') v.dying = 0.001;
      break;
    }
    case 'tele': world.telegraph(ev.x, ev.z, ev.r, ev.dur); break;
    case 'aoe':
      if (ev.kind === 'pluie') world.rain(ev.x, ev.z, ev.r, SPELL_ART.pluie.ground!);
      else if (ev.kind === 'piege') world.ringFx(ev.x, ev.z, ev.r, SPELL_ART.piege.ground!, 0.8);
      else { world.ringFx(ev.x, ev.z, ev.r, 0xc8905a, 0.7); world.ringFx(ev.x, ev.z, ev.r * 0.6, 0xff6a3a, 0.5); }
      break;
    case 'trap': {
      if (ev.on) { const t = trapModel(); t.position.set(ev.x, world.heightAt(ev.x, ev.z), ev.z); world.scene.add(t); traps.set(ev.id, t); }
      else { const t = traps.get(ev.id); if (t) world.scene.remove(t); traps.delete(ev.id); }
      break;
    }
    case 'dash': world.dash(ev.x0, ev.z0, ev.x1, ev.z1, world.views.get(ev.id)?.k === 'm' ? 0xc8905a : SPELL_ART.vent.ground); break;
    case 'levelup': world.levelUp(ev.id); break;
    case 'loot': {
      const name = ev.item === 'ecus' ? 'écus' : ITEMS[ev.item]?.name ?? ev.item;
      hud.say(`Tu obtiens ${ev.n} × ${name}.`, 'g');
      const p = screenOf(selfId, 1.9);
      const now = performance.now();
      lootStack = now - lootAt < 600 ? lootStack + 1 : 0; lootAt = now;
      if (p) setTimeout(() => hud.floatText(p.x, p.y - 20, `+${ev.n} ${name}`, '#f2c96a', 15), lootStack * 220);
      break;
    }
    case 'msg': hud.say(ev.text, ev.c ?? 'n'); break;
  }
}

// ------------------------------------------------------------------ boucle
function step() {
  if (!net || !map || !self) return;
  const [mx, mz] = moveInput();
  if (!mx && !mz) return;
  seq++;
  pending.push({ seq, mx, mz });
  const sp = self.speed * DT;
  const r = moveWithCollision(map, pred.x, pred.z, mx * sp, mz * sp);
  pred = r;
  facing = Math.atan2(mx, mz);
  net.send({ t: 'input', seq, mx, mz });
}

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.25, (now - last) / 1000); last = now;
  acc += dt;
  while (acc >= DT) { prev = { ...pred }; step(); acc -= DT; }
  if (map && net) {
    const a = acc / DT;
    const sx = prev.x + (pred.x - prev.x) * a, sz = prev.z + (pred.z - prev.z) * a;
    const me = world.views.get(selfId);
    if (me) { me.tx = sx; me.tz = sz; }
    world.setSelfFacing(facing);
    world.frame(dt, sx, sz);
    drawLabels();
    hud.drawMinimap(map, { x: sx, z: sz }, ents, selfId);
    const tg = self?.target != null ? ents.find(e => e.id === self!.target) ?? null : null;
    hud.updateTarget(tg);
  } else world.frame(dt, preview.spawn.x + Math.sin(now / 5000) * 3, preview.spawn.z + Math.cos(now / 6000) * 3);
  requestAnimationFrame(frame);
}

function drawLabels() {
  hud.beginLabels();
  const me = world.views.get(selfId);
  for (const v of world.views.values()) {
    if (v.dying) continue;
    const e = v.snap, h = world.heightAt(v.x, v.z);
    if (v.k === 'm') {
      if (me && Math.hypot(v.x - me.x, v.z - me.z) > 9 && self?.target !== e.id) continue;
      const d = MOBS[e.s!];
      const p = world.project(v.x, h + (MOB_ART[e.s!]?.labelY ?? 1.05), v.z); if (!p.on) continue;
      const col = d.special ? '#ff6a4a' : d.aggro ? '#ff9a86' : '#f2d27a';
      const fx = [(e.fl ?? 0) & 2 ? 'immobilisé' : '', (e.fl ?? 0) & 4 ? 'marqué' : ''].filter(Boolean).join(' · ');
      const showBar = (e.hp ?? 0) < (e.mhp ?? 0) || self?.target === e.id;
      hud.label('e' + e.id, p.x, p.y, `<div class="n" style="color:${col}">${d.name}<small>niv. ${d.level}</small></div>${showBar ? `<div class="mini"><i style="width:${((e.hp ?? 0) / (e.mhp ?? 1)) * 100}%"></i></div>` : ''}${fx ? `<div class="fx">${fx}</div>` : ''}`);
    } else if (v.k === 'p') {
      const p = world.project(v.x, h + 1.45, v.z); if (!p.on) continue;
      const mine = e.id === selfId;
      hud.label('e' + e.id, p.x, p.y, `<div class="n" style="color:${mine ? '#b9f09a' : '#8ac8ff'}">${e.name}<small>niv. ${e.lv}</small></div>${mine ? '' : `<div class="mini g"><i style="width:${((e.hp ?? 0) / (e.mhp ?? 1)) * 100}%"></i></div>`}`);
    } else if (v.k === 'n' && me) {
      const d = Math.hypot(v.x - me.x, v.z - me.z);
      if (d > 3.2) continue;
      const p = world.project(v.x, h + NODE_ART[e.s as keyof typeof NODES].labelY, v.z);
      const name = NODES[e.s as keyof typeof NODES].name;
      const gone = (e.fl ?? 0) & 16;
      hud.label('e' + e.id, p.x, p.y, gone ? `${name} · repousse…` : d <= 1.9 ? `${name} · <kbd>E</kbd> récolter` : name, 'lab node');
    }
  }
  world.portals.forEach((pt, k) => {
    const p = world.project(pt.x, 3.0, pt.z); if (!p.on) return;
    hud.label('portal' + k, p.x, p.y, pt.open ? `➜ ${pt.label}` : pt.label, 'lab portal' + (pt.open ? '' : ' off'));
  });
  if (world.caveAt && map?.def.cave) {
    const p = world.project(world.caveAt.x, world.caveAt.y, world.caveAt.z);
    if (p.on) hud.label('cave', p.x, p.y, map.def.cave.label, 'lab cave');
  }
  hud.endLabels();
}

// ------------------------------------------------------------------ portrait et silhouette
/** Rend le modèle du personnage hors écran (portrait du cadre, silhouette de l'équipement). */
function renderModel(race: Race, equip: SelfState['equip'], w: number, h: number, fov: number, eye: [number, number, number], look: number) {
  const rt = new THREE.WebGLRenderTarget(w, h, { samples: 4 });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xd8ecff, 0x4a3d24, 1.4));
  const sun = new THREE.DirectionalLight(0xffe8c4, 2.4); sun.position.set(-1, 2, 2); sc.add(sun);
  const m = playerModel(race, equip); m.rotation.y = 0.35; sc.add(m);
  const cam = new THREE.PerspectiveCamera(fov, w / h, 0.1, 20); cam.position.set(...eye); cam.lookAt(0, look, 0);
  const clear = world.renderer.getClearAlpha();
  world.renderer.setClearAlpha(0);
  world.renderer.setRenderTarget(rt); world.renderer.clear(); world.renderer.render(sc, cam); world.renderer.setRenderTarget(null);
  world.renderer.setClearAlpha(clear);
  const px = new Uint8Array(w * h * 4);
  world.renderer.readRenderTargetPixels(rt, 0, 0, w, h, px);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d')!, img = c.createImageData(w, h);
  for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
  c.putImageData(img, 0, 0);
  rt.dispose();
  return cv;
}

function renderPortraits(s: SelfState) {
  hud.setPortrait(renderModel(s.race, s.equip, 96, 96, 26, [0, 1.12, 0.95], 1.02));
  hud.setDoll(renderModel(s.race, s.equip, 150, 300, 30, [0, 0.75, 3.1], 0.66));
}

// ------------------------------------------------------------------ connexion
const LAST = 'elnor.dernierCompte';
let conn: Transport | null = null;
let authWait: ((r: { ok: boolean; error?: string }) => void) | null = null;

function lost(title: string, text: string) {
  if (document.getElementById('lost')) return;
  document.body.insertAdjacentHTML('beforeend', `<div id="lost"><div class="box panel"><h2>${title}</h2><p>${text}</p><div class="btn" id="relog">Revenir à la connexion</div></div></div>`);
  document.getElementById('relog')!.addEventListener('click', () => location.reload());
}

async function login() {
  let last = '';
  try { last = localStorage.getItem(LAST) ?? ''; } catch { /* stockage indisponible */ }
  document.body.insertAdjacentHTML('beforeend', `<div id="login" class="${last ? '' : 'register'}"><div class="box panel">
    <h1>Terres d'Elnor</h1><div class="s">Prototype jouable · V1 PvM</div>
    <div class="tabs2 lt"><span class="tab ${last ? 'on' : ''}" data-m="login">Se connecter</span><span class="tab ${last ? '' : 'on'}" data-m="register">Créer un personnage</span></div>
    <form autocomplete="on" onsubmit="return false">
    <label>Identifiant du compte</label><input id="lacc" maxlength="20" autocomplete="username" placeholder="lyrael" value="${last.replace(/[^a-z0-9_.-]/g, '')}">
    <label>Mot de passe</label><input id="lpass" type="password" maxlength="72" autocomplete="current-password" placeholder="6 caractères au minimum">
    <div class="reg">
      <label>Nom du personnage</label><input id="lname" maxlength="16" placeholder="Lyraël">
      <label>Peuple</label><div class="races">
        <div class="race on" data-r="elfe"><b>Elfe de Sylvaë</b>Archère des forêts</div>
        <div class="race" data-r="humain"><b>Humain d’Aldmar</b>Rôdeur des plaines</div></div>
      <label>Voie</label><div class="races"><div class="race on" style="cursor:default"><b>Voie de l’Arc</b>Tir à distance, pièges</div><div class="race" style="opacity:.45;cursor:default"><b>Lame et Arcane</b>Prochain jalon</div></div>
    </div>
    <button class="btn" id="play" type="submit" style="margin-top:18px;width:100%">Entrer dans le monde</button></form>
    <div class="st"></div><div class="mode">Recherche du serveur…</div></div></div>`);
  const box = document.getElementById('login')!;
  const $l = <E extends HTMLElement>(sel: string) => box.querySelector(sel) as E;
  let mode: 'login' | 'register' = last ? 'login' : 'register';
  let race: Race = 'elfe';
  const play = $l<HTMLButtonElement>('#play'), st = $l<HTMLElement>('.st');
  const setMode = (m: typeof mode) => {
    mode = m;
    box.classList.toggle('register', m === 'register');
    box.querySelectorAll<HTMLElement>('.lt .tab').forEach(t => t.classList.toggle('on', t.dataset.m === m));
    $l<HTMLInputElement>('#lpass').autocomplete = m === 'login' ? 'current-password' : 'new-password';
    play.textContent = m === 'login' ? 'Entrer dans le monde' : 'Créer et entrer dans le monde';
    st.textContent = ''; st.classList.remove('err');
  };
  setMode(mode);
  box.querySelectorAll<HTMLElement>('.lt .tab').forEach(t => t.addEventListener('click', () => setMode(t.dataset.m as typeof mode)));
  box.querySelectorAll<HTMLElement>('.race[data-r]').forEach(r => r.addEventListener('click', () => {
    race = r.dataset.r as Race;
    box.querySelectorAll('.race[data-r]').forEach(o => o.classList.toggle('on', o === r));
  }));
  box.querySelectorAll('input').forEach(i => i.addEventListener('keydown', e => e.stopPropagation()));
  ($l<HTMLInputElement>(last ? '#lpass' : '#lacc')).focus();

  // on cherche le serveur tout de suite : le joueur sait où vit son personnage avant de s'inscrire
  const modeEl = $l<HTMLElement>('.mode');
  const ready = connectWs().catch(() => localGame()).then(t => {
    conn = t;
    t.onMessage = onMessage;
    t.onClose = reason => {
      if (authWait) { authWait({ ok: false, error: reason }); authWait = null; }
      if (net) lost('Connexion perdue', `${reason} Ta progression est sauvegardée.`);
    };
    modeEl.innerHTML = t.online
      ? '<b>Serveur en ligne</b> · personnage sauvegardé sur le serveur, les autres joueurs sont visibles'
      : 'Pas de serveur joignable : <b>mode solo</b>, personnage sauvegardé dans ce navigateur';
    return t;
  });

  const go = async () => {
    if (play.disabled) return;
    const account = $l<HTMLInputElement>('#lacc').value, password = $l<HTMLInputElement>('#lpass').value;
    play.disabled = true; st.classList.remove('err');
    st.textContent = mode === 'login' ? 'Connexion…' : 'Création du personnage…';
    const t = await ready;
    const res = await new Promise<{ ok: boolean; error?: string }>(resolve => {
      authWait = resolve;
      t.send(mode === 'login'
        ? { t: 'auth', mode, account, password }
        : { t: 'auth', mode, account, password, name: $l<HTMLInputElement>('#lname').value || '', race });
    });
    play.disabled = false;
    if (!res.ok) { st.textContent = res.error ?? 'Connexion refusée.'; st.classList.add('err'); return; }
    try { localStorage.setItem(LAST, account.trim().toLowerCase()); } catch { /* stockage indisponible */ }
    hud.say(t.online ? 'Connecté au serveur : les autres joueurs de la carte sont visibles.' : 'Mode solo : ton personnage est sauvegardé dans ce navigateur.', 's');
    box.remove();
    canvas.tabIndex = 0; canvas.focus();
  };
  play.addEventListener('click', go);
}

// décor d'accueil : la première carte en fond
const preview = generateMap(MAPS.route);
world.loadMap(preview);
world.snapCamera(preview.spawn.x, preview.spawn.z);
world.frame(0, preview.spawn.x, preview.spawn.z);
login();
requestAnimationFrame(frame);
(window as any).__elnor = { world, hud, get self() { return self; }, get ents() { return ents; }, get pred() { return pred; }, get map() { return map?.def.id; } };
