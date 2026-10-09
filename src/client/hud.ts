// Interface HTML par-dessus la vue 3D : cadres, barre de sorts, chat, minicarte,
// fenêtre personnage (sac + atelier), carte du monde et aide.

import { ITEMS, ItemDef, MOBS, RECIPES, SPELLS, SpellId, Slot } from '../shared/data';
import { MapData, T } from '../shared/mapgen';
import type { EntSnap, SelfState } from '../shared/protocol';
import { MAX_RANK, fxLines, rankLevel, rankOf, spellFx } from '../shared/ranks';
import { itemIcon, spellIcon, verrou } from './assets';
import { FenetreCarte } from './carte-monde/fenetre';

const $ = <E extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as E;
const nb = (n: number) => Math.round(n).toLocaleString('fr-FR');
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const RARITY: Record<string, string> = { commun: '', 'peu-commun': 'r1', rare: 'r2', epique: 'r3' };
const RNAME: Record<string, string> = { commun: 'Commun', 'peu-commun': 'Peu commun', rare: 'Rare', epique: 'Épique' };
const SLOTS: [Slot, string][] = [['arme', 'Arme'], ['tete', 'Tête'], ['torse', 'Torse'], ['pieds', 'Pieds']];
const BONUS: [keyof NonNullable<ItemDef['bonus']>, (n: number) => string][] = [
  ['dmg', n => `${n > 0 ? '+' : '−'}${Math.abs(n)} dégâts`], ['pv', n => `${n > 0 ? '+' : '−'}${Math.abs(n)} PV`],
  ['bouclier', n => `${n > 0 ? '+' : '−'}${Math.abs(n)} bouclier`], ['mana', n => `${n > 0 ? '+' : '−'}${Math.abs(n)} mana`],
  ['crit', n => `${n > 0 ? '+' : '−'}${Math.abs(n)} % critique`], ['vitesse', n => `${n > 0 ? '+' : '−'}${Math.abs(Math.round(n * 100))} % vitesse`],
];
const bonusText = (id?: string) => { const b = id ? ITEMS[id]?.bonus ?? {} : {}; return BONUS.filter(([k]) => b[k]).map(([k, f]) => f(b[k]!)).join(' · '); };
/** Ce que change un objet par rapport à celui déjà porté : vert si mieux, rouge si moins bien. */
const diffText = (id: string, cur?: string) => {
  const a = ITEMS[id]?.bonus ?? {}, b = cur ? ITEMS[cur]?.bonus ?? {} : {};
  return BONUS.map(([k, f]) => { const d = (a[k] ?? 0) - (b[k] ?? 0); return d ? `<span class="${d > 0 ? 'up' : 'down'}">${f(d)}</span>` : ''; }).filter(Boolean).join(' ');
};
const coords = (c: [number, number]) => `(${c[0]}, ${c[1]})`.replace('-', '−');

const MENU_ICONS: Record<string, string> = {
  sac: '<svg viewBox="0 0 24 24" fill="#e8d6a8"><path d="M8 6a4 4 0 0 1 8 0h3l1 16H4L5 6zm2 0h4a2 2 0 0 0-4 0z"/></svg>',
  forge: '<svg viewBox="0 0 24 24" fill="#e8d6a8"><path d="M3 9h13l5-3v4l-4 2v2H8l-2 4h12v2H4l3-6z"/></svg>',
  carte: '<svg viewBox="0 0 24 24" fill="#e8d6a8"><path d="M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2z" opacity=".9"/><path d="M9 3v16M15 5v16" stroke="#3a2c1c" stroke-width="1.4"/></svg>',
  equip: '<svg viewBox="0 0 24 24" fill="#e8d6a8"><path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5z"/><path d="M12 6v12M7 10h10" stroke="#3a2c1c" stroke-width="1.8"/></svg>',
  sorts: '<svg viewBox="0 0 24 24" fill="#e8d6a8"><path d="M4 4h7a2 2 0 0 1 2 2v15a2 2 0 0 0-2-2H4zM20 4h-5a2 2 0 0 0-2 2v15a2 2 0 0 1 2-2h5z"/><path d="M16.5 8l.8 1.7 1.7.3-1.3 1.2.4 1.8-1.6-.9-1.6.9.4-1.8-1.3-1.2 1.7-.3z" fill="#3a2c1c"/></svg>',
  aide: '<svg viewBox="0 0 24 24" fill="#e8d6a8"><circle cx="12" cy="12" r="10" opacity=".9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5V14" stroke="#3a2c1c" stroke-width="2" fill="none"/><circle cx="12" cy="17.5" r="1.2" fill="#3a2c1c"/></svg>',
};

export interface HudActions {
  cast(id: SpellId): void;
  use(item: 'potPV' | 'potMP'): void;
  craft(id: string): void;
  equip(id: string): void;
  unequip(slot: Slot): void;
  upgrade(id: SpellId): void;
  resetSpells(): void;
  chat(text: string): void;
}

