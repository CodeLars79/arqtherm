/**
 * Registro del consentimiento para el almacenamiento local (art. 22.2 LSSI-CE).
 * Lógica pura, sin React: se puede probar sin navegador.
 */
import { STORAGE_KEYS } from '../hooks/useLocalStorage.js';

export const CONSENT_KEY = 'arqtherm:consent:v1';
export const PREFS_KEY = 'arqtherm:prefs:v1';

/** Cambiar esta fecha cuando cambie la política de cookies: se vuelve a pedir la elección. */
export const COOKIE_POLICY_VERSION = '2026-10-31';

/** Validez de la elección. La AEPD recomienda no superar 24 meses. */
export const CONSENT_MAX_AGE_MONTHS = 24;

export const CONSENT_CATEGORIES = {
  necessary: {
    label: 'Técnicas (necesarias)',
    description:
      'Permiten que la aplicación funcione y conservan lo que usted crea en ella: el elemento en edición, los elementos guardados, los materiales propios y esta elección. Están exentas de consentimiento (art. 22.2 LSSI-CE) y no se pueden desactivar.',
    required: true
  },
  preferences: {
    label: 'Preferencias',
    description:
      'Recuerdan opciones de visualización entre visitas, como el modo de color del mapa de zonas climáticas y la última provincia y altitud consultadas. Si no las acepta, la aplicación funciona igual, pero olvida estas opciones al cerrar la página.',
    required: false
  }
};

/**
 * Inventario de todo lo que la aplicación guarda en el navegador.
 * La política de cookies se genera a partir de esta lista.
 */
export const STORAGE_REGISTRY = [
  {
    key: STORAGE_KEYS.current,
    category: 'necessary',
    purpose: 'Conserva el elemento constructivo que está editando, para no perderlo al recargar la página.',
    duration: 'Persistente, hasta que usted la borre'
  },
  {
    key: STORAGE_KEYS.saved,
    category: 'necessary',
    purpose: 'Guarda los elementos que usted conserva con «Guardar» («Mis elementos»).',
    duration: 'Persistente, hasta que usted la borre'
  },
  {
    key: STORAGE_KEYS.materials,
    category: 'necessary',
    purpose: 'Guarda los materiales definidos por usted.',
    duration: 'Persistente, hasta que usted la borre'
  },
  {
    key: CONSENT_KEY,
    category: 'necessary',
    purpose: 'Registra su elección sobre el almacenamiento opcional y la fecha en que la hizo.',
    duration: `${CONSENT_MAX_AGE_MONTHS} meses`
  },
  {
    key: PREFS_KEY,
    category: 'preferences',
    purpose: 'Recuerda sus preferencias de visualización (modo de color del mapa, última provincia y altitud consultadas).',
    duration: 'Persistente, hasta que usted la borre o retire el consentimiento'
  }
];

function addMonths(date, months) {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Crea un registro de consentimiento. */
export function createConsent({ preferences }, now = new Date()) {
  return {
    policyVersion: COOKIE_POLICY_VERSION,
    decidedAt: now.toISOString(),
    expiresAt: addMonths(now, CONSENT_MAX_AGE_MONTHS).toISOString(),
    categories: { necessary: true, preferences: Boolean(preferences) }
  };
}

/** Valida un registro leído: forma correcta, versión vigente y no caducado. */
export function isConsentValid(record, now = new Date()) {
  if (!record || typeof record !== 'object') return false;
  if (record.policyVersion !== COOKIE_POLICY_VERSION) return false;
  if (!record.categories || typeof record.categories.preferences !== 'boolean') return false;
  const expires = Date.parse(record.expiresAt);
  if (!Number.isFinite(expires) || expires <= now.getTime()) return false;
  return true;
}

/** Lee el consentimiento vigente o null (sin elección, caducado o política cambiada). */
export function readConsent(storage, now = new Date()) {
  try {
    const raw = storage?.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isConsentValid(parsed, now) ? parsed : null;
  } catch {
    return null;
  }
}

/** Guarda la elección y borra el almacenamiento de las categorías rechazadas. */
export function writeConsent(storage, record) {
  try {
    storage?.setItem(CONSENT_KEY, JSON.stringify(record));
    if (!record.categories.preferences) storage?.removeItem(PREFS_KEY);
    return true;
  } catch {
    return false;
  }
}
