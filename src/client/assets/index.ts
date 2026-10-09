// Registre de tous les éléments graphiques du jeu. Chaque élément vit dans son propre fichier ;
// ce registre ne fait que les rassembler. Voir LISEZMOI.md pour savoir où modifier quoi.

import { ITEMS, MOBS, NODES, Slot, SpellId } from '../../shared/data';
import type { Race } from '../../shared/protocol';
import { Builder, cached, meshOf } from './kit';
import type { ItemArt, MobArt, NodeArt, RaceArt, SpellArt, WearArt } from './types';

import { elfe } from './personnages/elfe';
import { humain } from './personnages/humain';
import { drawBody } from './personnages/corps';
import { carquois } from './equipement/carquois';
import { departArc } from './equipement/depart-arc';
import { departTunique } from './equipement/depart-tunique';
import { departBottes } from './equipement/depart-bottes';
import { arcFrene } from './equipement/arcFrene';
import { arcCroc } from './equipement/arcCroc';
import { capuche } from './equipement/capuche';
import { tunique } from './equipement/tunique';
import { bottes } from './equipement/bottes';
import { bois } from './objets/bois';
import { cuivre } from './objets/cuivre';
import { lingot } from './objets/lingot';
import { lunaire } from './objets/lunaire';
import { cuir } from './objets/cuir';
import { viande } from './objets/viande';
import { croc } from './objets/croc';
import { peau } from './objets/peau';
import { insigne } from './objets/insigne';
import { grisecroc } from './objets/grisecroc';
import { potPV } from './objets/potPV';
import { potMP } from './objets/potMP';
import { tir } from './sorts/tir';
import { percante } from './sorts/percante';
import { pluie } from './sorts/pluie';
import { piege } from './sorts/piege';
import { vent } from './sorts/vent';
import { marque } from './sorts/marque';
import { sanglier } from './monstres/sanglier';
import { gorrok } from './monstres/gorrok';
import { loup } from './monstres/loup';
import { alpha } from './monstres/alpha';
import { frene } from './ressources/frene';
import { cuivre as filonCuivre } from './ressources/cuivre';
import { lunaire as toufeLunaire } from './ressources/lunaire';
import { verrou } from './interface/verrou';

export const RACE_ART: Record<Race, RaceArt> = { elfe, humain };

export const ITEM_ART: Record<keyof typeof ITEMS, ItemArt> = {
  bois, cuivre, lingot, lunaire, cuir, viande, croc, peau, insigne, grisecroc, potPV, potMP,
  arcFrene, arcCroc, capuche, tunique, bottes,
};

export const SPELL_ART: Record<SpellId, SpellArt> = { tir, percante, pluie, piege, vent, marque };

export const MOB_ART: Record<keyof typeof MOBS, MobArt> = { sanglier, gorrok, loup, alpha };

export const NODE_ART: Record<keyof typeof NODES, NodeArt> = { frene, cuivre: filonCuivre, lunaire: toufeLunaire };

/** Ce que porte un personnage quand un emplacement est vide. */
export const DEPART: Record<Slot, WearArt | null> = { arme: departArc, tete: null, torse: departTunique, pieds: departBottes };

export const itemIcon = (id: string) => ITEM_ART[id]?.icon ?? verrou;
export const spellIcon = (id: SpellId) => SPELL_ART[id].icon;
export { verrou };

// ---------------------------------------------------------------- modèles 3D assemblés

/** Personnage : corps + peuple + chaque pièce portée (ou la tenue de départ). */
export function playerModel(race: Race, equip: Partial<Record<Slot, string>> = {}) {
  const r = RACE_ART[race] ?? elfe;
  const pieces = (['pieds', 'torse', 'tete', 'arme'] as Slot[]).map(s => {
    const art = equip[s] ? ITEM_ART[equip[s]!] : undefined;
    return art?.wear ? art as WearArt : DEPART[s];
  });
  const key = `p-${race}-${(['arme', 'tete', 'torse', 'pieds'] as Slot[]).map(s => equip[s] ?? '').join('.')}`;
  return meshOf(cached(key, () => {
    const b = new Builder();
    drawBody(b, r, pieces.some(p => p?.hidesHair));
    for (const p of pieces) p?.wear(b, r);
    carquois.wear(b, r);
    return b.bake();
  }));
}

export function mobModel(kind: string) {
  const art = MOB_ART[kind] ?? loup;
  const m = meshOf(cached('m-' + kind, () => { const b = new Builder(); art.build(b); return b.bake(); }));
  m.scale.setScalar(art.scale);
  return m;
}

export function nodeModel(kind: string) {
  const art = NODE_ART[kind as keyof typeof NODES] ?? frene;
  return meshOf(cached('n-' + kind, () => { const b = new Builder(); art.build(b); return b.bake(); }));
}

export { trapModel } from './sorts/piege';
export { butinModel, BUTIN_HALO } from './decor/butin';
export { grotteModel } from './decor/grotte';
export { feuDeCampModel, tenteModel } from './decor/campement';
export { portalModel } from './decor/portail';
export { arbreGeo, ARBRE_VARIANTES } from './decor/arbre';
export { sapinGeo, SAPIN_VARIANTES } from './decor/sapin';
export { buissonGeo } from './decor/buisson';
export { rocherGeo } from './decor/rocher';
export { arrowGeo, AUTO_SHOT } from './effets/fleche';
export { SOL } from './terrain/sol';
export { Builder, MAT, glowSprite } from './kit';
