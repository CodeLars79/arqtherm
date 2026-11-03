import { describe, it, expect } from 'vitest';
import { TEMPLATES, assemblyFromTemplate } from '../../src/data/templates.js';
import { encodeAssembly, decodeAssembly, buildShareUrl } from '../../src/utils/shareLink.js';
import { calculateAssembly } from '../../src/engine/index.js';
import { buildMaterialsById, calculationData, elementTypes } from '../../src/data/index.js';
import { createExampleAssembly } from '../../src/data/exampleAssembly.js';

const materialsById = buildMaterialsById([]);
const deps = { materialsById, calculationData, elementTypes };
const ids = elementTypes.map((e) => e.id);

describe('templates', () => {
  for (const t of TEMPLATES) {
    it(`«${t.name}» calcula un U completo (con λ en las capas sin material)`, () => {
      const a = assemblyFromTemplate(t, { climateZone: 'C' });
      const pending = a.layers.filter((l) => !l.materialId);
      if (pending.length) {
        const before = calculateAssembly(a, deps);
        expect(before.status).toBe('incomplete');
        expect(before.issues.every((i) => i.code === 'layer-invalid' && pending.some((l) => l.id === i.layerId))).toBe(true);
        // Simula que el usuario introduce λ del fabricante.
        a.layers = a.layers.map((l) => (l.materialId ? l : { ...l, lambda: 0.3, lambdaOverride: true }));
      }
      const r = calculateAssembly(a, deps);
      expect(r.status, r.issues.map((i) => i.message).join(' ')).toBe('complete');
      expect(r.uValue).toBeGreaterThan(0.1);
      expect(r.uValue).toBeLessThan(1.2);
      expect(a.climateZone).toBe('C');
    });
  }
});

describe('share links', () => {
  it('round-trips an element with params, site and μ overrides', () => {
    const a = { ...assemblyFromTemplate(TEMPLATES.find((t) => t.id === 'solera-perimetral'), { climateZone: 'D', site: { ineCode: '28', altitudeM: 700 } }), name: 'Prueba ñ «€»' };
    a.layers[0].mu = 1.2;
    const code = encodeAssembly(a, materialsById);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    const d = decodeAssembly(code, { elementTypeIds: ids, materialsById });
    expect(d.ok).toBe(true);
    expect(d.assembly.name).toBe('Prueba ñ «€»');
    expect(d.assembly.params).toEqual(a.params);
    expect(d.assembly.site).toEqual(a.site);
    expect(d.assembly.layers.map((l) => [l.materialId, l.thicknessMm])).toEqual(a.layers.map((l) => [l.materialId, l.thicknessMm]));
    expect(d.assembly.layers[0].mu).toBe(1.2);
    expect(calculateAssembly(d.assembly, deps).uValue).toBeCloseTo(calculateAssembly(a, deps).uValue, 12);
  });
  it('carries custom materials and λ overrides', () => {
    const custom = { id: 'user-x', name: 'Panel X', category: 'insulation', thermalConductivity: 0.022, dataStatus: 'user', unit: 'W/(m·K)' };
    const all = { ...materialsById, [custom.id]: custom };
    const a = { ...createExampleAssembly(), layers: [
      { id: 'a', materialId: 'user-x', thicknessMm: 60, lambda: null, lambdaOverride: false, name: null },
      { id: 'b', materialId: 'cec-lp', thicknessMm: 115, lambda: 0.4, lambdaOverride: true, name: 'LP propio' }
    ] };
    const d = decodeAssembly(encodeAssembly(a, all), { elementTypeIds: ids, materialsById });
    expect(d.ok).toBe(true);
    expect(d.customMaterials[0].id).toBe('user-x');
    expect(d.assembly.layers[1]).toMatchObject({ lambda: 0.4, lambdaOverride: true, name: 'LP propio' });
  });
  it('rejects damaged, unknown or oversized links', () => {
    expect(decodeAssembly('%%%').ok).toBe(false);
    expect(decodeAssembly('').ok).toBe(false);
    const bad = Buffer.from(JSON.stringify({ v: 1, n: 'x', t: 'fachada', l: [['nope', 10, null, null, null]] })).toString('base64url');
    expect(decodeAssembly(bad, { elementTypeIds: ids, materialsById }).ok).toBe(false);
    expect(decodeAssembly('a'.repeat(20000)).ok).toBe(false);
  });
  it('builds URLs for the public site, path routing and hash routing', () => {
    expect(buildShareUrl('abc', { siteUrl: 'https://www.arqtherm.com/' })).toBe('https://www.arqtherm.com/calculadora?e=abc');
    expect(buildShareUrl('abc', { origin: 'http://x' })).toBe('http://x/calculadora?e=abc');
    expect(buildShareUrl('abc', { origin: 'http://x', useHash: true, pathname: '/app/' })).toBe('http://x/app/#/calculadora?e=abc');
  });
});

describe('fachadas solicitadas', () => {
  it('SATE con trasdosado: capas en el orden indicado', () => {
    const t = TEMPLATES.find((x) => x.id === 'sate-trasdosado');
    expect(t.layers).toEqual([['cec-mortero-1800-2000', 5], ['cec-mw', 50], ['cec-mortero-1800-2000', 10], ['cec-fab-lp-medio-40-60', 115], ['cec-mw', 40], ['cec-pyl', 12.5], ['cec-pyl', 12.5]]);
  });
  it('fachada ventilada: el aplacado y la cámara no computan', () => {
    const a = assemblyFromTemplate(TEMPLATES.find((x) => x.id === 'ventilada-piedra'));
    const r = calculateAssembly(a, deps);
    expect(r.layers.filter((l) => !l.included).length).toBe(2);
    expect(r.rse).toBe(r.rsi);
  });
  it('seis plantillas de fachada', () => {
    expect(TEMPLATES.filter((t) => t.group === 'Fachadas').map((t) => t.id)).toEqual(['sate-trasdosado', 'ventilada-piedra', 'aplacada-gres', 'fabrica-camara', 'trasdosado-pyl', 'sistema-ligero']);
  });
});

