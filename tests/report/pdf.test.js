import { describe, it, expect } from 'vitest';
import { buildReportPdf, reportFilename } from '../../src/report/generatePdf.js';
import { temperatureProfile } from '../../src/report/temperatureProfile.js';
import { calculateAssembly, evaluateCompliance, evaluateOrientative } from '../../src/engine/index.js';
import { buildMaterialsById, elementTypes, calculationData, uValueLimits, cteMetadata } from '../../src/data/index.js';
import { createExampleAssembly } from '../../src/data/exampleAssembly.js';

const materialsById = buildMaterialsById();
const build = (assembly) => {
  const calculation = calculateAssembly(assembly, { materialsById, elementTypes, calculationData });
  const compliance = evaluateCompliance({ calculation, climateZone: assembly.climateZone, contextId: assembly.contextId, limitsData: uValueLimits });
  const orientative = evaluateOrientative({ calculation, climateZone: assembly.climateZone, limitsData: uValueLimits });
  return { assembly, calculation, compliance, orientative, materialsById, metadata: cteMetadata, now: new Date('2026-10-29T10:00:00Z') };
};

describe('temperatureProfile', () => {
  it('reparte ΔT en proporción a R/RT y cierra en θi', () => {
    const { calculation } = build(createExampleAssembly());
    const p = temperatureProfile(calculation, 20, 0);
    const rt = calculation.totalResistance;
    expect(p.thetaSe).toBeCloseTo(20 * calculation.rse / rt, 12);
    expect(p.thetaSi + 20 * calculation.rsi / rt).toBeCloseTo(20, 12);
    expect(p.interfaces.length).toBe(calculation.layers.length + 1);
  });
  it('sin cálculo completo no hay perfil', () => {
    expect(temperatureProfile({ status: 'incomplete' })).toBeNull();
  });
});

describe('buildReportPdf', () => {
  it('genera un PDF de al menos dos páginas para el ejemplo', () => {
    const doc = buildReportPdf(build(createExampleAssembly()));
    const bytes = doc.output('arraybuffer');
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
  });
  it('también con un elemento incompleto (sin gráficos)', () => {
    const doc = buildReportPdf(build({ ...createExampleAssembly(), layers: [] }));
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
  });
  it('nombre de archivo seguro', () => {
    expect(reportFilename('Fachada «tipo» Ñ/2')).toBe('arqtherm-fachada-tipo-n-2.pdf');
  });
});

describe('buildReportPdf · terreno y espacios no habitables', () => {
  const base = createExampleAssembly();
  const cases = [
    ['suelo-terreno', { areaM2: 100, perimeterM: 40, depthM: 0, insulation: 'full' }],
    ['muro-terreno', { depthM: 2.5 }],
    ['suelo-camara-sanitaria', { areaM2: 100, perimeterM: 40, crawlConditionsMet: true }],
    ['cubierta-enterrada', { soilThicknessMm: 500 }],
    ['no-habitable', { flow: 'horizontal', partitionAreaM2: 20, envelopeAreaM2: 30, airtightness: 4, insulationCase: 'nhe-no_hnh-yes' }]
  ];
  for (const [elementTypeId, params] of cases) {
    it(`genera el informe para ${elementTypeId}`, () => {
      const layers = base.layers.filter((l) => l.materialId !== 'air-unventilated');
      const input = build({ ...base, layers, isExample: false, elementTypeId, params });
      expect(input.calculation.status).toBe('complete');
      const doc = buildReportPdf(input);
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
    });
  }
});

describe('buildReportPdf · condensaciones', () => {
  it('incluye la sección del DA DB-HE/2 con diagrama de Glaser', async () => {
    const { evaluateCondensation } = await import('../../src/engine/index.js');
    const input = build(createExampleAssembly());
    const condensation = evaluateCondensation({
      calculation: input.calculation, assembly: input.assembly, materialsById, climateZone: 'C', hygrometryClass: '3',
      ineCode: '08', altitudeM: null, capitalAltitudeM: 1, data: calculationData.condensation
    });
    expect(condensation.interstitial.state).toBe('ok');
    const doc = buildReportPdf({ ...input, condensation });
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
  });
});
