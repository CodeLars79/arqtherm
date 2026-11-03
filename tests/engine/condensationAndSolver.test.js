import { describe, it, expect } from 'vitest';
import {
  calculateAssembly, evaluateCondensation, saturationPressure, surfaceTemperatureFactor, januaryExterior,
  solveInsulationThickness, commercialThickness
} from '../../src/engine/index.js';
import { buildMaterialsById, calculationData, elementTypes, climateZonesData } from '../../src/data/index.js';
import { createExampleAssembly } from '../../src/data/exampleAssembly.js';

const materialsById = buildMaterialsById([]);
const deps = { materialsById, calculationData, elementTypes };
const DATA = calculationData.condensation;
const capAlt = (code) => climateZonesData.provinces.find((p) => p.ineCode === code).capitalReferenceAltitudeM;
const run = (assembly, extra = {}) => {
  const calculation = calculateAssembly(assembly, deps);
  return evaluateCondensation({
    calculation, assembly, materialsById, climateZone: 'D', hygrometryClass: '3', ineCode: '28', altitudeM: null,
    capitalAltitudeM: capAlt('28'), data: DATA, ...extra
  });
};

describe('psychrometrics (DA DB-HE/2)', () => {
  it('saturation pressure matches reference points', () => {
    expect(saturationPressure(20)).toBeCloseTo(2337, 0);
    expect(saturationPressure(0)).toBeCloseTo(610.5, 6);
    expect(saturationPressure(-5)).toBeCloseTo(401, -1); // ISO 13788: 401 Pa
  });
  it('fRsi = 1 − 0,25·U', () => {
    expect(surfaceTemperatureFactor(0.4)).toBeCloseTo(0.9, 12);
  });
  it('January climate covers every province and corrects for altitude', () => {
    for (const p of climateZonesData.provinces) expect(DATA.januaryClimate.byIneCode[p.ineCode], p.name).toBeDefined();
    const madrid = januaryExterior({ ineCode: '28', altitudeM: 889, capitalAltitudeM: 589 }, DATA);
    expect(madrid.thetaE).toBeCloseTo(6.2 - 3, 10);
    expect(madrid.pe).toBeCloseTo(0.71 * saturationPressure(6.2), 8); // misma humedad absoluta
    expect(januaryExterior({ ineCode: '28', altitudeM: 100, capitalAltitudeM: 589 }, DATA).thetaE).toBe(6.2);
  });
});

describe('evaluateCondensation', () => {
  it('example façade: no surface or interstitial condensation in Barcelona', () => {
    const r = run(createExampleAssembly(), { ineCode: '08', capitalAltitudeM: capAlt('08') });
    expect(r.applicable).toBe(true);
    expect(r.surface.state).toBe('ok');
    expect(r.surface.fRsiMin).toBe(0.61);
    expect(r.interstitial.state).toBe('ok');
    const pts = r.interstitial.points;
    expect(pts[0].p).toBeCloseTo(r.interstitial.pe, 8);
    expect(pts[pts.length - 1].p).toBeCloseTo(r.interstitial.pi, 8);
    expect(pts[pts.length - 1].theta).toBeCloseTo(r.interstitial.thetaSi, 8);
  });
  it('a vapour-tight outer layer with open insulation inside condenses', () => {
    const a = {
      ...createExampleAssembly(), isExample: false,
      layers: [
        { id: 'a', materialId: 'cec-betun-lamina', thicknessMm: 4, lambda: null, lambdaOverride: false, name: null },
        { id: 'b', materialId: 'cec-mw', thicknessMm: 100, lambda: null, lambdaOverride: false, name: null },
        { id: 'c', materialId: 'cec-pyl', thicknessMm: 15, lambda: null, lambdaOverride: false, name: null }
      ]
    };
    const r = run(a, { ineCode: '09', capitalAltitudeM: capAlt('09'), climateZone: 'E' });
    expect(r.interstitial.state).toBe('fail');
    expect(r.interstitial.condensationAt.length).toBeGreaterThan(0);
  });
  it('asks for μ when a material has none, and accepts a per-layer value', () => {
    const a = { ...createExampleAssembly(), layers: [
      { id: 'a', materialId: 'cec-eps', thicknessMm: 80, lambda: null, lambdaOverride: false, name: null },
      { id: 'b', materialId: 'cec-lp', thicknessMm: 115, lambda: null, lambdaOverride: false, name: null }
    ] };
    expect(run(a).interstitial.state).toBe('unavailable');
    a.layers[0].mu = 60;
    expect(run(a).interstitial.state).not.toBe('unavailable');
  });
  it('is not applicable to ground or partition elements', () => {
    const a = { ...createExampleAssembly(), elementTypeId: 'medianeria' };
    expect(run(a).applicable).toBe(false);
  });
});

