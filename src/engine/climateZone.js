/**
 * Zonas climáticas del CTE DB-HE (Anejo B): utilidades puras, sin dependencias de React.
 * Una zona combina la severidad de invierno (α, A–E) y la de verano (1–4), p. ej. «C3».
 */

const WINTER_ORDER = ['α', 'A', 'B', 'C', 'D', 'E'];

/** Separa «C3» en { winter: 'C', summer: 3 }. Devuelve null si el código no es válido. */
export function parseZoneCode(code) {
  const m = /^([αABCDE])([1-4])$/.exec(String(code || '').trim());
  return m ? { winter: m[1], summer: Number(m[2]) } : null;
}

/** Índice de severidad de invierno (0 = α … 5 = E). */
export function winterIndex(letter) {
  return WINTER_ORDER.indexOf(letter);
}

/**
 * Zona climática de una localidad a partir de los tramos de altitud de su provincia.
 * Los límites son inclusivos; entre tramos enteros, una altitud decimal se redondea al metro.
 * @param {{bands: Array<{zone:string, minM:number|null, maxM:number|null}>}} province
 * @param {number} altitudeM altitud sobre el nivel del mar (m)
 * @returns {{zone:string, band:object}|null}
 */
export function zoneForAltitude(province, altitudeM) {
  if (!province || !Array.isArray(province.bands) || province.bands.length === 0) return null;
  const h = Number(altitudeM);
  if (!Number.isFinite(h) || h < 0) return null;
  const hm = Math.round(h);
  const band = province.bands.find(
    (b) => (b.minM == null || hm >= b.minM) && (b.maxM == null || hm <= b.maxM)
  );
  return band ? { zone: band.zone, band } : null;
}

/** Texto del tramo: «≤ 450 m», «451–950 m», «≥ 951 m» o «cualquier altitud». */
export function formatBand(band) {
  if (band.minM == null && band.maxM == null) return 'cualquier altitud';
  if (band.minM == null) return `≤ ${band.maxM.toLocaleString('es-ES')} m`;
  if (band.maxM == null) return `≥ ${band.minM.toLocaleString('es-ES')} m`;
  return `${band.minM.toLocaleString('es-ES')}–${band.maxM.toLocaleString('es-ES')} m`;
}

/** Comprueba que los tramos de una provincia son contiguos y cubren de 0 m a infinito. */
export function bandsAreContiguous(bands) {
  if (!bands?.length) return false;
  if (bands[0].minM != null) return false;
  if (bands[bands.length - 1].maxM != null) return false;
  for (let i = 1; i < bands.length; i++) {
    if (bands[i - 1].maxM == null || bands[i].minM !== bands[i - 1].maxM + 1) return false;
  }
  return true;
}
