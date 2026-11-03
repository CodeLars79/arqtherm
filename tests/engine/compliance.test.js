import { describe, it, expect } from 'vitest';
import { lookupLimit, compareWithLimit, evaluateCompliance, formatNumber, formatWithUnit } from '../../src/engine/index.js';
import { elementTypes, uValueLimits } from '../../src/data/index.js';

const type = (id) => elementTypes.find((e) => e.id === id);

// Valores esperados copiados del DB-HE consolidado (14 junio 2022), tablas 3.1.1.a-HE1 y 3.2-HE1.
describe('lookupLimit (tabla 3.1.1.a-HE1 verificada)', () => {
  it.each([
    ['fachada', 'alpha', 0.80], ['fachada', 'C', 0.49], ['fachada', 'D', 0.41], ['fachada', 'E', 0.37],
    ['cubierta', 'A', 0.50], ['cubierta', 'E', 0.33],
    ['suelo-exterior', 'B', 0.56],
    ['medianeria', 'D', 0.65], ['medianeria', 'alpha', 0.90]
  ])('%s en zona %s → %s W/(m²·K)', (id, zone, expected) => {
    const r = lookupLimit({ elementType: type(id), climateZone: zone, limitsData: uValueLimits });
    expect(r.ok).toBe(true);
    expect(r.limit).toBe(expected);
  });

  it('particiones (tabla 3.2-HE1) requieren contexto', () => {
    const missing = lookupLimit({ elementType: type('particion-vertical'), climateZone: 'C', limitsData: uValueLimits });
    expect(missing.ok).toBe(false);
    expect(missing.code).toBe('context-missing');
    expect(lookupLimit({ elementType: type('particion-vertical'), climateZone: 'C', contextId: 'same-use', limitsData: uValueLimits }).limit).toBe(1.20);
    expect(lookupLimit({ elementType: type('particion-horizontal-ascendente'), climateZone: 'C', contextId: 'same-use', limitsData: uValueLimits }).limit).toBe(1.35);
    expect(lookupLimit({ elementType: type('particion-vertical'), climateZone: 'E', contextId: 'other-use', limitsData: uValueLimits }).limit).toBe(0.70);
  });

  it('sin zona o con tipo no soportado no hay límite', () => {
    expect(lookupLimit({ elementType: type('fachada'), climateZone: null, limitsData: uValueLimits }).code).toBe('zone-missing');
    expect(lookupLimit({ elementType: type('hueco'), climateZone: 'C', limitsData: uValueLimits }).code).toBe('element-unsupported');
  });

  it('una tabla no verificada no produce veredicto', () => {
    const unverified = {
      tables: uValueLimits.tables.map((t) => ({ ...t, validationStatus: 'pending' }))
    };
    const r = lookupLimit({ elementType: type('fachada'), climateZone: 'C', limitsData: unverified });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('table-unverified');
  });
});

describe('compareWithLimit', () => {
  it('justo en el límite cumple (U no superará Ulim)', () => {
    expect(compareWithLimit(0.41, 0.41)).toBe('complies');
  });
  it('por debajo cumple, por encima no', () => {
    expect(compareWithLimit(0.4099999, 0.41)).toBe('complies');
    expect(compareWithLimit(0.4100001, 0.41)).toBe('not-complies');
  });
  it('compara sin redondear: 0,4104 no cumple aunque se muestre como 0,41', () => {
    expect(compareWithLimit(0.4104, 0.41)).toBe('not-complies');
    expect(formatNumber(0.4104, 2)).toBe('0,41');
  });
  it('valores no válidos no producen veredicto', () => {
    expect(compareWithLimit(NaN, 0.41)).toBeNull();
    expect(compareWithLimit(null, 0.41)).toBeNull();
  });
});

describe('evaluateCompliance', () => {
  const calc = (u, status = 'complete') => ({ status, uValue: u, elementType: type('fachada') });
  it('tres estados', () => {
    expect(evaluateCompliance({ calculation: calc(0.40), climateZone: 'D', limitsData: uValueLimits }).state).toBe('complies');
    expect(evaluateCompliance({ calculation: calc(0.45), climateZone: 'D', limitsData: uValueLimits }).state).toBe('not-complies');
    expect(evaluateCompliance({ calculation: calc(null, 'incomplete'), climateZone: 'D', limitsData: uValueLimits }).state).toBe('unavailable');
    expect(evaluateCompliance({ calculation: calc(0.40), climateZone: null, limitsData: uValueLimits }).state).toBe('unavailable');
  });
  it('informa del margen y de la referencia', () => {
    const r = evaluateCompliance({ calculation: calc(0.40), climateZone: 'D', limitsData: uValueLimits });
    expect(r.margin).toBeCloseTo(0.01, 12);
    expect(r.lookup.table.reference).toMatch(/3\.1\.1\.a-HE1/);
  });
});

describe('formato de presentación', () => {
  it('coma decimal y redondeo solo al mostrar', () => {
    expect(formatNumber(0.443075, 3)).toBe('0,443');
    expect(formatNumber(2.256956, 2)).toBe('2,26');
    expect(formatNumber(0, 2)).toBe('0,00');
    expect(formatNumber(-0.0001, 2)).toBe('0,00');
  });
  it('valores no finitos se muestran como «—»', () => {
    expect(formatNumber(NaN)).toBe('—');
    expect(formatNumber(Infinity)).toBe('—');
    expect(formatNumber(null)).toBe('—');
    expect(formatWithUnit(null, 2, 'mm')).toBe('—');
  });
});