export class Hud {
  ui = $('#ui');
  labels = $('#labels');
  self: SelfState | null = null;
  private labelPool = new Map<string, HTMLDivElement>();
  private usedLabels = new Set<string>();
  private mmBase: HTMLCanvasElement | null = null;
  private recipe = RECIPES[0].id;
  private tab: 'sac' | 'atelier' = 'sac';
  chatFocused = false;

  constructor(private act: HudActions) {
    const add = (html: string) => { this.ui.insertAdjacentHTML('beforeend', html); return this.ui.lastElementChild as HTMLElement; };
    add(`<div id="unit" class="panel"><div class="por"><canvas width="96" height="96"></canvas></div><div class="lvl">1</div>
      <div class="nm"></div><div class="sub"></div>
      <div class="bar hp"><i></i><b>PV</b><span></span></div>
      <div class="bar sh"><i></i><b>Bouclier</b><span></span></div>
      <div class="bar mp"><i></i><b>Mana</b><span></span></div></div>`);
    add(`<div id="target" class="panel"><div class="row"><span class="nm"></span><span class="lv"></span></div><div class="bar hp"><i></i><span></span></div><div class="tag"></div></div>`);
    add(`<div id="mm" class="panel"><div class="zone"></div><div class="co"></div><canvas width="196" height="196"></canvas></div>`);
    const slots = SPELLS.map((s, k) => `<div class="slot" data-spell="${s.id}"><span class="k">${k + 1}</span>${spellIcon(s.id)}<span class="c">${s.mana}</span><div class="cd"></div><div class="lk">niv. ${s.level}</div><span class="rk"></span>
      <div class="tt panel"></div></div>`).join('')
      + `<div class="slot" data-item="potPV"><span class="k">7</span>${itemIcon('potPV')}<span class="q"></span><div class="cd"></div><div class="tt panel"><b>Potion de soin</b><br>Rend 40 % des PV.</div></div>`
      + `<div class="slot" data-item="potMP"><span class="k">8</span>${itemIcon('potMP')}<span class="q"></span><div class="cd"></div><div class="tt panel"><b>Potion de mana</b><br>Rend 40 % du mana.</div></div>`
      + `<div class="slot"><span class="k">9</span>${verrou}<div class="tt panel"><b>Emplacement libre</b><br><span class="m">Prévu pour un sort de métier.</span></div></div>`;
    add(`<div id="bar" class="panel"><div class="xp"><i></i><span></span></div><div class="slots">${slots}</div>
      <div class="hint"><kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd> ou flèches · tir automatique · <kbd>Tab</kbd> cibler · <kbd>1</kbd>–<kbd>8</kbd> sorts et potions · <kbd>Espace</kbd> bond · <kbd>E</kbd> récolter</div></div>`);
    add(`<div id="chat" class="panel"><div class="tabs"><b>Général</b><span>Carte</span><span>Commerce</span><span>Groupe</span></div><div class="log"></div><input maxlength="160" placeholder="Entrée pour écrire…"></div>`);
    add(`<div id="gold" class="panel"><div class="coin"></div><span>0 écus</span></div>`);
    add(`<div id="menu" class="panel">${[['equip', 'Équip.', 'C'], ['sorts', 'Sorts', 'K'], ['sac', 'Sac', 'I'], ['forge', 'Atelier', 'F'], ['carte', 'Carte', 'M'], ['aide', 'Aide', 'H']].map(([k, l, key]) => `<div class="mb" data-menu="${k}"><kbd>${key}</kbd>${MENU_ICONS[k]}${l}${k === 'sorts' ? '<em class="pts"></em>' : ''}</div>`).join('')}</div>`);
    add(`<div id="cast" class="panel"><div class="lbl"></div><div class="bar"><i></i></div></div>`);
    document.body.insertAdjacentHTML('beforeend', `<div id="dead"><h2>Tu es tombé</h2><p></p></div><div id="banner"><h2></h2><p></p></div><div id="fade"></div>
      <div id="inv" class="win panel"><div class="hd"><span class="title">Personnage</span><div class="tabs2"><span class="tab on" data-tab="sac">Sac</span><span class="tab" data-tab="atelier">Atelier</span></div><span class="x">✕</span></div><div class="body"></div></div>
      <div id="equip" class="win panel"><div class="hd"><span class="title">Équipement</span><span class="x">✕</span></div><div class="body"></div></div>
      <div id="spells" class="win panel"><div class="hd"><span class="title">Grimoire · Voie de l’Arc</span><span class="pts"></span><span class="x">✕</span></div><div class="body"></div></div>
      <div id="wmap" class="win panel"></div>
      <div id="help" class="win panel"><div class="hd"><span class="title">Comment jouer</span><span class="x">✕</span></div><div class="body">
        <p><kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd> ou les flèches pour marcher (<kbd>W</kbd><kbd>A</kbd> marchent aussi).</p>
        <p>L’arc tire tout seul sur l’ennemi le plus proche à portée. <kbd>Tab</kbd> ou un clic change de cible.</p>
        <p><kbd>1</kbd> à <kbd>6</kbd> : sorts (débloqués avec les niveaux). <kbd>7</kbd> <kbd>8</kbd> : potions. <kbd>Espace</kbd> : Pas du vent.</p>
        <p>Le bouclier encaisse les coups en premier et se recharge après 4 s sans être touché.</p>
        <p>Ton personnage est sauvegardé automatiquement : tu reprends là où tu t’es arrêté à la prochaine connexion.</p>
        <p>Les arches lumineuses au bord de la carte sont des portails : marche dedans pour changer de carte.</p>
        <p><kbd>E</kbd> ou un clic près d’un frêne, d’un filon ou d’une fleur pour récolter. Le butin se ramasse en marchant dessus.</p>
        <p>Chaque niveau gagné donne un point de sort : <kbd>K</kbd> ouvre le grimoire pour monter tes sorts jusqu’au rang 5.</p>
        <p><kbd>C</kbd> équipement, <kbd>I</kbd> sac, <kbd>F</kbd> atelier, <kbd>M</kbd> carte du monde, <kbd>Entrée</kbd> chat.</p></div></div>
      <div class="itip panel"></div>`);

    this.ui.querySelectorAll<HTMLElement>('.slot').forEach(s => s.addEventListener('mousedown', e => {
      e.stopPropagation();
      if (s.dataset.spell) act.cast(s.dataset.spell as SpellId);
      if (s.dataset.item) act.use(s.dataset.item as 'potPV' | 'potMP');
    }));
    this.ui.querySelectorAll<HTMLElement>('.mb').forEach(b => b.addEventListener('mousedown', e => {
      e.stopPropagation();
      const k = b.dataset.menu;
      if (k === 'equip') this.toggleEquip(); else if (k === 'sorts') this.toggleSpells(); else if (k === 'sac') this.toggleInv('sac'); else if (k === 'forge') this.toggleInv('atelier'); else if (k === 'carte') this.toggleMap(); else this.toggle('#help');
    }));
    this.carte = new FenetreCarte($('#wmap'));
    document.querySelectorAll<HTMLElement>('.win .x').forEach(x => x.addEventListener('click', () => (x.closest('.win') as HTMLElement).style.display = 'none'));
    document.querySelectorAll<HTMLElement>('#inv .tab').forEach(t => t.addEventListener('click', () => { this.tab = t.dataset.tab as 'sac'; this.renderInv(); }));
    const input = $<HTMLInputElement>('#chat input');
    input.addEventListener('focus', () => this.chatFocused = true);
    input.addEventListener('blur', () => this.chatFocused = false);
    input.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') { if (input.value.trim()) act.chat(input.value); input.value = ''; input.blur(); }
      if (e.key === 'Escape') input.blur();
    });
  }

  // ------------------------------------------------------------------ chat
  log(html: string, cls = 'cn') {
    const log = $('#chat .log');
    const stick = log.scrollTop + log.clientHeight >= log.scrollHeight - 8;
    log.insertAdjacentHTML('beforeend', `<p class="${cls}">${html}</p>`);
    while (log.children.length > 80) log.firstElementChild!.remove();
    if (stick) log.scrollTop = log.scrollHeight;
  }
  say(text: string, cls = 'cn') { this.log(esc(text), 'c' + (cls.replace(/^c/, '') || 'n')); }
  chatLine(from: string, text: string) { this.log(from ? `<b>${esc(from)}</b> : ${esc(text)}` : `<i>${esc(text)}</i>`, from ? 'cp' : 'cs'); }
  focusChat() { $<HTMLInputElement>('#chat input').focus(); }

  // ------------------------------------------------------------------ état du joueur
  setPortrait(src: HTMLCanvasElement) { const c = $<HTMLCanvasElement>('#unit canvas'); c.getContext('2d')!.drawImage(src, 0, 0, 96, 96); }

  updateSelf(s: SelfState) {
    const prev = this.self;
    this.self = s;
    const u = $('#unit');
    $('.nm', u).textContent = s.name;
    $('.sub', u).textContent = `${s.race === 'elfe' ? 'Elfe de Sylvaë' : 'Humain d’Aldmar'} · Voie de l’Arc`;
    $('.lvl', u).textContent = String(s.level);
    const bar = (sel: string, v: number, m: number) => { const b = $(sel, u); $<HTMLElement>('i', b).style.width = `${(v / m) * 100}%`; $('span', b).textContent = `${nb(v)} / ${nb(m)}`; };
    bar('.hp', s.hp, s.mhp); bar('.sh', s.sh, s.msh); bar('.mp', s.mp, s.mmp);
    $<HTMLElement>('#bar .xp i').style.width = `${(s.xp / s.xpNext) * 100}%`;
    $('#bar .xp span').textContent = `Niveau ${s.level} · ${nb(s.xp)} / ${nb(s.xpNext)} XP`;
    $('#gold span').textContent = `${nb(s.ecus)} écus`;
    this.ui.querySelectorAll<HTMLElement>('.slot').forEach(sl => {
      const sp = SPELLS.find(x => x.id === sl.dataset.spell);
      const key = (sl.dataset.spell ?? sl.dataset.item) as keyof SelfState['cds'] | undefined;
      const cdEl = $<HTMLElement>('.cd', sl);
      if (!key || !cdEl) return;
      const left = s.cds[key] ?? 0;
      if (left > 0) {
        const total = sp ? sp.cd : 10;
        cdEl.style.display = 'flex';
        cdEl.style.background = `conic-gradient(rgba(0,0,0,0) 0 ${(1 - left / total) * 360}deg,rgba(0,0,0,.66) 0)`;
        cdEl.textContent = left >= 1 ? String(Math.ceil(left)) : left.toFixed(1).replace('.', ',');
      } else cdEl.style.display = 'none';
      if (sp) {
        const r = rankOf(s.ranks, sp.id), fx = spellFx(sp.id, r);
        $<HTMLElement>('.lk', sl).style.display = s.level < sp.level ? 'flex' : 'none';
        sl.classList.toggle('nomana', s.mp < fx.mana);
        const rk = $('.rk', sl), rt = s.level >= sp.level ? (r > 1 ? `R${r}` : '') : '';
        if (rk.textContent !== rt) rk.textContent = rt;
        const tt = `<b>${sp.name}</b> <span class="m">rang ${r} / ${MAX_RANK}</span><br>${sp.desc}<br>${fxLines(sp.id, r).join(' · ')}<br><span class="m">${fx.mana} mana · recharge ${String(fx.cd).replace('.', ',')} s${sp.range ? ` · portée ${String(sp.range).replace('.', ',')}` : ''}</span>`;
        const tte = $<HTMLElement>('.tt', sl);
        if (tte.dataset.h !== tt) { tte.innerHTML = tt; tte.dataset.h = tt; }
      } else {
        const q = s.inv[sl.dataset.item!] ?? 0;
        $('.q', sl).textContent = String(q);
        sl.classList.toggle('nomana', q === 0);
      }
    });
    // récolte en cours
    const cast = $<HTMLElement>('#cast');
    if (s.harvesting) {
      cast.style.display = 'block';
      $('.lbl', cast).textContent = 'Récolte…';
      $<HTMLElement>('i', cast).style.width = `${Math.min(100, (s.harvesting.t / s.harvesting.total) * 100)}%`;
    } else cast.style.display = 'none';
    const dead = $<HTMLElement>('#dead');
    dead.style.display = s.dead ? 'flex' : 'none';
    if (s.dead) $('p', dead).textContent = `Retour au centre de la carte dans ${Math.ceil(s.dead)} s.`;
    const pts = $<HTMLElement>('#menu .pts');
    pts.textContent = s.points ? String(s.points) : ''; pts.style.display = s.points ? 'flex' : 'none';
    const changed = !prev || JSON.stringify(prev.inv) !== JSON.stringify(s.inv) || JSON.stringify(prev.equip) !== JSON.stringify(s.equip) || prev.level !== s.level || prev.ecus !== s.ecus
      || JSON.stringify(prev.ranks) !== JSON.stringify(s.ranks) || prev.mhp !== s.mhp;
    if (changed && $<HTMLElement>('#inv').style.display === 'block') this.renderInv();
    if (changed && $<HTMLElement>('#equip').style.display === 'block') this.renderEquip();
    if (changed && $<HTMLElement>('#spells').style.display === 'block') this.renderSpells();
  }

  flashSlot(key: string) {
    const sl = this.ui.querySelector<HTMLElement>(`.slot[data-spell="${key}"],.slot[data-item="${key}"]`);
    if (!sl) return;
    sl.classList.add('flash'); setTimeout(() => sl.classList.remove('flash'), 180);
  }

  updateTarget(e: EntSnap | null) {
    const t = $<HTMLElement>('#target');
    if (!e || e.k !== 'm') { t.style.display = 'none'; return; }
    const d = MOBS[e.s!];
    t.style.display = 'block';
    const nm = $('.nm', t); nm.textContent = d.name; nm.classList.toggle('passif', !d.aggro);
    $('.lv', t).textContent = `niv. ${d.level}`;
    $<HTMLElement>('.bar i', t).style.width = `${((e.hp ?? 0) / (e.mhp ?? 1)) * 100}%`;
    $('.bar span', t).textContent = `${nb(e.hp ?? 0)} / ${nb(e.mhp ?? 0)}`;
    const tags = [];
    if (d.special) tags.push('Chef de meute · ruée annoncée au sol');
    else tags.push(d.aggro ? 'Agressif' : 'Passif tant qu’on ne l’attaque pas');
    if ((e.fl ?? 0) & 2) tags.push('immobilisé');
    if ((e.fl ?? 0) & 4) tags.push('marqué +25 %');
    $('.tag', t).textContent = tags.join(' · ');
  }

  // ------------------------------------------------------------------ minicarte
  setMap(m: MapData) {
    const d = m.def;
    $('#mm .zone').textContent = d.name;
    $('#mm .co').textContent = `carte ${coords(d.coords)} · niv. ${d.levels}`;
    const S = 6, cv = document.createElement('canvas');
    cv.width = cv.height = m.size * S;
    const c = cv.getContext('2d')!;
    const col: Record<number, string> = { [T.Herbe]: d.ground === 'foret' ? '#5d8a3a' : '#7a9e46', [T.Chemin]: '#b39465', [T.Eau]: '#3f86a8', [T.Falaise]: '#6e6656', [T.Sable]: '#b8a874' };
    for (let j = 0; j < m.size; j++) for (let i = 0; i < m.size; i++) { c.fillStyle = col[m.tile[j * m.size + i]]; c.fillRect(i * S, j * S, S, S); }
    for (const t of m.decor) if (t.kind === 'arbre' || t.kind === 'sapin') { c.fillStyle = t.kind === 'sapin' ? '#2a4a2a' : '#3a6326'; c.beginPath(); c.arc(t.x * S + S / 2, t.z * S + S / 2, S * 0.55, 0, 7); c.fill(); }
    this.mmBase = cv;
  }

  drawMinimap(m: MapData, me: { x: number; z: number }, ents: EntSnap[], selfId: number) {
    if (!this.mmBase) return;
    const cv = $<HTMLCanvasElement>('#mm canvas'), c = cv.getContext('2d')!;
    const S = 6, Z = 1.25, R = 98;
    c.clearRect(0, 0, 196, 196);
    c.fillStyle = '#1d2416'; c.fillRect(0, 0, 196, 196);
    c.save();
    c.translate(R, R); c.scale(Z, Z); c.rotate(Math.PI / 4);
    c.translate(-(me.x + 0.5) * S, -(me.z + 0.5) * S);
    c.drawImage(this.mmBase, 0, 0);
    const dot = (x: number, z: number, color: string, r: number) => { c.beginPath(); c.arc((x + 0.5) * S, (z + 0.5) * S, r, 0, 7); c.fillStyle = color; c.fill(); c.lineWidth = 1.2; c.strokeStyle = '#000'; c.stroke(); };
    for (const e of ents) {
      if (e.k === 'n') dot(e.x, e.z, (e.fl ?? 0) & 16 ? '#666' : e.s === 'lunaire' ? '#7fd0ff' : e.s === 'cuivre' ? '#ff9a50' : '#d8ff90', 2.4);
      else if (e.k === 'l') dot(e.x, e.z, '#ffd36a', 2.2);
      else if (e.k === 'm') dot(e.x, e.z, e.s === 'alpha' ? '#ff2a10' : MOBS[e.s!].aggro ? '#e8463a' : '#f2c84a', e.s === 'alpha' ? 4.5 : 3);
      else if (e.k === 'p' && e.id !== selfId) dot(e.x, e.z, '#5aa8ff', 3);
    }
    c.restore();
    // portails : toujours visibles, ramenés au bord quand ils sont loin
    for (const p of m.portals) {
      let dx = (p.i - me.x) * S, dz = (p.j - me.z) * S;
      let sx = (dx - dz) * Math.SQRT1_2 * Z, sy = (dx + dz) * Math.SQRT1_2 * Z;
      const l = Math.hypot(sx, sy), lim = R - 12;
      if (l > lim) { sx *= lim / l; sy *= lim / l; }
      c.save(); c.translate(R + sx, R + sy);
      c.fillStyle = p.to ? '#ffd36a' : '#9aa0aa'; c.strokeStyle = '#000'; c.lineWidth = 1.5;
      c.beginPath(); c.arc(0, 0, 6.5, 0, 7); c.fill(); c.stroke();
      c.rotate(Math.atan2(sy, sx));
      c.fillStyle = '#3a2410'; c.beginPath(); c.moveTo(4, 0); c.lineTo(-2, -3); c.lineTo(-2, 3); c.closePath(); c.fill();
      c.restore();
    }
    c.fillStyle = '#fff'; c.strokeStyle = '#2a7a1a'; c.lineWidth = 2;
    c.beginPath(); c.arc(R, R, 4.5, 0, 7); c.fill(); c.stroke();
  }

  // ------------------------------------------------------------------ étiquettes
  beginLabels() { this.usedLabels.clear(); }
  label(key: string, x: number, y: number, html: string, cls = 'lab') {
    let el = this.labelPool.get(key);
    if (!el) { el = document.createElement('div'); this.labels.appendChild(el); this.labelPool.set(key, el); el.dataset.h = ''; }
    if (el.className !== cls) el.className = cls;
    if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; }
    el.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-100%)`;
    el.style.display = '';
    this.usedLabels.add(key);
  }
  endLabels() { for (const [k, el] of this.labelPool) if (!this.usedLabels.has(k)) { el.remove(); this.labelPool.delete(k); } }

  floatText(x: number, y: number, text: string, color: string, size = 22) {
    const el = document.createElement('div');
    el.className = 'dmg'; el.textContent = text;
    el.style.color = color; el.style.fontSize = size + 'px';
    const dx = (Math.random() - 0.5) * 40;
    this.labels.appendChild(el);
    const t0 = performance.now();
    const step = () => {
      const k = (performance.now() - t0) / 1000;
      if (k > 1.1) { el.remove(); return; }
      const pop = k < 0.12 ? 1 + (0.12 - k) * 4 : 1;
      el.style.transform = `translate(${x + dx}px,${y - k * 55}px) translate(-50%,-50%) scale(${pop})`;
      el.style.opacity = String(k > 0.7 ? 1 - (k - 0.7) / 0.4 : 1);
      requestAnimationFrame(step);
    };
    step();
  }

  // ------------------------------------------------------------------ bannières
  banner(title: string, sub: string) {
    const b = $<HTMLElement>('#banner');
    $('h2', b).textContent = title; $('p', b).textContent = sub;
    b.style.opacity = '1';
    clearTimeout((b as any)._t);
    (b as any)._t = setTimeout(() => b.style.opacity = '0', 2600);
  }
  fade(on: boolean) { $<HTMLElement>('#fade').style.opacity = on ? '1' : '0'; }

  // ------------------------------------------------------------------ fenêtres
  anyWindow() { return [...document.querySelectorAll<HTMLElement>('.win')].some(w => w.style.display === 'block'); }
  closeWindows() { document.querySelectorAll<HTMLElement>('.win').forEach(w => w.style.display = 'none'); $<HTMLElement>('.itip').style.display = 'none'; }
  toggle(sel: string) { const w = $<HTMLElement>(sel); const on = w.style.display !== 'block'; this.closeWindows(); w.style.display = on ? 'block' : 'none'; return on; }
  toggleInv(tab: 'sac' | 'atelier') {
    const w = $<HTMLElement>('#inv');
    if (w.style.display === 'block' && this.tab === tab) { this.closeWindows(); return; }
    this.closeWindows(); this.tab = tab; w.style.display = 'block'; this.renderInv();
  }

  private renderInv() {
    const s = this.self; if (!s) return;
    document.querySelectorAll<HTMLElement>('#inv .tab').forEach(t => t.classList.toggle('on', t.dataset.tab === this.tab));
    const body = $('#inv .body');
    const bindTips = () => this.bindTips(body);
    if (this.tab === 'sac') {
      const items = Object.entries(s.inv).filter(([, q]) => q > 0);
      const cells = items.map(([id, q]) => `<div class="cell ${RARITY[ITEMS[id]?.rarity ?? 'commun']}" data-tip="${id}" data-id="${id}">${itemIcon(id)}<em>${q}</em></div>`).join('')
        + Array.from({ length: Math.max(0, 40 - items.length) }, () => '<div class="cell" style="cursor:default"></div>').join('');
      const worn = SLOTS.map(([k, l]) => { const id = s.equip[k]; return `<div class="ing" ${id ? `data-tip="${id}"` : ''}>${id ? itemIcon(id) : verrou}${l}<span style="margin-left:auto;color:${id ? 'var(--ink)' : 'var(--mute)'}">${id ? ITEMS[id].name : 'vide'}</span></div>`; }).join('');
      body.innerHTML = `<div><div class="sec">PORTÉ</div>${worn}<div class="btn" id="toEquip">Ouvrir l’équipement (C)</div>
        <div class="sec" style="margin-top:16px">BOURSE</div><div class="stats"><div><span>Écus</span><b>${nb(s.ecus)}</b></div><div><span>Objets</span><b>${items.length} / 40</b></div></div>
        <p style="color:var(--mute);font-size:13px;margin-top:12px">Clic sur une pièce d’équipement pour la porter, sur une potion pour la boire.</p></div>
        <div><div class="sec">SAC · ${items.length} / 40</div><div class="grid">${cells}</div></div>`;
      $('#toEquip', body).addEventListener('click', () => this.toggleEquip());
      body.querySelectorAll<HTMLElement>('.cell[data-id]').forEach(c => c.addEventListener('click', () => {
        const id = c.dataset.id!, d = ITEMS[id];
        if (d?.slot) this.act.equip(id); else if (id === 'potPV' || id === 'potMP') this.act.use(id);
      }));
    } else {
      const rc = RECIPES.find(r => r.id === this.recipe)!;
      const can = (r: typeof rc) => s.level >= r.level && s.ecus >= r.cost && Object.entries(r.needs).every(([k, q]) => (s.inv[k] ?? 0) >= q);
      const list = RECIPES.map(r => `<div class="re ${r.id === this.recipe ? 'on' : ''} ${can(r) ? 'ok' : ''} ${s.level < r.level ? 'lock' : ''}" data-r="${r.id}" data-tip="${r.out}">${itemIcon(r.out)}<div>${ITEMS[r.out].name}${r.qty > 1 ? ` ×${r.qty}` : ''}<small>niv. ${r.level} · ${ITEMS[r.out].kind}${r.cost ? ` · ${r.cost} écus` : ''}</small></div></div>`).join('');
      const ings = Object.entries(rc.needs).map(([k, q]) => { const have = s.inv[k] ?? 0; return `<div class="ing" data-tip="${k}">${itemIcon(k)}${ITEMS[k].name}<span class="${have >= q ? 'ok' : 'ko'}">${have} / ${q}</span></div>`; }).join('');
      const miss = s.level < rc.level ? `Recette du niveau ${rc.level}.` : Object.entries(rc.needs).filter(([k, q]) => (s.inv[k] ?? 0) < q).map(([k, q]) => `il manque ${q - (s.inv[k] ?? 0)} × ${ITEMS[k].name}`).join(', ') || (s.ecus < rc.cost ? 'Pas assez d’écus.' : '');
      const out = ITEMS[rc.out], bon = bonusText(rc.out);
      body.innerHTML = `<div><div class="sec">RECETTES</div><div class="rl">${list}</div></div>
        <div><div class="sec">${esc(out.name.toUpperCase())}</div><p style="margin:0 0 8px;color:var(--mute)">${out.desc}${bon ? `<br><span style="color:#9ade7a">${bon}</span>` : ''}</p>
        <div class="sec" style="font-size:13px">INGRÉDIENTS</div>${ings}
        ${rc.cost ? `<div class="ing" style="color:var(--mute)">Coût de l’atelier<span class="${s.ecus >= rc.cost ? 'ok' : 'ko'}">${rc.cost} écus</span></div>` : ''}
        <div class="btn ${can(rc) ? '' : 'off'}">Fabriquer</div><div class="warn">${miss ? miss.charAt(0).toUpperCase() + miss.slice(1) : ''}</div></div>`;
      body.querySelectorAll<HTMLElement>('.re').forEach(r => r.addEventListener('click', () => { this.recipe = r.dataset.r!; this.renderInv(); }));
      $('.btn', body).addEventListener('click', () => can(rc) && this.act.craft(rc.id));
    }
    bindTips();
  }

  /** Infobulle d'objet sur tout élément portant data-tip, avec comparaison à l'objet porté. */
  private bindTips(root: HTMLElement) {
    const tip = $<HTMLElement>('.itip');
    root.querySelectorAll<HTMLElement>('[data-tip]').forEach(el => {
      el.addEventListener('mouseenter', () => {
        const id = el.dataset.tip!, d = ITEMS[id]; if (!d) return;
        const bon = bonusText(id), cur = d.slot ? this.self?.equip[d.slot] : undefined;
        const cmp = d.slot && cur !== id && !el.dataset.worn ? diffText(id, cur) : '';
        const hint = el.dataset.worn ? 'Clic : retirer' : d.slot ? 'Clic : équiper' : d.kind === 'consommable' ? 'Clic : utiliser' : '';
        tip.innerHTML = `<div class="t">${d.name}</div><div class="r">${RNAME[d.rarity]} · ${d.kind}</div><p>${d.desc}</p>${bon ? `<p class="g">${bon}</p>` : ''}`
          + (cmp ? `<p class="cmp">${cur ? `Par rapport à ${ITEMS[cur].name}` : 'Emplacement vide'} : ${cmp}</p>` : '')
          + `${hint ? `<p class="m">${hint}</p>` : ''}<p class="m">Se vend ${d.price} écus</p>`;
        const r = el.getBoundingClientRect();
        tip.style.left = `${Math.min(innerWidth - 260, r.right + 8)}px`; tip.style.top = `${Math.min(innerHeight - 180, r.top)}px`;
        tip.style.display = 'block';
      });
      el.addEventListener('mouseleave', () => tip.style.display = 'none');
    });
  }

  // ------------------------------------------------------------------ équipement
  private doll: HTMLCanvasElement | null = null;
  setDoll(cv: HTMLCanvasElement) { this.doll = cv; if ($<HTMLElement>('#equip').style.display === 'block') this.renderEquip(); }

  toggleEquip() { if (this.toggle('#equip')) this.renderEquip(); }

  private renderEquip() {
    const s = this.self; if (!s) return;
    $<HTMLElement>('.itip').style.display = 'none';
    const body = $('#equip .body');
    const slot = ([k, l]: [Slot, string]) => {
      const id = s.equip[k];
      return `<div class="es ${id ? 'on ' + RARITY[ITEMS[id].rarity] : ''}" data-slot="${k}" ${id ? `data-tip="${id}" data-worn="1"` : ''}>${id ? itemIcon(id) : '<span class="vide">vide</span>'}<span>${l}</span></div>`;
    };
    const wearable = Object.entries(s.inv).filter(([id, q]) => q > 0 && ITEMS[id]?.slot);
    const rows = wearable.map(([id]) => {
      const d = ITEMS[id], cur = s.equip[d.slot!];
      return `<div class="re ok" data-id="${id}" data-tip="${id}">${itemIcon(id)}<div>${d.name}<small>${SLOTS.find(x => x[0] === d.slot)![1]} · ${bonusText(id)}</small><small class="cmp">${diffText(id, cur) || 'identique'}</small></div><span class="eqb">Équiper</span></div>`;
    }).join('') || '<p style="color:var(--mute)">Aucune pièce d’équipement dans le sac. Fabrique-en à l’atelier (F) avec les ressources récoltées et le butin des monstres.</p>';
    body.innerHTML = `<div class="doll"><div class="col">${slot(SLOTS[1])}${slot(SLOTS[2])}</div><div class="fig"></div><div class="col">${slot(SLOTS[0])}${slot(SLOTS[3])}</div></div>
      <div><div class="sec">CARACTÉRISTIQUES · NIVEAU ${s.level}</div><div class="stats">
        <div><span>PV</span><b>${nb(s.mhp)}</b></div><div><span>Bouclier</span><b>${nb(s.msh)}</b></div>
        <div><span>Mana</span><b>${nb(s.mmp)}</b></div><div><span>Dégâts</span><b>${s.dmg[0]} à ${s.dmg[1]}</b></div>
        <div><span>Critique</span><b>${Math.round(s.crit * 100)} %</b></div><div><span>Vitesse</span><b>${s.speed.toFixed(1).replace('.', ',')}</b></div></div>
        <div class="sec" style="margin-top:16px">DANS LE SAC</div><div class="rl" style="max-height:300px">${rows}</div>
        <p style="color:var(--mute);font-size:13px">Clic sur un emplacement porté pour le retirer.</p></div>`;
    if (this.doll) $('.fig', body).appendChild(this.doll);
    body.querySelectorAll<HTMLElement>('.es[data-tip]').forEach(e => e.addEventListener('click', () => { $<HTMLElement>('.itip').style.display = 'none'; this.act.unequip(e.dataset.slot as Slot); }));
    body.querySelectorAll<HTMLElement>('.re[data-id]').forEach(e => e.addEventListener('click', () => { $<HTMLElement>('.itip').style.display = 'none'; this.act.equip(e.dataset.id!); }));
    this.bindTips(body);
  }

  // ------------------------------------------------------------------ grimoire
  toggleSpells() { if (this.toggle('#spells')) this.renderSpells(); }

  private renderSpells() {
    const s = this.self; if (!s) return;
    const w = $('#spells');
    $('.hd .pts', w).innerHTML = `<b>${s.points}</b> point${s.points > 1 ? 's' : ''} de sort`;
    const body = $('.body', w);
    const rows = SPELLS.map((sp, k) => {
      const open = s.level >= sp.level, r = rankOf(s.ranks, sp.id), max = r >= MAX_RANK;
      const need = max ? 0 : rankLevel(sp.id, r + 1);
      const can = open && !max && s.points > 0 && s.level >= need;
      const why = !open ? `Se débloque au niveau ${sp.level}` : max ? 'Rang maximum' : s.level < need ? `Rang ${r + 1} au niveau ${need}` : !s.points ? 'Pas de point à dépenser' : `Passer au rang ${r + 1}`;
      const pips = Array.from({ length: MAX_RANK }, (_, i) => `<i class="${i < r && open ? 'on' : ''}"></i>`).join('');
      return `<div class="sp ${open ? '' : 'lock'}"><div class="ic">${spellIcon(sp.id)}<span class="k">${k + 1}</span></div>
        <div class="tx"><div class="nm">${sp.name}<span class="pips">${pips}</span></div><div class="ds">${sp.desc}</div>
          <div class="now">${open ? `Rang ${r} : ${fxLines(sp.id, r).join(' · ')}` : `Rang 1 : ${fxLines(sp.id, 1).join(' · ')}`}</div>
          ${open && !max ? `<div class="nx">Rang ${r + 1} : ${fxLines(sp.id, r + 1).join(' · ')}</div>` : ''}</div>
        <div class="ug"><div class="btn plus ${can ? '' : 'off'}" data-up="${sp.id}">+</div><small>${why}</small></div></div>`;
    }).join('');
    body.innerHTML = `<div class="list">${rows}</div>
      <div class="foot"><span>Un point par niveau gagné · chaque sort monte jusqu’au rang ${MAX_RANK} · un rang tous les 3 niveaux</span>
      <div class="btn sm ${Object.keys(s.ranks).length ? '' : 'off'}" id="resetSp">Réinitialiser les points</div></div>`;
    body.querySelectorAll<HTMLElement>('[data-up]').forEach(b => b.addEventListener('click', () => !b.classList.contains('off') && this.act.upgrade(b.dataset.up as SpellId)));
    $('#resetSp', body).addEventListener('click', e => !(e.currentTarget as HTMLElement).classList.contains('off') && this.act.resetSpells());
  }

  carte!: FenetreCarte;
  toggleMap(here?: [number, number]) {
    if (this.toggle('#wmap')) this.carte.ouvrir(here ?? this.here);
  }
  here: [number, number] = [4, -1];
}
