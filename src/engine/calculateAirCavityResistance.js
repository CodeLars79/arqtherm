import { isPositiveFinite, ok, fail } from './units.js';

/**
 * Resistencia térmica de una cámara de aire sin ventilar o ligeramente ventilada
 * según DA DB-HE/1 (enero 2020), tabla 2, con interpolación lineal.
 *
 * Las cámaras muy ventiladas no tienen resistencia propia: se tratan en calculateAssembly.
 *
 * @param {number} thicknessMm
 * @param {'vertical'|'horizontal'|null} orientation  orientación de la cámara
 *        (vertical = flujo horizontal; horizontal = flujo ascendente)
 * @param {'unventilated'|'slightly'} ventilation
 * @param {object} table  calculationData.unventilatedAirCavities
 */
export function calculateAirCavityResistance(thicknessMm, orientation, ventilation, table) {
  if (!isPositiveFinite(thicknessMm)) {
    return fail('thickness-invalid', 'El espesor de la cámara debe ser un número finito mayor que cero.');
  }
  if (orientation !== 'vertical' && orientation !== 'horizontal') {
    return fail(
      'cavity-orientation-unsupported',
      'La tabla 2 del DA DB-HE/1 no da valores para esta dirección del flujo de calor (p. ej., flujo descendente). La cámara no se puede calcular con este método.'
    );
  }
  if (ventilation !== 'unventilated' && ventilation !== 'slightly') {
    return fail('cavity-ventilation-invalid', 'Tipo de ventilación de cámara no válido para este cálculo.');
  }
  const points = [...table.points].sort((a, b) => a.thicknessMm - b.thicknessMm);
  const min = points[0].thicknessMm;
  const max = points[points.length - 1].thicknessMm;
  if (thicknessMm < min || thicknessMm > max) {
    return fail(
      'cavity-thickness-out-of-range',
      `La tabla 2 del DA DB-HE/1 cubre espesores de ${min} a ${max} mm. Fuera de ese rango debe usarse otro método contrastado (UNE-EN ISO 6946), no implementado.`
    );
  }

  let base = null;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (thicknessMm >= a.thicknessMm && thicknessMm <= b.thicknessMm) {
      const t = (thicknessMm - a.thicknessMm) / (b.thicknessMm - a.thicknessMm);
      base = a[orientation] + t * (b[orientation] - a[orientation]);
      break;
    }
  }
  if (base === null) {
    // Un único punto coincidente (tabla degenerada)
    const exact = points.find((p) => p.thicknessMm === thicknessMm);
    if (!exact) return fail('cavity-interpolation-failed', 'No se pudo interpolar la resistencia de la cámara.');
    base = exact[orientation];
  }

  const factor = ventilation === 'slightly' ? table.slightlyVentilatedFactor : 1;
  return ok(base * factor);
}
