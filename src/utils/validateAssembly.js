/**
 * Validación estructural de elementos y materiales de usuario.
 * Se usa al importar JSON y al leer localStorage.
 */

export const MAX_LAYERS = 40;
export const MAX_NAME_LENGTH = 120;
export const CLIMATE_ZONES = ['alpha', 'A', 'B', 'C', 'D', 'E'];

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isFiniteOrNull = (v) => v === null || (typeof v === 'number' && Number.isFinite(v));
const isPositiveFinite = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;

/** Valida una capa. Devuelve un array de mensajes de error. */
function validateLayer(layer, index) {
  const where = `Capa ${index + 1}`;
  const errors = [];
  if (!isPlainObject(layer)) return [`${where}: no es un objeto.`];
  if (typeof layer.id !== 'string' || layer.id.length === 0) errors.push(`${where}: falta «id».`);
  if (!(layer.materialId === null || typeof layer.materialId === 'string')) {
    errors.push(`${where}: «materialId» debe ser texto o null.`);
  }
  if (!isFiniteOrNull(layer.thicknessMm)) errors.push(`${where}: «thicknessMm» debe ser un número o null.`);
  if (!isFiniteOrNull(layer.lambda ?? null)) errors.push(`${where}: «lambda» debe ser un número o null.`);
  if (layer.lambdaOverride !== undefined && typeof layer.lambdaOverride !== 'boolean') {
    errors.push(`${where}: «lambdaOverride» debe ser verdadero o falso.`);
  }
  if (layer.mu !== undefined && layer.mu !== null && !isPositiveFinite(layer.mu)) {
    errors.push(`${where}: «mu» debe ser un número mayor que cero o null.`);
  }
  if (layer.name !== undefined && layer.name !== null && typeof layer.name !== 'string') {
    errors.push(`${where}: «name» debe ser texto.`);
  }
  return errors;
}

/**
 * Valida un elemento constructivo.
 * @param {object} assembly
 * @param {{elementTypeIds?: string[]}} [options]
 * @returns {{valid:boolean, errors:string[]}}
 */
export function validateAssembly(assembly, options = {}) {
  const errors = [];
  if (!isPlainObject(assembly)) return { valid: false, errors: ['El elemento no es un objeto JSON válido.'] };

  if (typeof assembly.name !== 'string' || assembly.name.trim().length === 0) {
    errors.push('Falta el nombre del elemento («name»).');
  } else if (assembly.name.length > MAX_NAME_LENGTH) {
    errors.push(`El nombre supera ${MAX_NAME_LENGTH} caracteres.`);
  }
  if (typeof assembly.elementTypeId !== 'string') {
    errors.push('Falta el tipo de elemento («elementTypeId»).');
  } else if (options.elementTypeIds && !options.elementTypeIds.includes(assembly.elementTypeId)) {
    errors.push(`Tipo de elemento desconocido: «${assembly.elementTypeId}».`);
  }
  if (assembly.climateZone !== undefined && assembly.climateZone !== null && !CLIMATE_ZONES.includes(assembly.climateZone)) {
    errors.push('Zona climática no válida.');
  }
  if (assembly.contextId !== undefined && assembly.contextId !== null && typeof assembly.contextId !== 'string') {
    errors.push('«contextId» debe ser texto o null.');
  }
  for (const key of ['params', 'site']) {
    const obj = assembly[key];
    if (obj === undefined || obj === null) continue;
    if (!isPlainObject(obj)) {
      errors.push(`«${key}» debe ser un objeto.`);
      continue;
    }
    for (const [k, v] of Object.entries(obj)) {
      const ok = v === null || typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v));
      if (!ok) errors.push(`Parámetro «${key}.${k}» no válido.`);
    }
  }
  if (!Array.isArray(assembly.layers)) {
    errors.push('Falta la lista de capas («layers»).');
  } else {
    if (assembly.layers.length > MAX_LAYERS) errors.push(`El elemento supera el máximo de ${MAX_LAYERS} capas.`);
    assembly.layers.forEach((layer, i) => errors.push(...validateLayer(layer, i)));
    const ids = assembly.layers.map((l) => l?.id);
    if (new Set(ids).size !== ids.length) errors.push('Hay capas con identificadores repetidos.');
  }
  return { valid: errors.length === 0, errors };
}

/** Valida un material definido por el usuario. */
export function validateCustomMaterial(material) {
  const errors = [];
  if (!isPlainObject(material)) return { valid: false, errors: ['El material no es un objeto.'] };
  if (typeof material.id !== 'string' || !material.id.startsWith('user-')) {
    errors.push('El identificador de un material de usuario debe empezar por «user-».');
  }
  if (typeof material.name !== 'string' || material.name.trim().length === 0) errors.push('Falta el nombre del material.');
  if (typeof material.category !== 'string') errors.push('Falta la categoría del material.');
  if (!isPositiveFinite(material.thermalConductivity)) {
    errors.push('La conductividad λ debe ser un número finito mayor que cero.');
  }
  if (material.dataStatus !== 'user') errors.push('Un material de usuario debe tener «dataStatus»: "user".');
  return { valid: errors.length === 0, errors };
}
