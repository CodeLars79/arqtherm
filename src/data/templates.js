import { createId } from '../utils/ids.js';

/**
 * Plantillas de soluciones constructivas habituales en España. Son PUNTOS DE PARTIDA ILUSTRATIVOS:
 * usan materiales genéricos de la biblioteca (verificados con el CEC salvo indicación) y espesores típicos, no
 * soluciones verificadas. Las capas van del exterior (o del terreno / espacio no habitable) al interior.
 * Una capa sin material ([null, espesor, nombre]) requiere que el usuario introduzca su λ.
 * El cuarto elemento opcional añade propiedades a la capa (p. ej. { mu: 220 }).
 */
export const TEMPLATES = [
  {
    id: 'sate-trasdosado',
    group: 'Fachadas',
    name: 'Fachada con SATE sobre ladrillo y trasdosado de placa de yeso',
    description: 'SATE de lana mineral con revoco sobre ladrillo perforado enfoscado, con trasdosado interior de lana mineral y doble placa de yeso laminado (sin computar la perfilería).',
    elementTypeId: 'fachada',
    layers: [['cec-mortero-1800-2000', 5], ['cec-mw', 50], ['cec-mortero-1800-2000', 10], ['cec-fab-lp-medio-40-60', 115], ['cec-mw', 40], ['cec-pyl', 12.5], ['cec-pyl', 12.5]]
  },
  {
    id: 'ventilada-piedra',
    group: 'Fachadas',
    name: 'Fachada ventilada de piedra',
    description: 'Aplacado de granito sobre cámara muy ventilada, lana mineral, ladrillo perforado enfoscado y trasdosado de lana mineral con doble placa de yeso. El aplacado y la cámara no computan.',
    elementTypeId: 'fachada',
    layers: [['cec-granito', 30], ['air-very', 40], ['cec-mw', 50], ['cec-mortero-1800-2000', 10], ['cec-fab-lp-medio-40-60', 115], ['cec-mw', 40], ['cec-pyl', 12.5], ['cec-pyl', 12.5]]
  },
  {
    id: 'aplacada-gres',
    group: 'Fachadas',
    name: 'Fachada aplacada de gres porcelánico',
    description: 'Gres porcelánico adherido con mortero sobre fábrica de bloque cerámico aligerado, con trasdosado de lana mineral, barrera de vapor de polietileno y doble placa de yeso.',
    elementTypeId: 'fachada',
    layers: [['cec-baldosa-gres', 10], ['cec-mortero-1800-2000', 20], ['cec-fab-bc-190', 190], ['cec-mw', 70], ['cec-hdpe', 0.2, 'Barrera de vapor: lámina de polietileno'], ['cec-pyl', 12.5], ['cec-pyl', 12.5]]
  },
  {
    id: 'fabrica-camara',
    group: 'Fachadas',
    name: 'Fachada de fábrica con cámara',
    description: 'Ladrillo perforado, aislamiento en cámara con barrera de vapor en su cara caliente, cámara de aire sin ventilar y tabique de ladrillo hueco doble.',
    elementTypeId: 'fachada',
    layers: [['cec-mortero-1800-2000', 15], ['cec-fab-lp-medio-40-60', 115], ['cec-mw', 60], ['cec-hdpe', 0.2, 'Barrera de vapor: lámina de polietileno'], ['air-unventilated', 20], ['cec-fab-lh-doble', 70], ['cec-enlucido-yeso-1000-1300', 15]]
  },
  {
    id: 'trasdosado-pyl',
    group: 'Fachadas',
    name: 'Fachada de fábrica con trasdosado de placa de yeso',
    description: 'Ladrillo macizo cara vista enfoscado por el interior, con trasdosado de doble capa de lana mineral, barrera de vapor de polietileno y placa de yeso laminado.',
    elementTypeId: 'fachada',
    layers: [['cec-fab-lm-medio', 115], ['cec-mortero-1800-2000', 10], ['cec-mw', 40], ['cec-mw', 40], ['cec-hdpe', 0.2, 'Barrera de vapor: lámina de polietileno'], ['cec-pyl', 15]]
  },
  {
    id: 'sistema-ligero',
    group: 'Fachadas',
    name: 'Fachada de sistema ligero',
    description: 'Revoco sobre placa de cemento con lámina impermeable transpirable, triple capa de lana mineral, barrera de vapor de polietileno en la cara caliente y doble placa de yeso laminado (sin computar la perfilería).',
    elementTypeId: 'fachada',
    layers: [['cec-mortero-1800-2000', 5], ['placa-cemento', 12.5], ['lamina-impermeable-transpirable', 0.5], ['cec-mw', 100], ['cec-mw', 40], ['cec-mw', 40], ['cec-hdpe', 0.2, 'Barrera de vapor: lámina de polietileno'], ['cec-pyl', 12.5], ['cec-pyl', 12.5]]
  },
  {
    id: 'cubierta-invertida',
    group: 'Cubiertas',
    name: 'Cubierta plana invertida',
    description: 'Grava de protección sobre poliestireno extruido (XPS), impermeabilización bituminosa, mortero de regularización, formación de pendientes y losa de hormigón armado. La impermeabilización queda en la cara caliente del aislamiento y actúa como barrera de vapor. μ del XPS = 220, el extremo desfavorable del rango del CEC (100–220): sustitúyalo por el del producto. Active la corrección por agua de lluvia (UNE-EN ISO 6946) con la precipitación de la localidad.',
    elementTypeId: 'cubierta',
    layers: [['cec-arena-grava', 50], ['cec-xps-co2', 100, null, { mu: 220 }], ['cec-betun-lamina', 4], ['cec-mortero-1800-2000', 20], ['cec-hca-600', 100], ['cec-ha-2300-2500', 250], ['cec-enlucido-yeso-1000-1300', 15]]
  },
  {
    id: 'cubierta-teja',
    group: 'Cubiertas',
    name: 'Cubierta inclinada de teja ventilada',
    description: 'Teja sobre cámara muy ventilada, tablero OSB, lana mineral, barrera de vapor y placa de yeso. La teja y la cámara no computan.',
    elementTypeId: 'cubierta',
    layers: [['cec-teja-arcilla', 20], ['air-very', 40], ['cec-osb', 18], ['cec-mw', 140], ['cec-hdpe', 0.2, 'Barrera de vapor: lámina de polietileno'], ['cec-pyl', 15]]
  },
  {
    id: 'solera-perimetral',
    group: 'Terreno',
    name: 'Solera con aislamiento perimetral',
    description: 'Solera de hormigón con banda perimetral de aislamiento de 1 m. Ajuste la superficie y el perímetro de su planta.',
    elementTypeId: 'suelo-terreno',
    params: { areaM2: 100, perimeterM: 40, depthM: 0, insulation: 'band', bandWidthM: 1, raMode: 'auto' },
    layers: [['cec-mw', 50], ['cec-ha-2300-2500', 150], ['cec-mortero-1800-2000', 40], ['cec-baldosa-gres', 10]]
  },
  {
    id: 'muro-sotano',
    group: 'Terreno',
    name: 'Muro de sótano aislado',
    description: 'Muro de hormigón armado con aislamiento por la cara del terreno, enterrado 3 m.',
    elementTypeId: 'muro-terreno',
    params: { depthM: 3 },
    layers: [['cec-mw', 60], ['cec-ha-2300-2500', 300], ['cec-enlucido-yeso-1000-1300', 15]]
  },
  {
    id: 'forjado-garaje',
    group: 'Espacios no habitables',
    name: 'Forjado sobre garaje',
    description: 'Vivienda sobre garaje ventilado, con aislamiento bajo el forjado. Ajuste superficies y estanqueidad.',
    elementTypeId: 'no-habitable',
    params: { flow: 'downward', bMode: 'table', partitionAreaM2: 200, envelopeAreaM2: 250, airtightness: 4, insulationCase: 'nhe-no_hnh-yes' },
    layers: [['cec-mw', 60], ['cec-ha-2300-2500', 250], ['cec-mortero-1800-2000', 40], ['cec-baldosa-gres', 10]]
  }
];

/** Crea un elemento editable a partir de una plantilla, conservando zona y emplazamiento actuales. */
export function assemblyFromTemplate(template, current = {}) {
  return {
    id: createId('asm'),
    name: template.name,
    elementTypeId: template.elementTypeId,
    climateZone: current.climateZone ?? null,
    contextId: null,
    site: current.site ?? null,
    params: template.params ? { ...template.params } : null,
    isExample: false,
    templateId: template.id,
    layers: template.layers.map(([materialId, thicknessMm, name = null, extra = {}]) => ({
      id: createId('ly'), materialId, name, thicknessMm, lambda: null, lambdaOverride: false, ...extra
    }))
  };
}
