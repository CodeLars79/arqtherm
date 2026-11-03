import { describe, it, expect } from 'vitest';
import { referenceMaterials, calculationData } from '../../src/data/index.js';

describe('verificación con documentos oficiales', () => {
  it('todos los materiales del CEC están cotejados, con página del PDF', () => {
    const cec = referenceMaterials.filter((m) => m.sourceId === 'CEC-6.3');
    expect(cec.length).toBe(72);
    for (const m of cec) {
      expect(m.dataStatus, m.id).toBe('reference-verified');
      expect(m.verification.document).toBe('CEC v6.3 (marzo 2010)');
      expect(m.verification.page, m.id).toBeGreaterThanOrEqual(14);
      expect(m.verification.page, m.id).toBeLessThanOrEqual(27);
    }
  });
  it('fábricas del CEC 3.17.1 y 3.17.3 (pág. 26–27)', () => {
    const r = Object.fromEntries(referenceMaterials.map((m) => [m.id, m.thermalResistance]));
    expect([r['cec-fab-lp-medio-40-60'], r['cec-fab-lp-medio-60-80'], r['cec-fab-lp-medio-80-100']]).toEqual([0.18, 0.21, 0.23]);
    expect([r['cec-fab-lp-pie-40-60'], r['cec-fab-lp-pie-60-80'], r['cec-fab-lp-pie-80-100']]).toEqual([0.35, 0.41, 0.47]);
    expect([r['cec-fab-lm-medio'], r['cec-fab-lm-pie']]).toEqual([0.12, 0.17]);
    expect([r['cec-fab-gf-sencillo'], r['cec-fab-gf-doble'], r['cec-fab-gf-triple']]).toEqual([0.18, 0.33, 0.48]);
    expect([r['cec-fab-bc-ais-140'], r['cec-fab-bc-ais-190'], r['cec-fab-bc-ais-240'], r['cec-fab-bc-ais-290']]).toEqual([0.44, 0.63, 0.81, 0.98]);
  });
  it('μ = ∞ y rangos de μ del CEC', () => {
    const byId = Object.fromEntries(referenceMaterials.map((m) => [m.id, m]));
    for (const id of ['cec-acero', 'cec-aluminio', 'cec-vidrio', 'cec-azulejo', 'cec-cg']) expect(byId[id].properties.muInfinite, id).toBe(true);
    expect(byId['cec-eps'].properties.muRange).toEqual([20, 100]);
    expect(byId['cec-xps-co2'].properties.muRange).toEqual([100, 220]);
  });
  it('tablas 3 a 9 del DA DB-HE/1 cotejadas con su página', () => {
    const T = calculationData.groundAndUnheated.tables;
    expect(Object.fromEntries(Object.entries(T).map(([k, t]) => [k, [t.validationStatus, t.page]]))).toEqual({
      T3: ['verified', 6], T4: ['verified', 7], T5: ['verified', 8], T7: ['verified', 10], T8: ['verified', 11], T9: ['verified', 12]
    });
  });
});

describe('DA DB-HE/2 cotejado', () => {
  it('tabla 1 y tabla C.1 con 12 meses por capital', () => {
    const c = calculationData.condensation;
    expect(c.validationStatus).toBe('verified');
    expect(c.fRsiMin.values['3']).toEqual({ alpha: 0.42, A: 0.5, B: 0.52, C: 0.56, D: 0.61, E: 0.64 });
    const all = Object.values(c.januaryClimate.byIneCode);
    expect(all).toHaveLength(52);
    for (const v of all) {
      expect(v.monthly.thetaE).toHaveLength(12);
      expect(v.monthly.thetaE[0]).toBe(v.thetaE);
      expect(v.monthly.phiE[0]).toBe(v.phiE);
    }
    const madrid = c.januaryClimate.byIneCode['28'].monthly;
    expect(madrid.thetaE[6]).toBe(24.4); // julio
    expect(madrid.phiE[6]).toBe(0.37);
  });
});

describe('Anejo B y plantillas con barrera de vapor', async () => {
  const climateZones = (await import('../../src/data/cte/climateZones.json')).default;
  it('tabla a-Anejo B cotejada (pág. 46)', () => {
    expect(climateZones.status).toBe('reference-verified');
    expect(climateZones.verification.page).toBe(46);
  });
});
