import { ok, fail } from './units.js';

const isNonNegativeFinite = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/**
 * Resistencia térmica total de un componente de capas homogéneas.
 * RT = Rsi + ΣRi + Rse   (DA DB-HE/1, expresión 2)
 *
 * @param {number} rsi
 * @param {number[]} layerResistances  m²·K/W
 * @param {number} rse
 */
export function calculateTotalResistance(rsi, layerResistances, rse) {
  if (!isNonNegativeFinite(rsi) || !isNonNegativeFinite(rse)) {
    return fail('surface-resistance-invalid', 'Las resistencias superficiales no son válidas.');
  }
  if (!Array.isArray(layerResistances) || layerResistances.length === 0) {
    return fail('no-layers', 'El elemento no tiene capas que calcular.');
  }
  if (!layerResistances.every((r) => typeof r === 'number' && Number.isFinite(r) && r > 0)) {
    return fail('layer-resistance-invalid', 'Alguna resistencia de capa no es válida.');
  }
  const sum = layerResistances.reduce((acc, r) => acc + r, 0);
  return ok(rsi + sum + rse, { layersSum: sum });
}
