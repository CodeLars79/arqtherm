/**
 * Búsqueda de valores límite y comparación con la transmitancia calculada.
 * Los datos reglamentarios se reciben como argumento (nunca se codifican aquí).
 */

const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * Busca el valor límite aplicable.
 * @returns {{ok:true, limit:number, table:object, row:object, symbol:string} | {ok:false, reason:string, code:string}}
 */
export function lookupLimit({ elementType, climateZone, contextId, limitsData }) {
  if (!elementType) return { ok: false, code: 'no-element', reason: 'No se ha seleccionado el tipo de elemento.' };
  if (!elementType.supported) {
    return { ok: false, code: 'element-unsupported', reason: 'El tipo de elemento no está soportado en esta versión.' };
  }

  let limitRef = elementType.limit || null;
  if (Array.isArray(elementType.contexts) && elementType.contexts.length > 0) {
    const context = elementType.contexts.find((c) => c.id === contextId);
    if (!context) {
      return { ok: false, code: 'context-missing', reason: 'Indique qué unidades de uso separa la partición.' };
    }
    limitRef = context.limit;
  }
  if (!limitRef) return { ok: false, code: 'no-limit', reason: 'No hay un valor límite asociado a este elemento.' };

  if (!climateZone) return { ok: false, code: 'zone-missing', reason: 'Seleccione la zona climática de invierno.' };

  const table = limitsData.tables.find((t) => t.id === limitRef.tableId);
  if (!table) return { ok: false, code: 'table-missing', reason: 'La tabla reglamentaria no está disponible en el conjunto de datos.' };
  if (table.validationStatus !== 'verified') {
    return { ok: false, code: 'table-unverified', reason: 'La tabla reglamentaria no ha sido verificada; no se emite veredicto.' };
  }
  const row = table.rows.find((r) => r.id === limitRef.rowId);
  if (!row) return { ok: false, code: 'row-missing', reason: 'La fila de la tabla reglamentaria no está disponible.' };
  const limit = row.values[climateZone];
  if (!isFiniteNumber(limit)) {
    return { ok: false, code: 'zone-value-missing', reason: 'No hay valor límite para la zona climática seleccionada.' };
  }
  return { ok: true, limit, table, row, symbol: limitRef.symbol };
}

/**
 * Compara U con Ulim. El DB-HE exige que U «no superará» Ulim: U ≤ Ulim cumple.
 * Se compara a precisión completa, sin redondear U.
 * @returns {'complies'|'not-complies'|null}
 */
export function compareWithLimit(uValue, limit) {
  if (!isFiniteNumber(uValue) || !isFiniteNumber(limit) || uValue <= 0 || limit <= 0) return null;
  return uValue <= limit ? 'complies' : 'not-complies';
}

/**
 * Evaluación completa con los tres estados de la verificación.
 * @returns {{state:'complies'|'not-complies'|'unavailable', reasons:string[], limit?:number, margin?:number, lookup?:object}}
 */
export function evaluateCompliance({ calculation, climateZone, contextId, limitsData }) {
  const reasons = [];
  if (!calculation || calculation.status !== 'complete' || !isFiniteNumber(calculation.uValue)) {
    reasons.push('El cálculo de la transmitancia no está completo.');
  }
  const lookup = lookupLimit({ elementType: calculation?.elementType, climateZone, contextId, limitsData });
  if (!lookup.ok) reasons.push(lookup.reason);
  if (reasons.length > 0) return { state: 'unavailable', reasons, lookup };

  const verdict = compareWithLimit(calculation.uValue, lookup.limit);
  if (!verdict) return { state: 'unavailable', reasons: ['No se pudo comparar el resultado.'], lookup };
  return {
    state: verdict,
    reasons: [],
    limit: lookup.limit,
    margin: lookup.limit - calculation.uValue,
    lookup
  };
}

/**
 * Valor orientativo de transmitancia (DB-HE, Anejo E, tabla a-Anejo E).
 * No es una exigencia: se informa por separado del veredicto de cumplimiento.
 * @returns {{ok:true, value:number, table:object, row:object, symbol:string} | {ok:false, code:string, reason:string}}
 */
export function lookupOrientative({ elementType, climateZone, limitsData }) {
  if (!elementType) return { ok: false, code: 'no-element', reason: 'No se ha seleccionado el tipo de elemento.' };
  if (!elementType.supported) {
    return { ok: false, code: 'element-unsupported', reason: 'El tipo de elemento no está soportado en esta versión.' };
  }
  const ref = elementType.orientative;
  if (!ref) {
    return {
      ok: false,
      code: 'no-orientative',
      reason: elementType.orientativeUnavailableReason || 'La tabla a-Anejo E no incluye este tipo de elemento.'
    };
  }
  if (!climateZone) return { ok: false, code: 'zone-missing', reason: 'Seleccione la zona climática de invierno.' };
  const table = limitsData.tables.find((t) => t.id === ref.tableId);
  if (!table) return { ok: false, code: 'table-missing', reason: 'La tabla del Anejo E no está disponible en el conjunto de datos.' };
  if (table.validationStatus !== 'verified') {
    return { ok: false, code: 'table-unverified', reason: 'La tabla del Anejo E no ha sido verificada; no se compara.' };
  }
  const row = table.rows.find((r) => r.id === ref.rowId);
  const value = row?.values?.[climateZone];
  if (!isFiniteNumber(value)) {
    return { ok: false, code: 'zone-value-missing', reason: 'No hay valor orientativo para la zona climática seleccionada.' };
  }
  return { ok: true, value, table, row, symbol: ref.symbol };
}

/**
 * Compara U con el valor orientativo del Anejo E.
 * @returns {{state:'within'|'above'|'unavailable', reasons:string[], value?:number, margin?:number, lookup?:object}}
 */
export function evaluateOrientative({ calculation, climateZone, limitsData }) {
  const reasons = [];
  if (!calculation || calculation.status !== 'complete' || !isFiniteNumber(calculation.uValue)) {
    reasons.push('El cálculo de la transmitancia no está completo.');
  }
  const lookup = lookupOrientative({ elementType: calculation?.elementType, climateZone, limitsData });
  if (!lookup.ok) reasons.push(lookup.reason);
  if (reasons.length > 0) return { state: 'unavailable', reasons, lookup };
  const verdict = compareWithLimit(calculation.uValue, lookup.value);
  if (!verdict) return { state: 'unavailable', reasons: ['No se pudo comparar el resultado.'], lookup };
  return {
    state: verdict === 'complies' ? 'within' : 'above',
    reasons: [],
    value: lookup.value,
    margin: lookup.value - calculation.uValue,
    lookup
  };
}
