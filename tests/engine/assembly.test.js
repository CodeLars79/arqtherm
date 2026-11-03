import { describe, it, expect } from 'vitest';
import { calculateAssembly, calculateAirCavityResistance } from '../../src/engine/index.js';
import { buildMaterialsById, elementTypes, calculationData } from '../../src/data/index.js';

const user = (id, lambda) => ({
  id: `user-${id}`, name: id, category: 'other', thermalConductivity: lambda,
  unit: 'W/(m·K)', dataStatus: 'user'
});

const deps = (custom = []) => ({ materialsById: buildMaterialsById(custom), elementTypes, calculationData });
const layer = (id, materialId, thicknessMm, extra = {}) => ({ id, materialId, thicknessMm, lambda: null, lambdaOverride: false, ...extra });

describe('cámaras de aire (DA DB-HE/1, tabla 2)', () => {
  const table = calculationData.unventilatedAirCavities;
  it('valores tabulados exactos', () => {
    expect(calculateAirCavityResistance(10, 'vertical', 'unventilated', table).value).toBeCloseTo(0.15, 12);
    expect(calculateAirCavityResistance(20, 'vertical', 'unventilated', table).value).toBeCloseTo(0.17, 12);
    expect(calculateAirCavityResistance(50, 'vertical', 'unventilated', table).value).toBeCloseTo(0.18, 12);
    expect(calculateAirCavityResistance(20, 'horizontal', 'unventilated', table).value).toBeCloseTo(0.16, 12);
  });
  it('interpolación lineal: 30 mm vertical = 0,17 + (10/30)·0,01', () => {
    expect(calculateAirCavityResistance(30, 'vertical', 'unventilated', table).value)
      .toBeCloseTo(0.17 + (10 / 30) * 0.01, 12);
  });
  it('interpolación lineal: 15 mm horizontal = 0,155', () => {
    expect(calculateAirCavityResistance(15, 'horizontal', 'unventilated', table).value).toBeCloseTo(0.155, 12);
  });
  it('ligeramente ventilada: mitad del valor de la tabla (20 mm vertical → 0,085)', () => {
    expect(calculateAirCavityResistance(20, 'vertical', 'slightly', table).value).toBeCloseTo(0.085, 12);
  });
  it('fuera del rango tabulado o con flujo descendente no se calcula', () => {
    expect(calculateAirCavityResistance(5, 'vertical', 'unventilated', table).error.code).toBe('cavity-thickness-out-of-range');
    expect(calculateAirCavityResistance(80, 'vertical', 'unventilated', table).error.code).toBe('cavity-thickness-out-of-range');
    expect(calculateAirCavityResistance(20, null, 'unventilated', table).error.code).toBe('cavity-orientation-unsupported');
  });
});

