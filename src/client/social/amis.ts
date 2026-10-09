// Fenêtre des amis et des joueurs connectés (touche O) : nom, race, voie, niveau et carte de chacun.
// La liste vient du serveur (message `social`), rafraîchie dès qu'elle change.

import './amis.css';
import type { JoueurInfo } from '../../shared/protocol';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const RACE: Record<string, string> = { elfe: 'Elfe', humain: 'Humain' };
const fmt = (c: [number, number]) => `(${c[0]}, ${c[1]})`.replace(/-/g, '−');

export class FenetreAmis {
  private online: JoueurInfo[] = [];
  private amis: JoueurInfo[] = [];
  private onglet: 'amis' | 'connectes' = 'amis';
  private readonly corps: HTMLElement;
  /** nom du personnage joué, pour ne pas se proposer soi-même en ami */
  moi = '';

  constructor(private racine: HTMLElement, private ami: (name: string, add: boolean) => void) {
    racine.innerHTML = `<div class="hd"><span class="title">Social</span><div class="tabs2">
        <span class="tab on" data-o="amis">Amis</span><span class="tab" data-o="connectes">Connectés</span></div><span class="x">✕</span></div>
      <div class="body"></div>
      <form class="ajout"><input maxlength="16" placeholder="Nom du personnage à ajouter"><button class="btn sm">Ajouter</button></form>`;
    this.corps = racine.querySelector('.body')!;
    racine.querySelectorAll<HTMLElement>('.tab').forEach(t => t.addEventListener('click', () => { this.onglet = t.dataset.o as 'amis'; this.rendre(); }));
    const form = racine.querySelector('form')!, input = form.querySelector('input')!;
    form.addEventListener('submit', e => { e.preventDefault(); if (input.value.trim()) this.ami(input.value.trim(), true); input.value = ''; });
    // les touches tapées dans le champ ne doivent pas faire bouger le personnage
    input.addEventListener('keydown', e => e.stopPropagation());
    this.corps.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-add],[data-del]');
      if (b) this.ami(b.dataset.add ?? b.dataset.del!, !!b.dataset.add);
    });
  }

  maj(online: JoueurInfo[], amis: JoueurInfo[]) {
    this.online = online; this.amis = amis;
    if (this.racine.style.display === 'block') this.rendre();
  }

  get nbConnectes() { return this.online.length; }

  rendre() {
    this.racine.querySelectorAll<HTMLElement>('.tab').forEach(t => {
      t.classList.toggle('on', t.dataset.o === this.onglet);
      if (t.dataset.o === 'connectes') t.textContent = `Connectés (${this.online.length})`;
      if (t.dataset.o === 'amis') t.textContent = `Amis (${this.amis.filter(a => a.online).length}/${this.amis.length})`;
    });
    const estAmi = (n: string) => this.amis.some(a => a.name.toLowerCase() === n.toLowerCase());
    const liste = this.onglet === 'amis' ? this.amis : this.online;
    const vide = this.onglet === 'amis'
      ? 'Pas encore d’amis. Ajoute un joueur connecté avec le champ ci-dessous ou depuis l’onglet Connectés.'
      : 'Personne d’autre n’est connecté.';
    this.corps.innerHTML = liste.length ? `<div class="ligne tete"><span></span><span>Personnage</span><span>Niv.</span><span>Voie</span><span>Où</span><span></span></div>` + liste.map(j => {
      const bouton = this.onglet === 'amis'
        ? `<span class="act" data-del="${esc(j.name)}" title="Retirer de mes amis">✕</span>`
        : j.name === this.moi ? '<span class="moi">toi</span>' : estAmi(j.name) ? '<span class="moi">ami</span>' : `<span class="act add" data-add="${esc(j.name)}" title="Ajouter en ami">+ ami</span>`;
      return `<div class="ligne ${j.online ? '' : 'off'}"><i class="pt"></i>
        <span><b>${esc(j.name)}</b><small>${RACE[j.race] ?? j.race}</small></span>
        <span class="niv">${j.level}</span><span>${esc(j.voie)}</span>
        <span>${j.online && j.map ? `${esc(j.map)} <small>${fmt(j.coords!)}</small>` : 'hors ligne'}</span>${bouton}</div>`;
    }).join('') : `<p class="vide">${vide}</p>`;
  }
}
