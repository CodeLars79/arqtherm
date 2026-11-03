import materialsData from './materials.json';
import cteMetadata from './cte/metadata.json';
import uValueLimits from './cte/uValueLimits.json';
import calculationData from './cte/calculationData.json';
import elementTypesData from './cte/elementTypes.json';
import climateZonesData from './cte/climateZones.json';

export { cteMetadata, uValueLimits, calculationData, climateZonesData };

export const referenceMaterials = materialsData.materials;
export const materialCategories = materialsData.categories;
export const materialSources = materialsData.sources;
export const materialsDatasetVersion = materialsData.datasetVersion;
export const elementTypes = elementTypesData.elementTypes;
export const supportedElementTypes = elementTypes.filter((e) => e.supported);
export const elementTypeGroups = elementTypesData.groups;

export const DATA_STATUS = {
  'reference-verified': {
    label: 'Referencia verificada',
    short: 'Verificado',
    description: 'Valor cotejado con el documento oficial citado.'
  },
  'reference-pending-check': {
    label: 'Referencia · pendiente de cotejo',
    short: 'Pendiente de cotejo',
    description: 'Valor transcrito de una fuente documentada, pendiente de cotejo con la versión oficial vigente. Los resultados que lo usan son ilustrativos.'
  },
  provisional: {
    label: 'Provisional',
    short: 'Provisional',
    description: 'Dato de ejemplo sin fuente verificada. No usar en proyecto.'
  },
  user: {
    label: 'Definido por el usuario',
    short: 'Usuario',
    description: 'Valor introducido por el usuario bajo su responsabilidad.'
  }
};

export const VALUE_TYPES = {
  design: 'Valor térmico de diseño',
  'design-generic-range-upper': 'Valor de diseño genérico (límite superior del rango tabulado)',
  'design-generic-default': 'Valor de diseño por defecto, dentro del rango tabulado',
  'design-element-resistance': 'Resistencia térmica de diseño del elemento completo',
  'cavity-procedure': 'Resistencia según procedimiento de cámaras de aire',
  declared: 'Valor declarado por el fabricante',
  user: 'Valor del usuario'
};

/** Construye el índice de materiales (referencia + usuario). */
export function buildMaterialsById(customMaterials = []) {
  const index = {};
  for (const m of referenceMaterials) index[m.id] = m;
  for (const m of customMaterials) index[m.id] = m;
  return index;
}

export function categoryLabel(id) {
  return materialCategories.find((c) => c.id === id)?.label ?? id;
}

export function zoneLabel(id) {
  return cteMetadata.climateZones.find((z) => z.id === id)?.label ?? id;
}
