import { isPositiveFinite, ok, fail } from './units.js';

/**
 * Transmitancia térmica U = 1 / RT   (DA DB-HE/1, expresión 1)
 * @param {number} totalResistance  RT en m²·K/W
 * @returns resultado con value en W/(m²·K)
 */
export function calculateUValue(totalResistance) {
  if (!isPositiveFinite(totalResistance)) {
    return fail('total-resistance-invalid', 'La resistencia térmica total debe ser un número finito mayor que cero.');
  }
  return ok(1 / totalResistance);
}
