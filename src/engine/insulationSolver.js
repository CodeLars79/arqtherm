/**
 * Espesor mínimo de una capa (normalmente de aislamiento) para que U no supere un objetivo.
 * Usa el propio motor de cálculo, por lo que vale para todos los procedimientos (capas, terreno,
 * espacios no habitables). U decrece al aumentar el espesor de una capa.
 */
import { calculateAssembly } from './calculateAssembly.js';

export const MAX_SOLVER_THICKNESS_MM = 1000;

/** Redondeo hacia arriba a espesores comerciales: múltiplos de 10 mm (20 mm por encima de 100 mm). */
export function commercialThickness(mm) {
  if (!(mm > 0)) return null;
  const step = mm > 100 ? 20 : 10;
  return Math.ceil((mm - 1e-9) / step) * step;
}

function uWith(assembly, layerId, thicknessMm, deps) {
  const next = { ...assembly, layers: assembly.layers.map((l) => (l.id === layerId ? { ...l, thicknessMm } : l)) };
  const r = calculateAssembly(next, deps);
  return r.status === 'complete' ? r.uValue : null;
}

/**
 * @returns {{ok:true, exactMm, roundedMm, uAtRounded, currentMm, currentU, alreadyMeets} | {ok:false, error}}
 */
export function solveInsulationThickness({ assembly, layerId, targetU, deps }) {
  if (!(targetU > 0)) return { ok: false, error: 'No hay valor objetivo: seleccione la zona climática.' };
  const layer = assembly.layers.find((l) => l.id === layerId);
  if (!layer) return { ok: false, error: 'Seleccione la capa cuyo espesor se ajusta.' };
  const material = deps.materialsById[layer.materialId];
  if (material?.airCavity || (material?.thermalResistance && !layer.lambdaOverride)) {
    return { ok: false, error: 'Elija una capa definida por su conductividad λ (no una cámara ni una fábrica con resistencia tabulada).' };
  }
  const current = calculateAssembly(assembly, deps);
  if (current.status !== 'complete') return { ok: false, error: 'Complete primero el cálculo de U.' };

  const lo0 = 1;
  const uLo = uWith(assembly, layerId, lo0, deps);
  if (uLo === null) return { ok: false, error: 'No se puede calcular el elemento con esta capa.' };
  if (uLo <= targetU) {
    return { ok: true, exactMm: 0, roundedMm: commercialThickness(lo0), uAtRounded: uWith(assembly, layerId, commercialThickness(lo0), deps), currentMm: layer.thicknessMm, currentU: current.uValue, alreadyMeets: true, notNeeded: true };
  }
  const uHi = uWith(assembly, layerId, MAX_SOLVER_THICKNESS_MM, deps);
  if (uHi === null || uHi > targetU) {
    return { ok: false, error: `Ni con ${MAX_SOLVER_THICKNESS_MM} mm de esta capa se alcanza el objetivo (por ejemplo, porque la tabla del DA queda limitada en su extremo).` };
  }
  let lo = lo0;
  let hi = MAX_SOLVER_THICKNESS_MM;
  for (let i = 0; i < 60 && hi - lo > 0.01; i += 1) {
    const mid = (lo + hi) / 2;
    if (uWith(assembly, layerId, mid, deps) <= targetU) hi = mid; else lo = mid;
  }
  const exactMm = hi;
  let roundedMm = commercialThickness(exactMm);
  let uAtRounded = uWith(assembly, layerId, roundedMm, deps);
  // Seguridad numérica: si el redondeo no basta, se sube un escalón.
  while (uAtRounded > targetU && roundedMm < MAX_SOLVER_THICKNESS_MM) {
    roundedMm = commercialThickness(roundedMm + 1);
    uAtRounded = uWith(assembly, layerId, roundedMm, deps);
  }
  return { ok: true, exactMm, roundedMm, uAtRounded, currentMm: layer.thicknessMm, currentU: current.uValue, alreadyMeets: current.uValue <= targetU };
}