describe('fachada de sistema ligero', () => {
  it('usa la placa de cemento y calcula U directamente', () => {
    const t = TEMPLATES.find((x) => x.id === 'sistema-ligero');
    expect(t.layers.map(([id, d]) => [id, d])).toEqual([['cec-mortero-1800-2000', 5], ['placa-cemento', 12.5], ['lamina-impermeable-transpirable', 0.5], ['cec-mw', 100], ['cec-mw', 40], ['cec-mw', 40], ['cec-hdpe', 0.2], ['cec-pyl', 12.5], ['cec-pyl', 12.5]]);
    const r = calculateAssembly(assemblyFromTemplate(t), deps);
    const rt = 0.13 + 0.005 / 1.3 + 0.0125 / 0.35 + 0.0005 / 0.5 + 0.18 / 0.036 + 0.0002 / 0.5 + 0.025 / 0.25 + 0.04;
    expect(r.uValue).toBeCloseTo(1 / rt, 10);
  });
});

describe('fachada de sistema ligero con barrera de vapor', () => {
  it('con la lámina transpirable (Sd = 0,02 m) no condensa en Madrid, Barcelona ni Burgos', async () => {
    const { evaluateCondensation } = await import('../../src/engine/index.js');
    const { climateZonesData } = await import('../../src/data/index.js');
    const a = assemblyFromTemplate(TEMPLATES.find((x) => x.id === 'sistema-ligero'), { climateZone: 'D' });
    const calculation = calculateAssembly(a, deps);
    expect(materialsById['lamina-impermeable-transpirable'].properties.mu * 0.0005).toBeCloseTo(0.02, 12);
    for (const code of ['28', '08', '09']) {
      const cap = climateZonesData.provinces.find((p) => p.ineCode === code).capitalReferenceAltitudeM;
      const r = evaluateCondensation({ calculation, assembly: a, materialsById, climateZone: 'D', hygrometryClass: '3', ineCode: code, altitudeM: null, capitalAltitudeM: cap, data: calculationData.condensation });
      expect(r.interstitial.state, code).toBe('ok');
    }
  });
});

describe('barreras de vapor en trasdosados', () => {
  for (const id of ['aplacada-gres', 'trasdosado-pyl', 'sistema-ligero']) {
    it(`«${id}» lleva la barrera de vapor justo antes de la placa de yeso`, () => {
      const ids = TEMPLATES.find((t) => t.id === id).layers.map(([m]) => m);
      const i = ids.indexOf('cec-hdpe');
      expect(i).toBeGreaterThan(0);
      expect(ids[i - 1]).toBe('cec-mw');
      expect(ids[i + 1]).toBe('cec-pyl');
    });
  }
});

describe('barreras de vapor añadidas (fábrica con cámara, cubierta plana, cubierta de teja)', () => {
  it('la barrera está en la cara caliente; fábrica con cámara y cubierta de teja no condensan', async () => {
    const { evaluateCondensation } = await import('../../src/engine/index.js');
    const { climateZonesData } = await import('../../src/data/index.js');
    for (const id of ['fabrica-camara', 'cubierta-teja']) {
      const t = TEMPLATES.find((x) => x.id === id);
      const ids = t.layers.map(([m]) => m);
      const i = ids.indexOf('cec-hdpe');
      expect(ids[i - 1], id).toBe('cec-mw');
      const a = assemblyFromTemplate(t, { climateZone: 'D' });
      const calculation = calculateAssembly(a, deps);
      for (const code of ['28', '08', '09']) {
        const cap = climateZonesData.provinces.find((p) => p.ineCode === code).capitalReferenceAltitudeM;
        const r = evaluateCondensation({ calculation, assembly: a, materialsById, climateZone: 'D', hygrometryClass: '3', ineCode: code, altitudeM: null, capitalAltitudeM: cap, data: calculationData.condensation });
        expect(r.interstitial.state, `${id} ${code}`).toBe('ok');
      }
    }
  });
});

describe('cubierta plana invertida', () => {
  it('no condensa en ninguna de las 52 capitales, ni con μ del XPS = 100 ni con 220', async () => {
    const { evaluateCondensation } = await import('../../src/engine/index.js');
    const { climateZonesData } = await import('../../src/data/index.js');
    const t = TEMPLATES.find((x) => x.id === 'cubierta-invertida');
    expect(t.layers.map(([m]) => m).indexOf('cec-xps-co2')).toBeLessThan(t.layers.map(([m]) => m).indexOf('cec-betun-lamina'));
    for (const mu of [100, 220]) {
      const a = assemblyFromTemplate(t, { climateZone: 'E' });
      a.layers[1].mu = mu;
      const calculation = calculateAssembly(a, deps);
      for (const p of climateZonesData.provinces) {
        const r = evaluateCondensation({ calculation, assembly: a, materialsById, climateZone: 'E', hygrometryClass: '3', ineCode: p.ineCode, altitudeM: null, capitalAltitudeM: p.capitalReferenceAltitudeM, data: calculationData.condensation });
        expect(r.interstitial.state, `${p.name} μ=${mu}`).toBe('ok');
      }
    }
  });
});
