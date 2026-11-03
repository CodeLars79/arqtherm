/**
 * Procedimientos tabulados del DA DB-HE/1 (enero 2020) para elementos en contacto con el terreno
 * y con espacios no habitables: tablas 3, 4, 5, 7 y 9. Funciones puras.
 *
 * Fuera del rango de una tabla no se extrapola: se toma el extremo de la tabla y se avisa.
 */

const EPS = 1e-9;

/** Longitud característica B' = A / (0,5 · P). */
export function characteristicLength(areaM2, perimeterM) {
  const a = Number(areaM2);
  const p = Number(perimeterM);
  if (!(a > 0) || !(p > 0) || !Number.isFinite(a) || !Number.isFinite(p)) return null;
  return a / (0.5 * p);
}

/** Posición de x en una serie creciente: índices vecinos y fracción, con recorte a los extremos. */
function locate(xs, x) {
  if (x <= xs[0] + EPS) return { i0: 0, i1: 0, t: 0, clamped: x < xs[0] - EPS ? 'low' : null };
  const last = xs.length - 1;
  if (x >= xs[last] - EPS) return { i0: last, i1: last, t: 0, clamped: x > xs[last] + EPS ? 'high' : null };
  let i = 0;
  while (xs[i + 1] < x) i += 1;
  return { i0: i, i1: i + 1, t: (x - xs[i]) / (xs[i + 1] - xs[i]), clamped: null };
}

/** Interpolación bilineal en una tabla values[fila][columna]. */
function bilinear(rows, cols, values, r, c) {
  const a = locate(rows, r);
  const b = locate(cols, c);
  const v = (i, j) => values[i][j];
  const top = v(a.i0, b.i0) + (v(a.i0, b.i1) - v(a.i0, b.i0)) * b.t;
  const bottom = v(a.i1, b.i0) + (v(a.i1, b.i1) - v(a.i1, b.i0)) * b.t;
  return { value: top + (bottom - top) * a.t, rowClamp: a.clamped, colClamp: b.clamped };
}

const fmt = (n, d = 2) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });

function clampNote(kind, symbol, limit, unit, safeSide) {
  return kind === 'high'
    ? `${symbol} supera el máximo de la tabla (${fmt(limit)} ${unit}): se toma el valor del extremo${safeSide ? ', del lado de la seguridad' : ''}.`
    : `${symbol} es menor que el mínimo de la tabla (${fmt(limit)} ${unit}): se toma el valor del extremo.`;
}

/**
 * Tabla 3 · Soleras con z ≤ 0,5 m (caso 1). Us(B', D, Ra).
 * D se interpola entre 0,5, 1,0 y ≥ 1,5 m; Ra y B' linealmente.
 */
export function slabCase1Us({ bPrime, bandWidthM, ra }, t3) {
  const notes = [];
  const rows = t3.bPrime;
  const raCols = t3.ra;
  const ds = t3.byBandWidth.map((g) => g.d);
  let d = bandWidthM;
  if (ra <= EPS) d = ds[0]; // sin aislamiento: la columna Ra = 0 es común a todos los D
  if (d < ds[0] - EPS) return { ok: false, error: `El ancho de la banda de aislamiento D debe ser al menos ${fmt(ds[0], 1)} m.` };
  if (d > ds[ds.length - 1]) d = ds[ds.length - 1];

  const evalAt = (group) => {
    let values = group.values;
    // La fila B' = 1 no tiene valores para D ≥ 1,5 m: en el primer metro, una banda de 1,5 m o más
    // cubre todo el ancho, como la de 1,0 m.
    if (values[0].some((x) => x === null)) {
      const d10 = t3.byBandWidth.find((g) => g.d === 1.0);
      values = values.map((row, i) => (i === 0 ? d10.values[0] : row));
      if (bPrime < rows[1]) notes.push('Para B\' < 2 y D ≥ 1,5 m (sin valores en la tabla) se usan los de D = 1,0 m, que ya cubren el primer metro.');
    }
    return bilinear(rows, raCols, values, bPrime, ra);
  };

  const pos = locate(ds, d);
  const lo = evalAt(t3.byBandWidth[pos.i0]);
  const hi = evalAt(t3.byBandWidth[pos.i1]);
  const value = lo.value + (hi.value - lo.value) * pos.t;
  if (lo.rowClamp) notes.push(clampNote(lo.rowClamp, 'B\'', lo.rowClamp === 'high' ? rows[rows.length - 1] : rows[0], 'm', false));
  if (lo.colClamp === 'high') notes.push(clampNote('high', 'Ra', raCols[raCols.length - 1], 'm²·K/W', true));
  return { ok: true, value, notes: [...new Set(notes)], usedBandWidth: d };
}

