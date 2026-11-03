import { isPositiveFinite } from './units.js';

/**
 * Espesor total del elemento en milímetros.
 * Devuelve null si alguna capa no tiene un espesor válido (no se suman valores parciales en silencio).
 * @param {Array<number|null>} thicknessesMm
 */
export function calculateTotalThickness(thicknessesMm) {
  if (!Array.isArray(thicknessesMm) || thicknessesMm.length === 0) return null;
  if (!thicknessesMm.every(isPositiveFinite)) return null;
  return thicknessesMm.reduce((acc, t) => acc + t, 0);
}
