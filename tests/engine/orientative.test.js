import { describe, it, expect } from 'vitest';
import { lookupOrientative, evaluateOrientative, evaluateCompliance } from '../../src/engine/index.js';
import { elementTypes, uValueLimits } from '../../src/data/index.js';

const type = (id) => elementTypes.find((e) => e.id === id);

// Valores esperados copiados de la tabla a-Anejo E del DB-HE (Guía de aplicación del DB-HE 2019, pág. 38).
describe('lookupOrientative (tabla a-Anejo E)', () => {
  it.each([
    ['fachada', 'alpha', 0.56], ['fachada', 'C', 0.29], ['fachada', 'D', 0.27], ['fachada', 'E', 0.23],
    ['suelo-exterior', 'B', 0.38],
    ['cubierta', 'A', 0.44], ['cubierta', 'C', 0.23], ['cubierta', 'E', 0.19]
  ])('%s en zona %s → %s W/(m²·K)', (id, zone, expected) => {
    const r = lookupOrientative({ elementType: type(id), climateZone: zone, limitsData: uValueLimits });
    expect(r.ok).toBe(true);
    expect(r.value).toBe(expected);
    expect(r.table.kind).toBe('orientative');
  });

  it('medianerías y particiones no tienen valor orientativo', () => {
    for (const id of ['medianeria', 'particion-vertical', 'particion-horizontal-ascendente']) {
      const r = lookupOrientative({ elementType: type(id), climateZone: 'C', limitsData: uValueLimits });
      expect(r.ok).toBe(false);
      expect(r.code).toBe('no-orientative');
    }
  });

  it('sin zona o tabla sin verificar: no disponible', () => {
    expect(lookupOrientative({ elementType: type('fachada'), climateZone: null, limitsData: uValueLimits }).code).toBe('zone-missing');
    const unverified = { tables: uValueLimits.tables.map((t) => ({ ...t, validationStatus: 'pending' })) };
    expect(lookupOrientative({ elementType: type('fachada'), climateZone: 'C', limitsData: unverified }).code).toBe('table-unverified');
  });
});

describe('evaluateOrientative', () => {
  const calc = (u, status = 'complete', id = 'fachada') => ({ status, uValue: u, elementType: type(id) });

  it('justo en el valor orientativo queda dentro', () => {
    expect(evaluateOrientative({ calculation: calc(0.29), climateZone: 'C', limitsData: uValueLimits }).state).toBe('within');
  });

  it('el ejemplo de fachada (U ≈ 0,395, lana mineral λ = 0,036) cumple Ulim = 0,49 en zona C pero supera el orientativo 0,29', () => {
    const c = calc(0.3948);
    expect(evaluateCompliance({ calculation: c, climateZone: 'C', limitsData: uValueLimits }).state).toBe('complies');
    const o = evaluateOrientative({ calculation: c, climateZone: 'C', limitsData: uValueLimits });
    expect(o.state).toBe('above');
    expect(o.value).toBe(0.29);
    expect(o.margin).toBeCloseTo(0.29 - 0.3948, 12);
  });

  it('cálculo incompleto: no disponible', () => {
    expect(evaluateOrientative({ calculation: calc(null, 'incomplete'), climateZone: 'C', limitsData: uValueLimits }).state).toBe('unavailable');
  });
});
