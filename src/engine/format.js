/**
 * Formato de presentación con convenciones españolas (coma decimal).
 * Solo para mostrar: los valores internos y los del JSON se mantienen a precisión completa.
 */
const formatters = new Map();

function getFormatter(decimals) {
  if (!formatters.has(decimals)) {
    formatters.set(
      decimals,
      new Intl.NumberFormat('es-ES', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: false
      })
    );
  }
  return formatters.get(decimals);
}

export const EMPTY_VALUE = '—';

/** Devuelve el número con `decimals` decimales o «—» si no es finito. */
export function formatNumber(value, decimals = 2) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return EMPTY_VALUE;
  // Evita «-0,00»
  const rounded = Number(value.toFixed(decimals));
  return getFormatter(decimals).format(Object.is(rounded, -0) ? 0 : rounded);
}

/** Decimales con que se muestra U: los mismos que los valores límite del DB-HE. */
export const U_DECIMALS = 2;

/**
 * U para mostrar, con dos decimales. Si se compara con una referencia (límite u objetivo) y ambos
 * coinciden a dos decimales sin ser iguales, se añaden decimales (hasta cuatro) para que el veredicto
 * (calculado a precisión completa) no parezca contradictorio, p. ej. «0,491 > 0,49».
 */
export function formatU(value, reference) {
  let decimals = U_DECIMALS;
  if (typeof reference === 'number' && Number.isFinite(reference) && typeof value === 'number' && value !== reference) {
    while (decimals < 4 && formatNumber(value, decimals) === formatNumber(reference, decimals)) decimals += 1;
  }
  return formatNumber(value, decimals);
}

/** Número con unidad separada por espacio fino no separable. */
export function formatWithUnit(value, decimals, unit) {
  const text = formatNumber(value, decimals);
  return text === EMPTY_VALUE ? text : `${text} ${unit}`;
}

export const UNITS = {
  u: 'W/(m²·K)',
  r: 'm²·K/W',
  lambda: 'W/(m·K)',
  mm: 'mm'
};
