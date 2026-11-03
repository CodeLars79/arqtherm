/**
 * Exportación de un elemento a JSON intercambiable (esquema documentado en docs/schema.md).
 */

export const EXPORT_FORMAT = 'arqtherm.assembly';
export const SCHEMA_VERSION = 1;
export const APP_VERSION = '0.1.0';

/** Construye el objeto de exportación (sin serializar). */
export function buildExport({ assembly, calculation, compliance, orientative = null, condensation = null, materialsById, metadata, now = new Date() }) {
  const usedMaterialIds = [...new Set(assembly.layers.map((l) => l.materialId).filter(Boolean))];
  const usedMaterials = usedMaterialIds.map((id) => materialsById[id]).filter(Boolean);
  const customMaterials = usedMaterials
    .filter((m) => m.dataStatus === 'user')
    .map((m) => JSON.parse(JSON.stringify(m)));

  const sources = usedMaterials
    .filter((m) => m.dataStatus !== 'user')
    .map((m) => ({ materialId: m.id, name: m.name, reference: m.sourceRef, dataStatus: m.dataStatus, valueType: m.valueType }));

  const technical = {
    method: calculation?.method ?? null,
    calculationMethod: calculation?.calculationMethod ?? 'layers',
    formulas: ['R = d / λ', 'RT = Rsi + ΣRi + Rse', 'U = 1 / RT'],
    tabulatedProcedure: calculation?.special
      ? {
          title: calculation.special.title,
          inputs: calculation.special.inputs ?? [],
          steps: calculation.special.steps,
          notes: calculation.special.notes ?? [],
          reference: calculation.special.table?.reference ?? null,
          up: calculation.special.up ?? null,
          b: calculation.special.b ?? null
        }
      : null,
    units: { thickness: 'mm', lambda: 'W/(m·K)', resistance: 'm²·K/W', uValue: 'W/(m²·K)' },
    layerOrder: 'exterior-to-interior',
    status: calculation?.status ?? 'incomplete',
    dataQuality: calculation?.dataQuality ?? null,
    results: calculation
      ? {
          rsi: calculation.rsi,
          rse: calculation.rse,
          layersSum: calculation.layersSum,
          totalResistance: calculation.totalResistance,
          uValue: calculation.uValue,
          totalThicknessMm: calculation.totalThicknessMm,
          layers: calculation.layers.map((l) => ({
            id: l.id,
            name: l.name,
            thicknessMm: l.thicknessMm,
            lambda: l.lambda,
            resistance: l.resistance,
            included: l.included,
            dataStatus: l.dataStatus
          }))
        }
      : null,
    compliance: compliance
      ? {
          state: compliance.state,
          limit: compliance.limit ?? null,
          reference: compliance.lookup?.ok ? compliance.lookup.table.reference : null,
          row: compliance.lookup?.ok ? compliance.lookup.row.label : null,
          reasons: compliance.reasons,
          scopeNote: 'Comparación de la transmitancia de un elemento con su valor límite. No acredita el cumplimiento del CTE por el edificio.'
        }
      : null,
    orientative: orientative
      ? {
          state: orientative.state,
          value: orientative.value ?? null,
          reference: orientative.lookup?.ok ? orientative.lookup.table.reference : null,
          row: orientative.lookup?.ok ? orientative.lookup.row.label : null,
          reasons: orientative.reasons,
          scopeNote: 'Valor orientativo del Anejo E (predimensionado en uso residencial privado). No es una exigencia del CTE.'
        }
      : null,
    condensation: condensation?.applicable
      ? {
          reference: 'DA DB-HE/2 (octubre 2013)',
          surface: condensation.surface ? { state: condensation.surface.state, fRsi: condensation.surface.fRsi, fRsiMin: condensation.surface.fRsiMin, hygrometryClass: condensation.surface.hygrometryClass?.id } : null,
          interstitial: condensation.interstitial
            ? {
                state: condensation.interstitial.state,
                reason: condensation.interstitial.reason ?? null,
                exterior: condensation.interstitial.exterior ?? null,
                points: (condensation.interstitial.points ?? []).map((pt) => ({ label: pt.label, xMm: pt.xMm, theta: pt.theta, p: pt.p, psat: pt.psat, condensation: pt.condensation }))
              }
            : null
        }
      : null,
    assumptions: calculation?.assumptions ?? [],
    sources,
    regulatoryDataset: {
      id: metadata.datasetId,
      version: metadata.datasetVersion,
      verifiedOn: metadata.verifiedOn,
      documents: Object.values(metadata.documents).map((d) => ({ id: d.id, revision: d.revision, url: d.sourceUrl }))
    }
  };

  return {
    format: EXPORT_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    app: { name: 'Arqtherm', version: APP_VERSION },
    assembly: {
      id: assembly.id,
      name: assembly.name,
      elementTypeId: assembly.elementTypeId,
      climateZone: assembly.climateZone ?? null,
      contextId: assembly.contextId ?? null,
      params: assembly.params ? { ...assembly.params } : null,
      site: assembly.site ? { ...assembly.site } : null,
      isExample: Boolean(assembly.isExample),
      layers: assembly.layers.map((l) => ({
        id: l.id,
        materialId: l.materialId ?? null,
        name: l.name ?? null,
        thicknessMm: l.thicknessMm ?? null,
        lambda: l.lambdaOverride ? l.lambda ?? null : null,
        lambdaOverride: Boolean(l.lambdaOverride)
      }))
    },
    customMaterials,
    technical
  };
}

/** Nombre de archivo seguro a partir del nombre del elemento. */
export function exportFilename(name) {
  const slug = (name || 'elemento')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'elemento'}.arqtherm.json`;
}
