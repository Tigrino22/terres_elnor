import { describe, expect, it } from 'vitest';
import { MAPS } from '../src/shared/data';
import { DONJONS, GRILLE, SANCTUAIRES, VILLES, ZONES } from '../src/client/carte-monde/donnees';
import { caseSous, centre, casesDeTerre, estTerre } from '../src/client/carte-monde/relief';

describe('carte du monde', () => {
  it('chaque carte jouable est sur la terre ferme, dans la grille', () => {
    for (const m of Object.values(MAPS)) {
      const [x, y] = m.coords;
      expect(x >= GRILLE.xMin && x <= GRILLE.xMax && y >= GRILLE.yMin && y <= GRILLE.yMax, m.id).toBe(true);
      expect(estTerre(x, y), m.id).toBe(true);
    }
  });

  it('les zones ont des identifiants uniques et chacune possède au moins une case', () => {
    expect(new Set(ZONES.map(z => z.id)).size).toBe(ZONES.length);
    const vues = new Set(casesDeTerre().map(c => c.zone.id));
    for (const z of ZONES) expect(vues.has(z.id), z.id).toBe(true);
  });

  it('villes, sanctuaires et donjons sont sur la terre', () => {
    for (const v of VILLES) expect(estTerre(...v.pos), v.nom).toBe(true);
    for (const c of [...SANCTUAIRES, ...DONJONS]) expect(estTerre(...c), String(c)).toBe(true);
  });

  it('pixel ↔ case : le centre d’une case retombe sur elle', () => {
    for (const c of [[0, 0], [GRILLE.xMin, GRILLE.yMin], [GRILLE.xMax, GRILLE.yMax], [-7, 4]] as const) {
      const [X, Y] = centre(c);
      expect(caseSous(X, Y)).toEqual(c);
    }
  });
});
