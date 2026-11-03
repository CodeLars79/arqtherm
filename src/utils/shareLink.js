/**
 * Enlaces para compartir un elemento sin servidor: el elemento se codifica en la propia URL
 * (JSON compacto en base64url). Incluye los materiales de usuario que utiliza.
 */
import { createId } from './ids.js';
import { validateAssembly, validateCustomMaterial } from './validateAssembly.js';

export const SHARE_PARAM = 'e';
const VERSION = 1;
const MAX_ENCODED_LENGTH = 12000;

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code) {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

const compactObj = (o) => (o && Object.keys(o).length ? o : undefined);

/** Codifica un elemento (y sus materiales de usuario) para la URL. */
export function encodeAssembly(assembly, materialsById = {}) {
  const custom = [...new Set(assembly.layers.map((l) => l.materialId).filter((id) => id && id.startsWith('user-')))]
    .map((id) => materialsById[id]).filter(Boolean);
  const payload = {
    v: VERSION,
    n: assembly.name,
    t: assembly.elementTypeId,
    z: assembly.climateZone ?? undefined,
    c: assembly.contextId ?? undefined,
    p: compactObj(assembly.params),
    s: compactObj(assembly.site),
    l: assembly.layers.map((l) => [
      l.materialId ?? null,
      l.thicknessMm ?? null,
      l.lambdaOverride ? l.lambda : null,
      l.name ?? null,
      l.mu ?? null
    ]),
    m: custom.length ? custom : undefined
  };
  return toBase64Url(JSON.stringify(payload));
}

/**
 * Decodifica y valida. Devuelve { ok, assembly, customMaterials } o { ok:false, error }.
 * @param {string} code
 * @param {{elementTypeIds?:string[], materialsById?:object}} [options]
 */
export function decodeAssembly(code, options = {}) {
  if (typeof code !== 'string' || code.length === 0) return { ok: false, error: 'El enlace no contiene ningún elemento.' };
  if (code.length > MAX_ENCODED_LENGTH) return { ok: false, error: 'El enlace es demasiado largo.' };
  let payload;
  try {
    payload = JSON.parse(fromBase64Url(code));
  } catch {
    return { ok: false, error: 'El enlace está dañado o incompleto.' };
  }
  if (!payload || payload.v !== VERSION || !Array.isArray(payload.l)) return { ok: false, error: 'Versión de enlace no reconocida.' };

  const customMaterials = Array.isArray(payload.m) ? payload.m : [];
  for (const m of customMaterials) {
    const v = validateCustomMaterial(m);
    if (!v.valid) return { ok: false, error: `Material de usuario no válido: ${v.errors[0]}` };
  }
  const assembly = {
    id: createId('asm'),
    name: typeof payload.n === 'string' && payload.n.trim() ? payload.n.slice(0, 120) : 'Elemento compartido',
    elementTypeId: payload.t,
    climateZone: payload.z ?? null,
    contextId: payload.c ?? null,
    params: payload.p ?? null,
    site: payload.s ?? null,
    isExample: false,
    layers: payload.l.map((row) => {
      const [materialId, thicknessMm, lambda, name, mu] = Array.isArray(row) ? row : [];
      return {
        id: createId('ly'),
        materialId: materialId ?? null,
        name: name ?? null,
        thicknessMm: thicknessMm ?? null,
        lambda: lambda ?? null,
        lambdaOverride: lambda !== null && lambda !== undefined,
        ...(mu !== null && mu !== undefined ? { mu } : {})
      };
    })
  };
  const check = validateAssembly(assembly, { elementTypeIds: options.elementTypeIds });
  if (!check.valid) return { ok: false, error: check.errors[0] };
  if (options.materialsById) {
    const known = new Set([...Object.keys(options.materialsById), ...customMaterials.map((m) => m.id)]);
    const unknown = assembly.layers.find((l) => l.materialId && !known.has(l.materialId));
    if (unknown) return { ok: false, error: `Material desconocido en el enlace: «${unknown.materialId}».` };
  }
  return { ok: true, assembly, customMaterials };
}

/** URL completa para compartir. */
export function buildShareUrl(code, { siteUrl, useHash = false, origin = '', pathname = '/' } = {}) {
  const base = siteUrl ? siteUrl.replace(/\/+$/, '') : origin;
  if (siteUrl || !useHash) return `${base}/calculadora?${SHARE_PARAM}=${code}`;
  return `${base}${pathname}#/calculadora?${SHARE_PARAM}=${code}`;
}
