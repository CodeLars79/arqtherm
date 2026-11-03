/**
 * Comprobación de condensaciones según el DA DB-HE/2: superficiales (factor de temperatura fRsi)
 * e intersticiales (método de Glaser con las condiciones de enero). Funciones puras.
 */

/** μ numérico que representa μ = ∞ (Sd prácticamente infinito) sin romper el cálculo. */
export const VAPOUR_TIGHT_MU = 1e9;

export const CONDENSATION_ELEMENT_IDS = ['fachada', 'cubierta', 'suelo-exterior'];

/** Presión de saturación del vapor de agua (Pa) a θ (°C), DA DB-HE/2 expresiones 3 y 4. */
export function saturationPressure(theta, sat = { p0: 610.5, aboveZero: { a: 17.269, b: 237.3 }, belowZero: { a: 21.875, b: 265.5 } }) {
  const k = theta >= 0 ? sat.aboveZero : sat.belowZero;
  return sat.p0 * Math.exp((k.a * theta) / (theta + k.b));
}

/** Factor de temperatura de la superficie interior, fRsi = 1 − 0,25·U (expresión 9). */
export function surfaceTemperatureFactor(u) {
  return 1 - 0.25 * u;
}

/** μ de una capa: el introducido en la capa, el del material o 1 en cámaras de aire. */
export function layerMu(layer, material, airLayerMu = 1) {
  if (typeof layer?.mu === 'number' && Number.isFinite(layer.mu) && layer.mu > 0) return { value: layer.mu, source: 'user' };
  if (material?.airCavity) return { value: airLayerMu, source: 'air' };
  // μ = ∞ en el CEC (metales, vidrio, azulejo, vidrio celular): capa estanca al vapor.
  if (material?.properties?.muInfinite) return { value: VAPOUR_TIGHT_MU, source: 'infinite' };
  const m = material?.properties?.mu;
  if (typeof m === 'number' && Number.isFinite(m) && m > 0) return { value: m, source: 'material' };
  return { value: null, source: null };
}

/** Condiciones exteriores de enero de la provincia, corregidas por altitud si la localidad es más alta. */
export function januaryExterior({ ineCode, altitudeM, capitalAltitudeM }, data) {
  const c = data.januaryClimate.byIneCode[ineCode];
  if (!c) return null;
  const sat = data.saturation;
  const pe = c.phiE * saturationPressure(c.thetaE, sat);
  const h = Number(altitudeM);
  const dh = Number.isFinite(h) && Number.isFinite(capitalAltitudeM) ? h - capitalAltitudeM : 0;
  if (dh <= 0) return { thetaE: c.thetaE, phiE: c.phiE, pe, capital: c.capital, corrected: false };
  const thetaE = c.thetaE - (data.altitudeLapseCPer100m * dh) / 100;
  const phiE = Math.min(1, pe / saturationPressure(thetaE, sat));
  return { thetaE, phiE, pe: phiE * saturationPressure(thetaE, sat), capital: c.capital, corrected: true, deltaAltitude: dh };
}

/**
 * @param {object} args
 * @param {object} args.calculation  resultado de calculateAssembly
 * @param {object} args.assembly     elemento (para μ por capa)
 * @param {object} args.materialsById
 * @param {string|null} args.climateZone
 * @param {string} args.hygrometryClass  '3' | '4' | '5'
 * @param {string|null} args.ineCode     provincia (clima de enero de su capital)
 * @param {number|null} args.altitudeM   altitud de la localidad
 * @param {number|null} args.capitalAltitudeM
 * @param {object} args.data             calculationData.condensation
 */