/** Tabla 4 · Soleras con z > 0,5 m (caso 2). Us(B', z, Rf); z por bandas, B' y Rf interpolados. */
export function slabCase2Us({ bPrime, depthM, rf }, t4) {
  const notes = [];
  const band = t4.depthBands.find((b) => depthM > b.minExclusive + EPS && (b.max === null || depthM <= b.max + EPS));
  if (!band) return { ok: false, error: 'La profundidad z debe ser mayor que 0,5 m para el caso 2.' };
  const r = bilinear(t4.bPrime, t4.rf, band.values, bPrime, rf);
  if (r.rowClamp) notes.push(clampNote(r.rowClamp, 'B\'', r.rowClamp === 'high' ? t4.bPrime[t4.bPrime.length - 1] : t4.bPrime[0], 'm', false));
  if (r.colClamp === 'high') notes.push(clampNote('high', 'Rf', t4.rf[t4.rf.length - 1], 'm²·K/W', true));
  return { ok: true, value: r.value, notes, band };
}

/** Tabla 5 · Muros enterrados. UT(Rm, z), interpolación bilineal. */
export function wallUt({ rm, depthM }, t5) {
  const notes = [];
  if (!(depthM > 0)) return { ok: false, error: 'Indique la profundidad z de la parte enterrada del muro (m).' };
  const r = bilinear(t5.rm, t5.z, t5.values, rm, depthM);
  if (r.rowClamp === 'high') notes.push(clampNote('high', 'Rm', t5.rm[t5.rm.length - 1], 'm²·K/W', true));
  if (r.colClamp === 'low') notes.push(`z es menor que ${fmt(t5.z[0], 1)} m: se toma la columna z = ${fmt(t5.z[0], 1)} m, del lado de la seguridad.`);
  if (r.colClamp === 'high') notes.push(`z supera ${fmt(t5.z[t5.z.length - 1], 0)} m: se toma la columna z ≥ ${fmt(t5.z[t5.z.length - 1], 0)} m.`);
  return { ok: true, value: r.value, notes };
}

/** Tabla 9 · Suelos sobre cámara sanitaria. Us(B', Rf). */
export function crawlSpaceUs({ bPrime, rf }, t9) {
  const notes = [];
  const r = bilinear(t9.bPrime, t9.rf, t9.values, bPrime, rf);
  if (r.rowClamp) notes.push(clampNote(r.rowClamp, 'B\'', r.rowClamp === 'high' ? t9.bPrime[t9.bPrime.length - 1] : t9.bPrime[0], 'm', false));
  if (r.colClamp === 'high') notes.push(clampNote('high', 'Rf', t9.rf[t9.rf.length - 1], 'm²·K/W', true));
  return { ok: true, value: r.value, notes };
}

/** Caso de ventilación de la tabla 7 según el nivel de estanqueidad (tabla 8). */
export function ventilationCase(airtightnessLevel) {
  const n = Number(airtightnessLevel);
  if (![1, 2, 3, 4, 5].includes(n)) return null;
  return n <= 3 ? 1 : 2;
}

/** Tabla 7 · Coeficiente b según Ah-nh/Anh-e (por intervalos), aislamiento y caso. */
export function reductionFactorB({ ratio, groupId, airtightnessLevel }, t7) {
  if (!(ratio > 0) || !Number.isFinite(ratio)) return { ok: false, error: 'Indique las superficies de la partición (h-nh) y del cerramiento del espacio no habitable con el exterior (nh-e).' };
  const group = t7.groups.find((g) => g.id === groupId);
  if (!group) return { ok: false, error: 'Seleccione qué elementos están aislados (tabla 7).' };
  const kase = ventilationCase(airtightnessLevel);
  if (!kase) return { ok: false, error: 'Seleccione el nivel de estanqueidad del espacio no habitable (tabla 8).' };
  const rowIndex = t7.ratioRows.findIndex((r) => r.max === null || ratio < r.max - EPS || (r.max === 3.0 && ratio <= 3.0 + EPS));
  const row = t7.ratioRows[rowIndex];
  return { ok: true, value: group.values[rowIndex][kase - 1], row, group, case: kase };
}
