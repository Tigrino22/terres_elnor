// Fenêtre de la carte du monde (touche M) : le parchemin à gauche, le panneau des régions à droite,
// côte à côte. Glisser avec la souris pour se déplacer, molette pour zoomer autour du curseur.
//
// Le parchemin (dessin.ts) est dessiné une seule fois ; ce qui change en jeu (ta position, les cartes
// ouvertes, la case survolée ou choisie) est un calque SVG posé dessus, redessiné à chaque fois.
// Les déplacements et le zoom ne font que changer une transformation CSS : rien n'est redessiné.

import './carte-monde.css';
import { MAPS, MOBS, type MapDef } from '../../shared/data';
import { GRILLE, ZONES, type Case } from './donnees';
import { caseSous, centre, estDecouverte, estTerre, px, py, zoneDe } from './relief';
import { dessinerParchemin } from './dessin';

const { largeur: W, hauteur: H, taille: T } = GRILLE;

/** Réglages de navigation. */
export const NAVIGATION = {
  zoomMax: 3,
  /** facteur appliqué par cran de molette ou par clic sur + / − */
  pas: 1.25,
  /** zoom utilisé par « Centrer sur moi » */
  zoomCentrage: 1.8,
  /** au-delà de ce déplacement (pixels écran), un appui est un glissé et non un clic */
  seuilGlisse: 4,
};

const SVG = 'http://www.w3.org/2000/svg';
const egal = (a: Case, b: Case) => a[0] === b[0] && a[1] === b[1];
const fmt = (c: Case) => `(${c[0]}, ${c[1]})`.replace(/-/g, '−');
const carteEn = (c: Case): MapDef | undefined => Object.values(MAPS).find(m => egal(m.coords, c));
const monstresDe = (m: MapDef) => [...new Set(m.mobs.map(g => MOBS[g.kind].name))].join(', ');

export class FenetreCarte {
  /** carte où se trouve le joueur */
  ici: Case = [0, 0];
  private choisie: Case | null = null;
  private vue = { zoom: 1, x: 0, y: 0 };
  private dessinee = false;

  private readonly zone: HTMLElement;
  private readonly plan: HTMLElement;
  private readonly calque: SVGSVGElement;
  private readonly survol: SVGRectElement;
  private readonly bulle: HTMLElement;
  private readonly panneau: HTMLElement;

  constructor(racine: HTMLElement) {
    racine.classList.add('carte-monde');
    racine.innerHTML = `
      <div class="cm-vue">
        <div class="cm-plan"><canvas></canvas><svg viewBox="0 0 ${W} ${H}"></svg></div>
        <div class="cm-outils">
          <button data-o="plus" title="Zoomer (molette)">+</button>
          <button data-o="moins" title="Dézoomer (molette)">−</button>
          <button data-o="tout" title="Voir toute la carte">⤢</button>
          <button data-o="moi" title="Centrer sur ma position">◎</button>
        </div>
        <div class="cm-aide">Glisser pour se déplacer · molette pour zoomer · clic sur une case pour la détailler</div>
        <div class="cm-bulle panel"></div>
      </div>
      <aside class="cm-panneau"></aside>
      <span class="x">✕</span>`;
    this.zone = racine.querySelector('.cm-vue')!;
    this.plan = racine.querySelector('.cm-plan')!;
    this.calque = racine.querySelector('svg')!;
    this.bulle = racine.querySelector('.cm-bulle')!;
    this.panneau = racine.querySelector('.cm-panneau')!;
    this.survol = this.svg('rect', { class: 'cm-survol', width: T, height: T, visibility: 'hidden' }) as SVGRectElement;

    racine.querySelectorAll<HTMLButtonElement>('.cm-outils button').forEach(b => b.addEventListener('click', () => {
      const o = b.dataset.o;
      if (o === 'plus' || o === 'moins') {
        const r = this.zone.getBoundingClientRect();
        this.zoomerAutour(r.width / 2, r.height / 2, o === 'plus' ? NAVIGATION.pas : 1 / NAVIGATION.pas);
      } else if (o === 'tout') this.toutVoir();
      else this.centrerSur(this.ici, NAVIGATION.zoomCentrage);
    }));
    this.brancherSouris();
    new ResizeObserver(() => { if (this.dessinee) this.appliquer(); }).observe(this.zone);
  }

