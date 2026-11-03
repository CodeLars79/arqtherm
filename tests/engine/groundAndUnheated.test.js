import { describe, it, expect } from 'vitest';
import { calculateAssembly, evaluateCompliance, evaluateOrientative, reductionFactorB, characteristicLength } from '../../src/engine/index.js';
import { buildMaterialsById, calculationData, elementTypes, uValueLimits } from '../../src/data/index.js';

const deps = { materialsById: buildMaterialsById([]), calculationData, elementTypes };
const T = calculationData.groundAndUnheated.tables;
const L = (id, materialId, thicknessMm) => ({ id, materialId, name: null, thicknessMm, lambda: null, lambdaOverride: false });
const mw60 = [L('a', 'cec-mw', 60)]; // R = 0,060 / 0,036 = 1,6667
const calc = (elementTypeId, params, layers = mw60) => calculateAssembly({ elementTypeId, layers, params }, deps);

describe('DA DB-HE/1 tables are internally consistent (transcription check)', () => {
  const nonIncreasing = (arr) => arr.every((v, i) => i === 0 || v === null || arr[i - 1] === null || v <= arr[i - 1] + 1e-9);
  it('table 3: U falls with B\' and with Ra, and with wider bands', () => {
    for (const g of T.T3.byBandWidth) {
      g.values.forEach((row) => expect(nonIncreasing(row)).toBe(true));
      // Con D ≥ 1,0 m la fila B' = 1 queda totalmente aislada, por lo que puede ser menor que la de B' = 2.
      const rows = g.d >= 1.0 ? g.values.slice(1) : g.values;
      for (let j = 0; j < T.T3.ra.length; j++) expect(nonIncreasing(rows.map((r) => r[j]))).toBe(true);
    }
  });
  it('table 4, 5 and 9 are monotonic', () => {
    for (const b of T.T4.depthBands) {
      b.values.forEach((row) => expect(nonIncreasing(row)).toBe(true));
      for (let j = 0; j < 4; j++) expect(nonIncreasing(b.values.map((r) => r[j]))).toBe(true);
    }
    T.T5.values.forEach((row) => expect(nonIncreasing(row)).toBe(true));
    for (let j = 0; j < 6; j++) expect(nonIncreasing(T.T5.values.map((r) => r[j]))).toBe(true);
    T.T9.values.forEach((row) => expect(nonIncreasing(row)).toBe(true));
    for (let j = 0; j < 7; j++) expect(nonIncreasing(T.T9.values.map((r) => r[j]))).toBe(true);
  });
  it('table 7: b rises with ventilation (case 2 ≥ case 1) and falls with the area ratio', () => {
    for (const g of T.T7.groups) {
      g.values.forEach(([c1, c2]) => expect(c2).toBeGreaterThanOrEqual(c1));
      expect(nonIncreasing(g.values.map((r) => r[0]))).toBe(true);
    }
  });
});

describe('ground-contact elements', () => {
  it('B\' = A / (0,5·P)', () => {
    expect(characteristicLength(100, 40)).toBe(5);
    expect(characteristicLength(0, 40)).toBeNull();
  });
  it('slab case 1 without insulation reads the Ra = 0 column', () => {
    const r = calc('suelo-terreno', { areaM2: 100, perimeterM: 40, depthM: 0, insulation: 'none' });
    expect(r.status).toBe('complete');
    expect(r.uValue).toBeCloseTo(0.85, 10);
    expect(r.rsi).toBeNull();
  });
  it('slab case 1 with full insulation uses D ≥ 1,5 m and interpolates Ra', () => {
    const r = calc('suelo-terreno', { areaM2: 100, perimeterM: 40, depthM: 0, insulation: 'full' });
    expect(r.uValue).toBeCloseTo(0.50 - 0.03 * (1 / 0.036 * 0.06 - 1.5) / 0.5, 6);
  });
  it('slab case 1 interpolates the band width D', () => {
    const r = calc('suelo-terreno', { areaM2: 80, perimeterM: 40, depthM: 0, insulation: 'band', bandWidthM: 0.75, raMode: 'manual', raManual: 1.0 });
    expect(r.uValue).toBeCloseTo((0.73 + 0.65) / 2, 10);
  });
  it('slab case 2 uses the depth band of table 4', () => {
    const r = calc('suelo-terreno', { areaM2: 100, perimeterM: 40, depthM: 1.5 }, [L('a', 'cec-mw', 36)]); // Rf = 1,0
    expect(r.uValue).toBeCloseTo(0.40, 10);
  });
  it('slab requires area and perimeter', () => {
    const r = calc('suelo-terreno', { depthM: 0 });
    expect(r.status).toBe('incomplete');
    expect(r.uValue).toBeNull();
  });
  it('buried wall: bilinear interpolation in Rm and z', () => {
    const r = calc('muro-terreno', { depthM: 2.5 });
    expect(r.uValue).toBeCloseTo(0.38 - (0.38 - 0.37) * (0.06 / 0.036 - 1.6) / 0.1, 6);
  });
  it('buried wall above Rm = 2 takes the table edge and warns', () => {
    const r = calc('muro-terreno', { depthM: 1 }, [L('a', 'cec-mw', 100)]);
    expect(r.uValue).toBeCloseTo(0.39, 10);
    expect(r.special.notes.length).toBe(1);
  });
  it('buried roof adds the soil as a layer with λ = 2', () => {
    const r = calc('cubierta-enterrada', { soilThicknessMm: 500 });
    const soil = r.layers.find((l) => l.soil);
    expect(soil.resistance).toBeCloseTo(0.25, 10);
    expect(r.totalResistance).toBeCloseTo(0.10 + 0.25 + 0.06 / 0.036 + 0.04, 10);
  });
  it('crawl space needs its conditions confirmed, then reads table 9', () => {
    expect(calc('suelo-camara-sanitaria', { areaM2: 100, perimeterM: 40 }).status).toBe('incomplete');
    const r = calc('suelo-camara-sanitaria', { areaM2: 100, perimeterM: 40, crawlConditionsMet: true });
    expect(r.uValue).toBeCloseTo(0.53 - 0.11 * (0.06 / 0.036 - 1.5) / 0.5, 6);
  });
  it('ground elements are checked against UT and the Anejo E UT row', () => {
    const r = calc('muro-terreno', { depthM: 2.5 });
    const c = evaluateCompliance({ calculation: r, climateZone: 'C', limitsData: uValueLimits });
    expect(c.limit).toBe(0.7);
    expect(c.state).toBe('complies');
    expect(evaluateOrientative({ calculation: r, climateZone: 'C', limitsData: uValueLimits }).value).toBe(0.48);
  });
});

