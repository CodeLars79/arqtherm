import { useCallback, useMemo } from 'react';
import { useLocalStorage, STORAGE_KEYS } from './useLocalStorage.js';
import { createExampleAssembly, createEmptyAssembly, createLayer } from '../data/exampleAssembly.js';
import { validateAssembly } from '../utils/validateAssembly.js';
import { createId } from '../utils/ids.js';
import { calculateAssembly, evaluateCompliance, evaluateOrientative, evaluateCondensation } from '../engine/index.js';
import { elementTypes, calculationData, uValueLimits, climateZonesData } from '../data/index.js';

const capitalAltitude = Object.fromEntries(climateZonesData.provinces.map((p) => [p.ineCode, p.capitalReferenceAltitudeM]));

const isValidStored = (v) => validateAssembly(v).valid;

/**
 * Estado del elemento en edición y resultados recalculados en tiempo real.
 */
export function useAssembly(materialsById) {
  const [assembly, setAssembly] = useLocalStorage(STORAGE_KEYS.current, createExampleAssembly, isValidStored);

  /** Cualquier edición deja de ser «el ejemplo». */
  const edit = useCallback((fn) => {
    setAssembly((a) => ({ ...fn(a), isExample: false }));
  }, [setAssembly]);

  const actions = useMemo(() => ({
    setName: (name) => edit((a) => ({ ...a, name })),
    setElementType: (elementTypeId) => edit((a) => ({ ...a, elementTypeId, contextId: null })),
    setClimateZone: (climateZone) => setAssembly((a) => ({ ...a, climateZone: climateZone || null })),
    setSite: (patch) => setAssembly((a) => ({ ...a, site: { ...(a.site || {}), ...patch } })),
    setParams: (patch) => edit((a) => ({ ...a, params: { ...(a.params || {}), ...patch } })),
    setContext: (contextId) => setAssembly((a) => ({ ...a, contextId: contextId || null })),
    addLayer: () => edit((a) => ({ ...a, layers: [...a.layers, createLayer()] })),
    updateLayer: (id, patch) => edit((a) => ({
      ...a,
      layers: a.layers.map((l) => (l.id === id ? { ...l, ...patch } : l))
    })),
    duplicateLayer: (id) => edit((a) => {
      const index = a.layers.findIndex((l) => l.id === id);
      if (index < 0) return a;
      const copy = { ...a.layers[index], id: createId('ly') };
      const layers = [...a.layers];
      layers.splice(index + 1, 0, copy);
      return { ...a, layers };
    }),
    removeLayer: (id) => edit((a) => ({ ...a, layers: a.layers.filter((l) => l.id !== id) })),
    moveLayer: (id, delta) => edit((a) => {
      const index = a.layers.findIndex((l) => l.id === id);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= a.layers.length) return a;
      const layers = [...a.layers];
      [layers[index], layers[target]] = [layers[target], layers[index]];
      return { ...a, layers };
    }),
    replace: (next) => setAssembly(next),
    newAssembly: () => setAssembly(createEmptyAssembly()),
    resetToExample: () => setAssembly(createExampleAssembly())
  }), [edit, setAssembly]);

  const calculation = useMemo(
    () => calculateAssembly(assembly, { materialsById, elementTypes, calculationData }),
    [assembly, materialsById]
  );

  const compliance = useMemo(
    () => evaluateCompliance({
      calculation,
      climateZone: assembly.climateZone,
      contextId: assembly.contextId,
      limitsData: uValueLimits
    }),
    [calculation, assembly.climateZone, assembly.contextId]
  );

  const orientative = useMemo(
    () => evaluateOrientative({ calculation, climateZone: assembly.climateZone, limitsData: uValueLimits }),
    [calculation, assembly.climateZone]
  );

  const condensation = useMemo(() => {
    const site = assembly.site || {};
    return evaluateCondensation({
      calculation,
      assembly,
      materialsById,
      climateZone: assembly.climateZone,
      hygrometryClass: site.hygrometryClass || '3',
      ineCode: site.ineCode || null,
      altitudeM: site.altitudeM ?? null,
      capitalAltitudeM: capitalAltitude[site.ineCode] ?? null,
      data: calculationData.condensation
    });
  }, [calculation, assembly, materialsById]);

  return { assembly, actions, calculation, compliance, orientative, condensation };
}