  /** À appeler quand la fenêtre vient d'être affichée. */
  ouvrir(ici: Case) {
    this.ici = ici;
    if (!this.dessinee) { dessinerParchemin(this.plan.querySelector('canvas')!, 2); this.dessinee = true; }
    this.choisie = null;
    this.redessinerCalque();
    this.remplirPanneau();
    requestAnimationFrame(() => this.centrerSur(ici, Math.max(this.zoomMin(), 1)));
  }

  // ------------------------------------------------------------------ navigation

  private zoomMin() {
    const r = this.zone.getBoundingClientRect();
    return Math.min(r.width / W, r.height / H);
  }

  /** Garde le parchemin dans la vue : centré s'il est plus petit, sans bord vide sinon. */
  private appliquer() {
    const r = this.zone.getBoundingClientRect(), v = this.vue;
    v.zoom = Math.min(NAVIGATION.zoomMax, Math.max(this.zoomMin(), v.zoom));
    const w = W * v.zoom, h = H * v.zoom;
    v.x = w <= r.width ? (r.width - w) / 2 : Math.min(0, Math.max(r.width - w, v.x));
    v.y = h <= r.height ? (r.height - h) / 2 : Math.min(0, Math.max(r.height - h, v.y));
    this.plan.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.zoom})`;
  }

  /** Zoome en gardant fixe le point (sx, sy) de la vue, en pixels écran. */
  private zoomerAutour(sx: number, sy: number, facteur: number) {
    const v = this.vue, avant = v.zoom;
    v.zoom = Math.min(NAVIGATION.zoomMax, Math.max(this.zoomMin(), avant * facteur));
    const k = v.zoom / avant;
    v.x = sx - (sx - v.x) * k; v.y = sy - (sy - v.y) * k;
    this.appliquer();
  }

  centrerSur(c: Case, zoom = this.vue.zoom) {
    const r = this.zone.getBoundingClientRect(), [X, Y] = centre(c);
    this.vue.zoom = Math.min(NAVIGATION.zoomMax, Math.max(this.zoomMin(), zoom));
    this.vue.x = r.width / 2 - X * this.vue.zoom; this.vue.y = r.height / 2 - Y * this.vue.zoom;
    this.appliquer();
  }

  toutVoir() { this.vue.zoom = 0; this.appliquer(); }

  /** Point écran (relatif à la vue) → pixel du parchemin. */
  private versParchemin(sx: number, sy: number) {
    return [(sx - this.vue.x) / this.vue.zoom, (sy - this.vue.y) / this.vue.zoom] as const;
  }

  private brancherSouris() {
    const z = this.zone;
    let appui: { id: number; sx: number; sy: number; vx: number; vy: number; glisse: boolean } | null = null;
    const local = (e: MouseEvent) => { const r = z.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as const; };

    z.addEventListener('wheel', e => {
      e.preventDefault();
      const [sx, sy] = local(e);
      this.zoomerAutour(sx, sy, Math.exp(-e.deltaY * 0.0015));
    }, { passive: false });

    z.addEventListener('pointerdown', e => {
      if (e.button !== 0 || (e.target as HTMLElement).closest('.cm-outils')) return;
      appui = { id: e.pointerId, sx: e.clientX, sy: e.clientY, vx: this.vue.x, vy: this.vue.y, glisse: false };
      z.setPointerCapture(e.pointerId);
    });
    z.addEventListener('pointermove', e => {
      if (appui && appui.id === e.pointerId) {
        const dx = e.clientX - appui.sx, dy = e.clientY - appui.sy;
        if (!appui.glisse && Math.hypot(dx, dy) > NAVIGATION.seuilGlisse) { appui.glisse = true; z.classList.add('glisse'); this.cacherSurvol(); }
        if (appui.glisse) { this.vue.x = appui.vx + dx; this.vue.y = appui.vy + dy; this.appliquer(); return; }
      }
      this.survoler(e);
    });
    const fin = (e: PointerEvent) => {
      if (!appui || appui.id !== e.pointerId) return;
      if (!appui.glisse) {
        const [X, Y] = this.versParchemin(...local(e)), c = caseSous(X, Y);
        if (estTerre(c[0], c[1])) this.choisir([c[0], c[1]]);
      }
      appui = null; z.classList.remove('glisse');
    };
    z.addEventListener('pointerup', fin);
    z.addEventListener('pointercancel', fin);
    z.addEventListener('pointerleave', () => { if (!appui) this.cacherSurvol(); });
    z.addEventListener('dblclick', e => { const [sx, sy] = local(e); this.zoomerAutour(sx, sy, NAVIGATION.pas * NAVIGATION.pas); });
  }

  // ------------------------------------------------------------------ survol et sélection

  private survoler(e: PointerEvent) {
    const r = this.zone.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    if ((e.target as HTMLElement).closest('.cm-outils')) return this.cacherSurvol();
    const [X, Y] = this.versParchemin(sx, sy), c = caseSous(X, Y) as unknown as Case;
    if (!estTerre(c[0], c[1])) return this.cacherSurvol();
    this.survol.setAttribute('x', String(px(c[0]))); this.survol.setAttribute('y', String(py(c[1])));
    this.survol.setAttribute('visibility', 'visible');
    this.bulle.innerHTML = this.description(c);
    const bw = this.bulle.offsetWidth || 240, bh = this.bulle.offsetHeight || 80;
    this.bulle.style.left = `${Math.min(sx + 16, r.width - bw - 8)}px`;
    this.bulle.style.top = `${Math.min(sy + 16, r.height - bh - 8)}px`;
    this.bulle.style.display = 'block';
  }

  private cacherSurvol() { this.survol.setAttribute('visibility', 'hidden'); this.bulle.style.display = 'none'; }

  private description(c: Case) {
    const m = carteEn(c), z = zoneDe(c[0], c[1]);
    if (m) return `<b>${m.name}</b><br>Carte ${fmt(c)} · niv. ${m.levels}<br><span class="m">${monstresDe(m)}</span>`;
    const etat = z.decouverte <= 0 ? 'Région verrouillée' : estDecouverte(c[0], c[1], z) ? 'Pas encore ouverte' : 'Sous la brume';
    return `<b>${z.nom}</b><br>Carte ${fmt(c)} · niv. ${z.niveaux}<br><span class="m">${etat}</span>`;
  }

  private choisir(c: Case) {
    this.choisie = this.choisie && egal(this.choisie, c) ? null : c;
    this.redessinerCalque();
    this.remplirPanneau();
  }

  // ------------------------------------------------------------------ calque SVG

  private svg(tag: string, attrs: Record<string, string | number>) {
    const el = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    return el;
  }

  private redessinerCalque() {
    const s = this.calque;
    s.replaceChildren();
    for (const m of Object.values(MAPS)) {
      s.append(this.svg('rect', { class: 'cm-ouverte', x: px(m.coords[0]) + 2, y: py(m.coords[1]) + 2, width: T - 4, height: T - 4 }));
    }
    if (this.choisie) s.append(this.svg('rect', { class: 'cm-choisie', x: px(this.choisie[0]) + 1, y: py(this.choisie[1]) + 1, width: T - 2, height: T - 2 }));
    const [X, Y] = centre(this.ici);
    s.append(
      this.svg('rect', { class: 'cm-ici-case', x: px(this.ici[0]) + 1, y: py(this.ici[1]) + 1, width: T - 2, height: T - 2 }),
      this.svg('circle', { class: 'cm-ici-onde', cx: X, cy: Y, r: 22 }),
      this.svg('circle', { class: 'cm-ici', cx: X, cy: Y, r: 8 }),
      this.survol,
    );
  }

  // ------------------------------------------------------------------ panneau latéral

  private remplirPanneau() {
    const cartes = Object.values(MAPS);
    const fiche = this.choisie ? `<div class="cm-fiche">${this.description(this.choisie)}</div>` : '';
    this.panneau.innerHTML = `
      <h1>Carte du monde</h1>
      <div class="s">Terres d'Elnor · touche M · ${cartes.length} cartes ouvertes</div>
      ${fiche}
      <div class="sec">RÉGIONS</div>
      ${ZONES.map(z => `<div class="z ${z.decouverte > 0 ? '' : 'lock'}"><i style="background:${z.couleur}"></i>${z.nom}<span>${z.niveaux}${z.decouverte > 0 ? '' : ' · verrouillé'}</span></div>`).join('')}
      <div class="sec">CARTES OUVERTES</div>
      ${cartes.map(m => `<div class="z lien ${egal(m.coords, this.ici) ? 'ici' : ''}" data-c="${m.coords.join(',')}"><i style="background:${zoneDe(...m.coords).couleur}"></i>${m.name}<span>${fmt(m.coords)} · niv. ${m.levels}</span></div>`).join('')}`;
    this.panneau.querySelectorAll<HTMLElement>('[data-c]').forEach(el => el.addEventListener('click', () => {
      const c = el.dataset.c!.split(',').map(Number) as unknown as Case;
      this.choisie = c; this.redessinerCalque(); this.remplirPanneau();
      this.centrerSur(c, Math.max(this.vue.zoom, NAVIGATION.zoomCentrage));
    }));
  }
}
