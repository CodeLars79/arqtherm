/**
 * Utilidades de unidades y validación numérica.
 * Todo el motor trabaja internamente en unidades SI y a precisión completa.
 */

/** Convierte milímetros a metros. */
export function mmToM(mm) {
  return mm / 1000;
}

/** Devuelve true si el valor es un número finito estrictamente positivo. */
export function isPositiveFinite(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * Interpreta una entrada numérica de formulario.
 * Acepta números o cadenas con coma o punto decimal. Devuelve null si no es interpretable.
 * No sustituye valores ausentes por valores arbitrarios.
 */
export function parseNumericInput(input) {
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (trimmed === '') return null;
  const normalised = trimmed.replace(',', '.');
  if (!/^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(normalised)) return null;
  const value = Number(normalised);
  return Number.isFinite(value) ? value : null;
}

/** Resultado correcto. */
export function ok(value, extra = {}) {
  return { ok: true, value, ...extra };
}

/** Resultado con error, sin valor numérico. */
export function fail(code, message, extra = {}) {
  return { ok: false, value: null, error: { code, message }, ...extra };
}