describe('calculateAssembly', () => {
  it('elemento vacío: incompleto, sin U', () => {
    const r = calculateAssembly({ elementTypeId: 'fachada', layers: [] }, deps());
    expect(r.status).toBe('incomplete');
    expect(r.uValue).toBeNull();
    expect(r.totalResistance).toBeNull();
    expect(r.issues.some((i) => i.code === 'no-layers')).toBe(true);
  });

  it('fachada con materiales de usuario: U = 1 / (0,04 + 0,2/2,3 + 0,08/0,04 + 0,13)', () => {
    const custom = [user('hormigon', 2.3), user('aislante', 0.04)];
    const r = calculateAssembly({
      elementTypeId: 'fachada',
      layers: [layer('a', 'user-hormigon', 200), layer('b', 'user-aislante', 80)]
    }, deps(custom));
    const rt = 0.04 + 0.2 / 2.3 + 0.08 / 0.04 + 0.13;
    expect(r.status).toBe('complete');
    expect(r.rse).toBe(0.04);
    expect(r.rsi).toBe(0.13);
    expect(r.totalResistance).toBeCloseTo(rt, 12);
    expect(r.uValue).toBeCloseTo(1 / rt, 12);
    expect(r.totalThicknessMm).toBe(280);
    expect(r.dataQuality).toBe('user');
  });

  it('cubierta usa Rsi = 0,10 y suelo exterior Rsi = 0,17 (DA DB-HE/1, tabla 1)', () => {
    const custom = [user('x', 0.04)];
    const roof = calculateAssembly({ elementTypeId: 'cubierta', layers: [layer('a', 'user-x', 100)] }, deps(custom));
    expect(roof.uValue).toBeCloseTo(1 / (0.04 + 2.5 + 0.10), 12);
    const floor = calculateAssembly({ elementTypeId: 'suelo-exterior', layers: [layer('a', 'user-x', 100)] }, deps(custom));
    expect(floor.uValue).toBeCloseTo(1 / (0.04 + 2.5 + 0.17), 12);
  });

  it('medianería: resistencias superficiales interiores en ambas caras (0,13 + 0,13)', () => {
    const r = calculateAssembly({ elementTypeId: 'medianeria', layers: [layer('a', 'user-x', 100)] }, deps([user('x', 0.04)]));
    expect(r.rse).toBe(0.13);
    expect(r.uValue).toBeCloseTo(1 / (0.13 + 2.5 + 0.13), 12);
  });

  it('λ manual sobre una capa: se usa y la capa pasa a datos de usuario', () => {
    const r = calculateAssembly({
      elementTypeId: 'fachada',
      layers: [layer('a', 'cec-mw', 100, { lambda: 0.035, lambdaOverride: true })]
    }, deps());
    expect(r.layers[0].lambda).toBe(0.035);
    expect(r.layers[0].dataStatus).toBe('user');
    expect(r.uValue).toBeCloseTo(1 / (0.04 + 0.1 / 0.035 + 0.13), 12);
  });

  it('cámara muy ventilada: se desprecian cámara y capas exteriores, Rse = Rsi', () => {
    const custom = [user('aplacado', 1.0), user('aislante', 0.04)];
    const r = calculateAssembly({
      elementTypeId: 'fachada',
      layers: [
        layer('1', 'user-aplacado', 20),
        layer('2', 'air-very', 40),
        layer('3', 'user-aislante', 60),
        layer('4', 'cec-fab-lh-doble', 70),
        layer('5', 'cec-enlucido-yeso-1000-1300', 15)
      ]
    }, deps(custom));
    const rt = 0.13 + 0.06 / 0.04 + 0.16 + 0.015 / 0.57 + 0.13;
    expect(r.status).toBe('complete');
    expect(r.rse).toBe(0.13);
    expect(r.layers[0].included).toBe(false);
    expect(r.layers[1].included).toBe(false);
    expect(r.totalResistance).toBeCloseTo(rt, 12);
    expect(r.uValue).toBeCloseTo(1 / rt, 12);
    expect(r.totalThicknessMm).toBe(205);
    expect(r.dataQuality).toBe('user'); // material de usuario + datos CEC verificados
  });

  it('cámara sin ventilar en suelo (flujo descendente): no calculable', () => {
    const r = calculateAssembly({
      elementTypeId: 'suelo-exterior',
      layers: [layer('1', 'air-unventilated', 20), layer('2', 'user-x', 50)]
    }, deps([user('x', 0.04)]));
    expect(r.status).toBe('incomplete');
    expect(r.uValue).toBeNull();
  });

  it('una capa inválida impide el resultado (no se sustituyen datos en silencio)', () => {
    const r = calculateAssembly({
      elementTypeId: 'fachada',
      layers: [layer('1', 'cec-mw', 60), layer('2', 'cec-lp', null)]
    }, deps());
    expect(r.status).toBe('incomplete');
    expect(r.uValue).toBeNull();
    expect(r.layers[1].error).toMatch(/espesor/);
  });

  it('capa sin material ni λ manual: incompleto', () => {
    const r = calculateAssembly({ elementTypeId: 'fachada', layers: [layer('1', null, 50)] }, deps());
    expect(r.status).toBe('incomplete');
  });

  it('fábrica tabulada fuera de su rango de espesor: incompleto', () => {
    const r = calculateAssembly({ elementTypeId: 'fachada', layers: [layer('1', 'cec-fab-lh-doble', 115)] }, deps());
    expect(r.status).toBe('incomplete');
  });

  it('tipos de elemento no soportados devuelven estado «unsupported» sin U', () => {
    const r = calculateAssembly({ elementTypeId: 'hueco', layers: [layer('1', 'cec-mw', 60)] }, deps());
    expect(r.status).toBe('unsupported');
    expect(r.uValue).toBeNull();
  });

  it('elemento de ejemplo marcado como ilustrativo', () => {
    const r = calculateAssembly({
      elementTypeId: 'fachada', isExample: true,
      layers: [layer('1', 'user-x', 100)]
    }, deps([user('x', 0.04)]));
    expect(r.dataQuality).toBe('illustrative');
  });

  it('nunca produce NaN ni Infinity', () => {
    const r = calculateAssembly({
      elementTypeId: 'fachada',
      layers: [layer('1', 'user-x', 100, { lambda: 0, lambdaOverride: true })]
    }, deps([user('x', 0.04)]));
    expect(r.uValue).toBeNull();
    expect(r.totalResistance).toBeNull();
  });
});