describe('solveInsulationThickness', () => {
  it('rounds to commercial thicknesses', () => {
    expect(commercialThickness(41)).toBe(50);
    expect(commercialThickness(50)).toBe(50);
    expect(commercialThickness(92.9)).toBe(100);
    expect(commercialThickness(101)).toBe(120);
  });
  it('finds the minimum mineral-wool thickness for the Anejo E value in zone C', () => {
    const a = createExampleAssembly();
    const mw = a.layers[2];
    const r = solveInsulationThickness({ assembly: a, layerId: mw.id, targetU: 0.29, deps });
    expect(r.ok).toBe(true);
    const at = (mm) => calculateAssembly({ ...a, layers: a.layers.map((l) => (l.id === mw.id ? { ...l, thicknessMm: mm } : l)) }, deps).uValue;
    expect(at(r.exactMm)).toBeLessThanOrEqual(0.29 + 1e-9);
    expect(at(r.exactMm - 0.5)).toBeGreaterThan(0.29);
    expect(r.roundedMm).toBe(100);
    expect(r.uAtRounded).toBeLessThanOrEqual(0.29);
  });
  it('works with tabulated ground procedures', () => {
    const a = { ...createExampleAssembly(), elementTypeId: 'muro-terreno', params: { depthM: 2 }, layers: [
      { id: 'i', materialId: 'cec-mw', thicknessMm: 10, lambda: null, lambdaOverride: false, name: null },
      { id: 'w', materialId: 'cec-ha-2300-2500', thicknessMm: 300, lambda: null, lambdaOverride: false, name: null }
    ] };
    const r = solveInsulationThickness({ assembly: a, layerId: 'i', targetU: 0.48, deps });
    expect(r.ok).toBe(true);
    expect(r.uAtRounded).toBeLessThanOrEqual(0.48);
  });
  it('reports unreachable targets and invalid layers', () => {
    const a = createExampleAssembly();
    expect(solveInsulationThickness({ assembly: a, layerId: a.layers[2].id, targetU: 0.01, deps }).ok).toBe(false);
    expect(solveInsulationThickness({ assembly: a, layerId: a.layers[3].id, targetU: 0.3, deps }).ok).toBe(false);
  });
});

describe('vapour-tight materials (μ = ∞ in the CEC)', () => {
  it('an aluminium sheet outside makes the vapour pressure jump at that layer', () => {
    const a = { ...createExampleAssembly(), isExample: false, layers: [
      { id: 'al', materialId: 'cec-aluminio', thicknessMm: 1, lambda: null, lambdaOverride: false, name: null },
      { id: 'mw', materialId: 'cec-mw', thicknessMm: 100, lambda: null, lambdaOverride: false, name: null },
      { id: 'py', materialId: 'cec-pyl', thicknessMm: 15, lambda: null, lambdaOverride: false, name: null }
    ] };
    const r = run(a);
    expect(r.interstitial.state).toBe('fail');
    expect(r.interstitial.layers[0].muSource).toBe('infinite');
    const pts = r.interstitial.points;
    expect(pts[1].p).toBeCloseTo(r.interstitial.pi, 3); // toda la caída de presión en la chapa
  });
});
