import { describe, it, expect } from 'vitest';
import { ITEMS, MOBS, NODES, SPELLS } from '../src/shared/data';
import { ITEM_ART, MOB_ART, NODE_ART, SPELL_ART, mobModel, nodeModel, playerModel } from '../src/client/assets';

describe('éléments graphiques', () => {
  it('chaque objet, sort, monstre et ressource a son propre fichier', () => {
    for (const id of Object.keys(ITEMS)) expect(ITEM_ART[id], id).toBeDefined();
    for (const s of SPELLS) expect(SPELL_ART[s.id], s.id).toBeDefined();
    for (const id of Object.keys(MOBS)) expect(MOB_ART[id], id).toBeDefined();
    for (const id of Object.keys(NODES)) expect(NODE_ART[id as keyof typeof NODES], id).toBeDefined();
  });

  it('deux objets ou deux sorts n’ont jamais la même icône', () => {
    const items = Object.values(ITEM_ART).map(a => a.icon), spells = Object.values(SPELL_ART).map(a => a.icon);
    expect(new Set(items).size).toBe(items.length);
    expect(new Set(spells).size).toBe(spells.length);
  });

  it('chaque pièce d’équipement se voit sur le personnage et change son modèle', () => {
    const nu = playerModel('elfe').geometry;
    for (const [id, d] of Object.entries(ITEMS)) {
      if (!d.slot) continue;
      expect(ITEM_ART[id].wear, id).toBeTypeOf('function');
      expect(playerModel('elfe', { [d.slot]: id }).geometry, id).not.toBe(nu);
    }
    expect(playerModel('humain', { arme: 'arcCroc', tete: 'capuche', torse: 'tunique', pieds: 'bottes' }).geometry.attributes.position.count).toBeGreaterThan(0);
  });

  it('construit chaque monstre et chaque ressource', () => {
    for (const id of Object.keys(MOBS)) expect(mobModel(id).geometry.attributes.position.count, id).toBeGreaterThan(0);
    for (const id of Object.keys(NODES)) expect(nodeModel(id).geometry.attributes.position.count, id).toBeGreaterThan(0);
  });
});
