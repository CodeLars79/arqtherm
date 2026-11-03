import { createId } from '../utils/ids.js';

/**
 * Elemento de ejemplo. Es ILUSTRATIVO: usa valores genéricos del CEC (verificados)
 * y no representa una solución constructiva verificada.
 */
export function createExampleAssembly() {
  return {
    id: createId('asm'),
    name: 'Ejemplo · Fachada de fábrica con cámara y aislamiento',
    elementTypeId: 'fachada',
    climateZone: 'C',
    contextId: null,
    isExample: true,
    layers: [
      { id: createId('ly'), materialId: 'cec-mortero-1800-2000', name: null, thicknessMm: 15, lambda: null, lambdaOverride: false },
      { id: createId('ly'), materialId: 'cec-fab-lp-medio-40-60', name: null, thicknessMm: 115, lambda: null, lambdaOverride: false },
      { id: createId('ly'), materialId: 'cec-mw', name: null, thicknessMm: 60, lambda: null, lambdaOverride: false },
      { id: createId('ly'), materialId: 'air-unventilated', name: null, thicknessMm: 20, lambda: null, lambdaOverride: false },
      { id: createId('ly'), materialId: 'cec-fab-lh-doble', name: null, thicknessMm: 70, lambda: null, lambdaOverride: false },
      { id: createId('ly'), materialId: 'cec-enlucido-yeso-1000-1300', name: null, thicknessMm: 15, lambda: null, lambdaOverride: false }
    ]
  };
}

export function createEmptyAssembly() {
  return {
    id: createId('asm'),
    name: 'Nuevo elemento',
    elementTypeId: 'fachada',
    climateZone: null,
    contextId: null,
    isExample: false,
    layers: []
  };
}

export function createLayer(partial = {}) {
  return {
    id: createId('ly'),
    materialId: null,
    name: null,
    thicknessMm: null,
    lambda: null,
    lambdaOverride: false,
    ...partial
  };
}