describe('non-habitable spaces', () => {
  it('b from table 7 by ratio band, insulation group and ventilation case', () => {
    const b = (ratio, groupId, airtightnessLevel) => reductionFactorB({ ratio, groupId, airtightnessLevel }, T.T7).value;
    expect(b(0.2, 'nhe-no_hnh-yes', 1)).toBe(0.99);
    expect(b(0.625, 'nhe-no_hnh-yes', 3)).toBe(0.96);
    expect(b(3.0, 'nhe-no_hnh-no', 4)).toBe(0.61);
    expect(b(3.5, 'nhe-yes_hnh-no', 5)).toBe(0.50);
    expect(reductionFactorB({ ratio: 1, groupId: 'x', airtightnessLevel: 1 }, T.T7).ok).toBe(false);
  });
  it('U = Up · b with partition surface resistances of table 6', () => {
    const r = calc('no-habitable', { flow: 'downward', partitionAreaM2: 50, envelopeAreaM2: 80, airtightness: 3, insulationCase: 'nhe-no_hnh-yes' });
    const up = 1 / (0.17 + 0.06 / 0.036 + 0.17);
    expect(r.special.up).toBeCloseTo(up, 10);
    expect(r.uValue).toBeCloseTo(up * 0.96, 10);
  });
  it('accepts a known b and rejects values outside (0, 1]', () => {
    expect(calc('no-habitable', { bMode: 'manual', bManual: 0.8 }).special.b).toBe(0.8);
    expect(calc('no-habitable', { bMode: 'manual', bManual: 1.4 }).status).toBe('incomplete');
  });
});

describe('cubierta invertida: corrección ΔUr (UNE-EN ISO 6946, anexo F)', () => {
  const layers = [
    L('g', 'cec-arena-grava', 50), L('x', 'cec-xps-co2', 100), L('b', 'cec-betun-lamina', 4),
    L('h', 'cec-ha-2300-2500', 250), L('e', 'cec-enlucido-yeso-1000-1300', 15)
  ];
  const base = calc('cubierta', {}, layers);
  it('ΔUr = p · f · 0,04 · (R1/RT)² y se suma a U', () => {
    const r = calc('cubierta', { invertedRoof: true, rainMmDay: 1.5, drainageFactor: '1' }, layers);
    const r1 = 0.1 / 0.039;
    const du = 1.5 * 1 * 0.04 * (r1 / base.totalResistance) ** 2;
    expect(r.special.deltaU).toBeCloseTo(du, 12);
    expect(r.uValue).toBeCloseTo(base.uValue + du, 12);
    expect(r.totalResistance).toBeCloseTo(base.totalResistance, 12);
  });
  it('factor de drenaje 0,5 reduce la corrección a la mitad', () => {
    const a = calc('cubierta', { invertedRoof: true, rainMmDay: 2, drainageFactor: '1' }, layers).special.deltaU;
    const b = calc('cubierta', { invertedRoof: true, rainMmDay: 2, drainageFactor: '0.5' }, layers).special.deltaU;
    expect(b).toBeCloseTo(a / 2, 12);
  });
  it('sin precipitación no calcula y sin activar no corrige', () => {
    expect(calc('cubierta', { invertedRoof: true }, layers).status).toBe('incomplete');
    expect(base.special).toBeNull();
  });
});