export function evaluateCondensation({ calculation, assembly, materialsById, climateZone, hygrometryClass = '3', ineCode, altitudeM, capitalAltitudeM, data }) {
  const out = { applicable: false, reasons: [], surface: null, interstitial: null };
  const typeId = calculation?.elementType?.id;
  if (!CONDENSATION_ELEMENT_IDS.includes(typeId)) {
    out.reasons.push(typeId
      ? 'El DA DB-HE/2 se aplica aquí a cerramientos en contacto con el aire exterior (fachadas, cubiertas y suelos). No exige comprobar los elementos en contacto con el terreno ni las particiones con espacios no habitables de baja producción de vapor.'
      : 'Seleccione un tipo de elemento.');
    return out;
  }
  if (calculation.status !== 'complete') {
    out.reasons.push('Complete el cálculo de U para comprobar las condensaciones.');
    return out;
  }
  out.applicable = true;
  const cls = data.hygrometryClasses.find((c) => c.id === String(hygrometryClass)) || data.hygrometryClasses[0];
  const sat = data.saturation;
  const thetaI = data.interiorTemperature;

  // Superficiales
  const fRsi = surfaceTemperatureFactor(calculation.uValue);
  const fRsiMin = climateZone ? data.fRsiMin.values[cls.id]?.[climateZone] ?? null : null;
  out.surface = {
    fRsi,
    fRsiMin,
    hygrometryClass: cls,
    state: fRsiMin === null ? 'unavailable' : fRsi >= fRsiMin ? 'ok' : 'fail',
    reason: fRsiMin === null ? 'Seleccione la zona climática de invierno para obtener fRsi,min.' : null
  };

  // Intersticiales
  const ext = ineCode ? januaryExterior({ ineCode, altitudeM, capitalAltitudeM }, data) : null;
  if (!ext) {
    out.interstitial = { state: 'unavailable', reason: 'Seleccione la provincia para tomar las condiciones exteriores de enero (tabla C.1).' };
    return out;
  }
  const assemblyLayers = Object.fromEntries((assembly?.layers || []).map((l) => [l.id, l]));
  const layers = calculation.layers.filter((l) => l.included);
  const missingMu = [];
  const withMu = layers.map((l) => {
    const material = materialsById[l.materialId];
    const mu = layerMu(assemblyLayers[l.id], material, data.airLayerMu);
    if (mu.value === null) missingMu.push(l);
    return { ...l, mu: mu.value, muSource: mu.source, sd: mu.value === null ? null : mu.value * (l.thicknessMm / 1000) };
  });
  const pi = cls.phiI * saturationPressure(thetaI, sat);
  const base = { exterior: ext, thetaI, phiI: cls.phiI, pi, pe: ext.pe, layers: withMu };
  if (missingMu.length) {
    out.interstitial = { ...base, state: 'unavailable', missingMu, reason: `Falta el factor de resistencia a la difusión del vapor μ en: ${missingMu.map((l) => l.name).join(', ')}.` };
    return out;
  }

  const rt = calculation.rsi + calculation.layersSum + calculation.rse;
  const dT = thetaI - ext.thetaE;
  const sdTotal = withMu.reduce((a, l) => a + l.sd, 0);
  const points = [];
  let x = 0;
  let r = calculation.rse;
  let sd = 0;
  const push = (label) => {
    const theta = ext.thetaE + (dT * r) / rt;
    const p = ext.pe + ((pi - ext.pe) * sd) / sdTotal;
    const psat = saturationPressure(theta, sat);
    points.push({ xMm: x, theta, p, psat, label, condensation: p > psat + 1e-9 });
  };
  push('Superficie exterior');
  withMu.forEach((l, i) => {
    x += l.thicknessMm;
    r += l.resistance;
    sd += l.sd;
    push(i === withMu.length - 1 ? 'Superficie interior' : `Entre ${l.index + 1} y ${withMu[i + 1].index + 1}`);
  });
  const condensationAt = points.filter((pt) => pt.condensation);
  out.interstitial = {
    ...base,
    state: condensationAt.length ? 'fail' : 'ok',
    points,
    sdTotal,
    condensationAt,
    thetaSi: thetaI - (dT * calculation.rsi) / rt
  };
  return out;
}
