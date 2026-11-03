import { describe, it, expect } from 'vitest';
import { buildExport, exportFilename, EXPORT_FORMAT, SCHEMA_VERSION } from '../../src/utils/exportAssembly.js';
import { validateAssembly, validateCustomMaterial } from '../../src/utils/validateAssembly.js';
import { calculateAssembly, evaluateCompliance, evaluateOrientative } from '../../src/engine/index.js';
import {
  buildMaterialsById, elementTypes, calculationData, uValueLimits, cteMetadata, referenceMaterials
} from '../../src/data/index.js';

const custom = { id: 'user-abc', name: 'Aislante X (ficha técnica)', category: 'insulation', thermalConductivity: 0.032, unit: 'W/(m·K)', dataStatus: 'user', source: 'Ficha del fabricante' };
const assembly = {
  id: 'asm-1', name: 'Fachada prueba', elementTypeId: 'fachada', climateZone: 'D', contextId: null, isExample: false,
  layers: [
    { id: 'l1', materialId: 'cec-mortero-1800-2000', name: null, thicknessMm: 15, lambda: null, lambdaOverride: false },
    { id: 'l2', materialId: 'user-abc', name: null, thicknessMm: 80, lambda: null, lambdaOverride: false }
  ]
};
const materialsById = buildMaterialsById([custom]);
const calculation = calculateAssembly(assembly, { materialsById, elementTypes, calculationData });
const compliance = evaluateCompliance({ calculation, climateZone: 'D', limitsData: uValueLimits });
const orientative = evaluateOrientative({ calculation, climateZone: 'D', limitsData: uValueLimits });

describe('buildExport', () => {
  const data = buildExport({ assembly, calculation, compliance, orientative, materialsById, metadata: cteMetadata, now: new Date('2026-10-29T10:00:00Z') });

  it('incluye formato y versión de esquema', () => {
    expect(data.format).toBe(EXPORT_FORMAT);
    expect(data.format).toBe('arqtherm.assembly');
    expect(data.schemaVersion).toBe(SCHEMA_VERSION);
    expect(data.exportedAt).toBe('2026-10-29T10:00:00.000Z');
    expect(data.app.name).toBe('Arqtherm');
  });
  it('conserva fuentes y versión del conjunto de datos reglamentario', () => {
    expect(data.technical.regulatoryDataset.version).toBe(cteMetadata.datasetVersion);
    expect(data.technical.regulatoryDataset.documents.map((d) => d.id)).toContain('DB-HE');
    expect(data.technical.sources[0].reference).toMatch(/CEC v6\.3/);
    expect(data.technical.sources[0].dataStatus).toBe('reference-verified');
    expect(data.customMaterials).toEqual([custom]);
  });
  it('los materiales de usuario se copian, no se comparten por referencia', () => {
    data.customMaterials[0].thermalConductivity = 99;
    expect(custom.thermalConductivity).toBe(0.032);
  });
  it('incluye método, unidades, hipótesis, resultados y comprobaciones', () => {
    expect(data.technical.units.uValue).toBe('W/(m²·K)');
    expect(data.technical.method).toMatch(/DA DB-HE\/1/);
    expect(data.technical.assumptions.length).toBeGreaterThan(0);
    expect(data.technical.results.uValue).toBe(calculation.uValue);
    expect(data.technical.compliance.scopeNote).toMatch(/No acredita/);
    expect(data.technical.orientative.state).toBe('above');
    expect(data.technical.orientative.value).toBe(0.27);
    expect(data.technical.orientative.scopeNote).toMatch(/No es una exigencia/);
  });
  it('el elemento exportado pasa la validación', () => {
    expect(validateAssembly(data.assembly).valid).toBe(true);
  });
  it('nombre de archivo seguro', () => {
    expect(exportFilename('Fachada «tipo» Ñ/2')).toBe('fachada-tipo-n-2.arqtherm.json');
  });
});

describe('validateAssembly y validateCustomMaterial', () => {
  it('detecta identificadores de capa repetidos', () => {
    expect(validateAssembly({ ...assembly, layers: [assembly.layers[0], assembly.layers[0]] }).valid).toBe(false);
  });
  it('rechaza espesores no numéricos y tipos desconocidos', () => {
    const bad = { ...assembly, layers: [{ ...assembly.layers[0], thicknessMm: 'quince' }] };
    expect(validateAssembly(bad).valid).toBe(false);
    expect(validateAssembly({ ...assembly, elementTypeId: 'muro-cortina' }, { elementTypeIds: elementTypes.map((t) => t.id) }).valid).toBe(false);
  });
  it('material de usuario con λ no válida', () => {
    expect(validateCustomMaterial({ ...custom, thermalConductivity: -1 }).valid).toBe(false);
    expect(validateCustomMaterial(custom).valid).toBe(true);
  });
});

describe('integridad de los conjuntos de datos', () => {
  it('cada material de referencia tiene fuente y estado de datos', () => {
    for (const m of referenceMaterials) {
      expect(m.sourceId, m.id).toBeTruthy();
      expect(m.sourceRef, m.id).toBeTruthy();
      expect(['reference-verified', 'reference-pending-check', 'provisional']).toContain(m.dataStatus);
      const hasValue = m.airCavity || (m.thermalConductivity > 0) || (m.thermalResistance > 0);
      expect(hasValue, m.id).toBeTruthy();
    }
  });
  it('identificadores de material únicos', () => {
    const ids = referenceMaterials.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('las tablas indican referencia, URL, tipo y estado de validación', () => {
    for (const t of uValueLimits.tables) {
      expect(t.reference).toBeTruthy();
      expect(t.verifiedAgainst).toMatch(/^https:\/\/www\.codigotecnico\.org/);
      expect(t.validationStatus).toBe('verified');
      expect(['limit', 'orientative']).toContain(t.kind);
    }
  });
});
