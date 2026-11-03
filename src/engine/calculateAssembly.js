import { calculateLayerResistance, calculateFixedResistance } from './calculateLayerResistance.js';
import { calculateAirCavityResistance } from './calculateAirCavityResistance.js';
import { calculateTotalResistance } from './calculateTotalResistance.js';
import { calculateUValue } from './calculateUValue.js';
import { calculateTotalThickness } from './calculateThickness.js';
import { isPositiveFinite } from './units.js';
import {
  characteristicLength, slabCase1Us, slabCase2Us, wallUt, crawlSpaceUs, reductionFactorB, ventilationCase
} from './groundAndUnheated.js';

/** Métodos tabulados: U se lee en una tabla a partir de la resistencia de las capas (sin Rsi ni Rse). */
const TABLE_METHODS = ['ground-slab', 'ground-wall', 'crawl-space'];

/** Partición con espacio no habitable: resistencias superficiales de la tabla 6 según el flujo. */
const UNHEATED_FLOW = {
  horizontal: { surfaceKey: 'partitionHorizontalFlow', cavity: 'vertical', label: 'vertical (flujo horizontal)' },
  upward: { surfaceKey: 'partitionUpwardFlow', cavity: 'horizontal', label: 'horizontal, flujo ascendente (techo)' },
  downward: { surfaceKey: 'partitionDownwardFlow', cavity: null, label: 'horizontal, flujo descendente (suelo)' }
};

const num = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v));
const f = (n, d = 2) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });

export const LAYER_ORDER_NOTE = 'Capas ordenadas del exterior (primera) al interior (última).';

export const BASE_ASSUMPTIONS = [
  'Capas térmicamente homogéneas, paralelas entre sí y perpendiculares al flujo de calor (flujo unidimensional, régimen estacionario).',
  'No se incluyen puentes térmicos, fijaciones, juntas ni capas heterogéneas: el resultado es la transmitancia de la parte corriente del elemento.',
  'Las conductividades deben ser valores térmicos de diseño (DB-HE, HE1 5.1.7), no valores declarados sin corregir.',
  'Comparación y cálculo a precisión completa; el redondeo solo se aplica al mostrar los resultados.',
  LAYER_ORDER_NOTE
];

/** Clasifica la calidad de los datos de una capa. */
function layerDataStatus(layer, material) {
  if (layer.soil) return 'reference-pending-check';
  if (layer.lambdaOverride) return 'user';
  if (!material) return 'user';
  return material.dataStatus || 'provisional';
}

/** Determina cómo se caracteriza térmicamente la capa. */
function layerKind(layer, material) {
  if (material && material.airCavity) return 'air';
  if (material && isPositiveFinite(material.thermalResistance) && !layer.lambdaOverride) return 'fixed';
  return 'lambda';
}

/**
 * Calcula un elemento constructivo de capas.
 *
 * @param {object} assembly  { elementTypeId, layers: [{id, materialId, thicknessMm, lambda, lambdaOverride, name}], isExample }
 * @param {object} deps      { materialsById, elementTypes, calculationData }
 * @returns {object} resultado detallado; nunca devuelve NaN ni Infinity
 */
export function calculateAssembly(assembly, deps) {
  const { materialsById, elementTypes, calculationData } = deps;
  const issues = [];
  const assumptions = [...BASE_ASSUMPTIONS];

  const baseType = elementTypes.find((e) => e.id === assembly?.elementTypeId) || null;
  const params = assembly?.params && typeof assembly.params === 'object' ? assembly.params : {};
  const calcMethod = baseType?.calculationMethod || 'layers';
  let elementType = baseType;
  if (baseType && calcMethod === 'unheated-space') {
    const flow = UNHEATED_FLOW[params.flow] || UNHEATED_FLOW.horizontal;
    elementType = { ...baseType, surfaceResistanceKey: flow.surfaceKey, cavityOrientation: flow.cavity };
  }
  const isTableMethod = TABLE_METHODS.includes(calcMethod);
  let layersIn = Array.isArray(assembly?.layers) ? assembly.layers : [];

  const base = {
    status: 'incomplete',
    elementType,
    method: elementType?.method || null,
    layers: [],
    rsi: null,
    rse: null,
    surfaceResistance: null,
    layersSum: null,
    totalResistance: null,
    uValue: null,
    calculationMethod: calcMethod,
    special: null,
    totalThicknessMm: null,
    dataQuality: 'illustrative',
    assumptions,
    issues
  };

  if (!elementType) {
    issues.push({ code: 'element-type-missing', message: 'Seleccione un tipo de elemento.' });
    return base;
  }
  if (!elementType.supported) {
    issues.push({ code: 'element-type-unsupported', message: elementType.unsupportedReason });
    return { ...base, status: 'unsupported' };
  }

  const surface = isTableMethod ? null : calculationData.surfaceResistances[elementType.surfaceResistanceKey];
  if (!surface && !isTableMethod) {
    issues.push({ code: 'surface-resistance-missing', message: 'No hay resistencias superficiales definidas para este elemento.' });
    return base;
  }
  let rsi = surface ? surface.rsi : null;
  let rse = surface ? surface.rse : null;
  if (Array.isArray(elementType.assumptions)) assumptions.push(...elementType.assumptions);

  if (layersIn.length === 0) {
    issues.push({ code: 'no-layers', message: 'Añada al menos una capa para calcular el elemento.' });
    return { ...base, rsi, rse, surfaceResistance: surface };
  }

  const ground = calculationData.groundAndUnheated;
  if (calcMethod === 'buried-roof') {
    const soilMm = num(params.soilThicknessMm);
    if (!isPositiveFinite(soilMm)) {
      issues.push({ code: 'param-missing', message: 'Indique el espesor de tierras sobre la cubierta (mm).' });
      return { ...base, rsi, rse, surfaceResistance: surface };
    }
    layersIn = [{ id: 'soil', materialId: null, name: `Terreno (λ = ${f(ground.soilConductivity, 1)} W/(m·K))`, thicknessMm: soilMm, lambda: ground.soilConductivity, lambdaOverride: true, soil: true }, ...layersIn];
    assumptions.push(ground.soilReference);
  }

  // Cámara muy ventilada: se desprecian la cámara y todas las capas exteriores a ella.
  let veryVentilatedIndex = -1;
  layersIn.forEach((layer, index) => {
    const material = materialsById[layer.materialId];
    if (material?.airCavity === 'very') veryVentilatedIndex = index;
  });
  if (veryVentilatedIndex >= 0) {
    if (!elementType.allowVeryVentilated) {
      issues.push({
        code: 'very-ventilated-not-applicable',
        layerId: layersIn[veryVentilatedIndex].id,
        message: 'La regla de cámara muy ventilada del DA DB-HE/1 solo se aplica aquí a fachadas y cubiertas en contacto con el aire exterior.'
      });
    } else {
      rse = rsi;
      assumptions.push(calculationData.unventilatedAirCavities.veryVentilatedRule);
    }
  }

  let usesCavityTable = false;
  const layerResults = layersIn.map((layer, index) => {
    const material = materialsById[layer.materialId] || null;
    const kind = layerKind(layer, material);
    const dataStatus = layerDataStatus(layer, material);
    const name = layer.name || material?.name || 'Capa sin material';
    const excluded = veryVentilatedIndex >= 0 && elementType.allowVeryVentilated && index <= veryVentilatedIndex;
    const out = {
      id: layer.id,
      index,
      name,
      materialId: layer.materialId || null,
      kind,
      thicknessMm: isPositiveFinite(layer.thicknessMm) ? layer.thicknessMm : null,
      lambda: null,
      resistance: null,
      included: !excluded,
      excludedReason: excluded
        ? (index === veryVentilatedIndex
          ? 'Cámara muy ventilada: no se computa.'
          : 'Capa exterior a una cámara muy ventilada: no se computa.')
        : null,
      dataStatus,
      formula: null,
      error: null
    };

    // El espesor físico se valida siempre (también en capas excluidas).
    if (!isPositiveFinite(layer.thicknessMm)) {
      out.error = layer.thicknessMm === null || layer.thicknessMm === undefined
        ? 'Falta el espesor de la capa.'
        : 'El espesor debe ser un número finito mayor que cero.';
      issues.push({ code: 'layer-invalid', layerId: layer.id, message: `${name}: ${out.error}` });
      return out;
    }
    if (!material && !layer.lambdaOverride) {
      out.error = 'Seleccione un material o introduzca una conductividad λ.';
      issues.push({ code: 'layer-invalid', layerId: layer.id, message: `${name}: ${out.error}` });
      return out;
    }
    if (excluded) return out;

    let result;
    if (kind === 'air') {
      if (material.airCavity === 'very') {
        return out; // no aplicable (ya informado arriba)
      }
      usesCavityTable = true;
      result = calculateAirCavityResistance(
        layer.thicknessMm,
        elementType.cavityOrientation,
        material.airCavity,
        calculationData.unventilatedAirCavities
      );
      if (result.ok) {
        out.formula = material.airCavity === 'slightly'
          ? 'R = ½ · R(tabla 2, DA DB-HE/1)'
          : 'R según tabla 2, DA DB-HE/1 (interpolación lineal)';
      }
    } else if (kind === 'fixed') {
      result = calculateFixedResistance(layer.thicknessMm, material.thermalResistance, material.thicknessRangeMm);
      if (result.ok) out.formula = 'R tabulada para la fábrica completa (CEC)';
    } else {
      const lambda = layer.lambdaOverride ? layer.lambda : material?.thermalConductivity;
      out.lambda = isPositiveFinite(lambda) ? lambda : null;
      result = calculateLayerResistance(layer.thicknessMm, lambda);
      if (result.ok) out.formula = layer.soil ? 'R = d / λ, terreno según DA DB-HE/1 2.1.2.3' : 'R = d / λ';
      if (layer.soil) out.soil = true;
    }

    if (!result.ok) {
      out.error = result.error.message;
      issues.push({ code: result.error.code, layerId: layer.id, message: `${name}: ${result.error.message}` });
      return out;
    }
    out.resistance = result.value;
    return out;
  });

  if (usesCavityTable) {
    assumptions.push(calculationData.unventilatedAirCavities.assumptionNote);
    assumptions.push(...calculationData.unventilatedAirCavities.conditions);
  }

  const totalThicknessMm = calculateTotalThickness(layerResults.map((l) => l.thicknessMm));
  const included = layerResults.filter((l) => l.included);
  const hasLayerErrors = layerResults.some((l) => l.error) ||
    issues.some((i) => i.code === 'very-ventilated-not-applicable');

  const result = {
    ...base,
    layers: layerResults,
    rsi,
    rse,
    surfaceResistance: surface,
    totalThicknessMm
  };

  if (hasLayerErrors) return result;
  if (included.length === 0) {
    issues.push({ code: 'no-included-layers', message: 'No queda ninguna capa computable en el elemento.' });
    return result;
  }

  let total;
  let uValue;
  let special = null;
  if (isTableMethod) {
    const sum = included.reduce((acc, l) => acc + l.resistance, 0);
    const tabulated = tabulatedU(calcMethod, params, sum, included, materialsById, ground, issues);
    if (!tabulated) return { ...result, layersSum: sum };
    total = { layersSum: sum, value: null };
    uValue = tabulated.value;
    special = tabulated.special;
    assumptions.push(...tabulated.assumptions);
  } else {
    total = calculateTotalResistance(rsi, included.map((l) => l.resistance), rse);
    if (!total.ok) {
      issues.push({ code: total.error.code, message: total.error.message });
      return result;
    }
    const u = calculateUValue(total.value);
    if (!u.ok) {
      issues.push({ code: u.error.code, message: u.error.message });
      return result;
    }
    uValue = u.value;
    if (calcMethod === 'unheated-space') {
      const b = unheatedB(params, ground, issues);
      if (!b) return { ...result, layersSum: total.layersSum, totalResistance: total.value };
      special = {
        kind: 'unheated-space',
        title: 'Partición con espacio no habitable · U = Up · b',
        up: uValue,
        b: b.value,
        inputs: b.inputs,
        steps: [
          `Up = 1 / RT = 1 / ${f(total.value, 4)} = ${f(uValue, 4)} W/(m²·K) (resistencias superficiales de la tabla 6, partición ${(UNHEATED_FLOW[params.flow] || UNHEATED_FLOW.horizontal).label})`,
          b.step,
          `U = Up · b = ${f(uValue, 4)} · ${f(b.value, 2)} = ${f(uValue * b.value, 4)} W/(m²·K)`
        ],
        table: b.table,
        notes: []
      };
      uValue *= b.value;
      assumptions.push('U = Up · b (DA DB-HE/1, expresión 6), con Up calculada con las resistencias superficiales de particiones interiores de la tabla 6.');
    }
    if (calcMethod === 'buried-roof') {
      special = {
        kind: 'buried-roof',
        title: 'Cubierta enterrada',
        inputs: [{ label: 'Espesor de tierras', value: `${f(num(params.soilThicknessMm), 0)} mm` }],
        steps: [`RT = ${f(rsi, 2)} + ${f(total.layersSum, 4)} + ${f(rse, 2)} = ${f(total.value, 4)} m²·K/W, con el terreno como capa (λ = ${f(ground.soilConductivity, 1)} W/(m·K))`],
        notes: []
      };
    }
    if (baseType.id === 'cubierta' && params.invertedRoof === true) {
      const corr = invertedRoofCorrection(params, layerResults, materialsById, total.value, uValue, issues);
      if (!corr) return { ...result, layersSum: total.layersSum, totalResistance: total.value };
      special = {
        kind: 'inverted-roof',
        title: 'Cubierta invertida · corrección por agua de lluvia (UNE-EN ISO 6946)',
        u0: uValue,
        deltaU: corr.deltaU,
        inputs: corr.inputs,
        steps: [
          `RT = ${f(rsi, 2)} + ${f(total.layersSum, 4)} + ${f(rse, 2)} = ${f(total.value, 4)} m²·K/W · U₀ = 1 / RT = ${f(uValue, 4)} W/(m²·K)`,
          `ΔUr = p · f · x · (R1 / RT)² = ${f(corr.p, 2)} · ${f(corr.f, 2)} · 0,04 · (${f(corr.r1, 3)} / ${f(total.value, 3)})² = ${f(corr.deltaU, 4)} W/(m²·K)`,
          `U = U₀ + ΔUr = ${f(uValue, 4)} + ${f(corr.deltaU, 4)} = ${f(uValue + corr.deltaU, 4)} W/(m²·K)`
        ],
        notes: corr.notes
      };
      uValue += corr.deltaU;
      assumptions.push('Corrección opcional de cubierta invertida según UNE-EN ISO 6946 (anexo F): ΔUr = p · f · x · (R1/RT)², con x = 0,04 W·día/(m²·K·mm). No forma parte del DA DB-HE/1.');
    }
  }

  const statuses = layerResults.filter((l) => l.included).map((l) => l.dataStatus);
  let dataQuality = 'verified';
  if (statuses.some((s) => s === 'user')) dataQuality = 'user';
  if (assembly.isExample || statuses.some((s) => s === 'reference-pending-check' || s === 'provisional')) {
    dataQuality = 'illustrative';
  }

  return {
    ...result,
    status: 'complete',
    layersSum: total.layersSum,
    totalResistance: total.value,
    uValue,
    special,
    dataQuality
  };
}


/** U tabulada (tablas 3, 4, 5 o 9) a partir de ΣR de las capas y de los parámetros del elemento. */
function tabulatedU(method, params, sumR, included, materialsById, ground, issues) {
  const T = ground.tables;
  const fail = (message) => { issues.push({ code: 'param-missing', message }); return null; };

  if (method === 'ground-wall') {
    const z = num(params.depthM);
    if (!(z > 0)) return fail('Indique la profundidad z de la parte enterrada del muro (m).');
    const r = wallUt({ rm: sumR, depthM: z }, T.T5);
    if (!r.ok) return fail(r.error);
    return {
      value: r.value,
      assumptions: ['Rm es la resistencia térmica de las capas del muro sin resistencias superficiales (DA DB-HE/1, 2.1.2.2). Muro de composición uniforme en toda su altura enterrada.'],
      special: {
        kind: 'ground-wall',
        title: 'Muro en contacto con el terreno',
        table: T.T5,
        inputs: [
          { label: 'Rm (ΣR capas)', value: `${f(sumR, 3)} m²·K/W` },
          { label: 'Profundidad z', value: `${f(z, 2)} m` }
        ],
        steps: [`UT = tabla 5 (Rm = ${f(sumR, 3)} m²·K/W; z = ${f(z, 2)} m), interpolación lineal = ${f(r.value, 4)} W/(m²·K)`],
        notes: r.notes
      }
    };
  }

  const bPrime = characteristicLength(params.areaM2, params.perimeterM);
  if (bPrime === null) return fail('Indique la superficie A del suelo (m²) y su perímetro expuesto P (m) para calcular B\'.');
  const bInputs = [
    { label: 'Superficie A', value: `${f(num(params.areaM2), 2)} m²` },
    { label: 'Perímetro expuesto P', value: `${f(num(params.perimeterM), 2)} m` },
    { label: 'B\' = A / (0,5 · P)', value: `${f(bPrime, 2)} m` }
  ];

  if (method === 'crawl-space') {
    if (params.crawlConditionsMet !== true) {
      return fail('Confirme que la cámara sanitaria está ventilada por el exterior, tiene una altura h ≤ 1 m y el suelo está a z ≤ 0,5 m bajo el terreno exterior (DA DB-HE/1, 2.1.3.2).');
    }
    const r = crawlSpaceUs({ bPrime, rf: sumR }, T.T9);
    return {
      value: r.value,
      assumptions: ['Rf es la resistencia térmica del forjado sanitario sin resistencias superficiales.', ...T.T9.conditions],
      special: {
        kind: 'crawl-space',
        title: 'Suelo sobre cámara sanitaria',
        table: T.T9,
        inputs: [...bInputs, { label: 'Rf (ΣR capas)', value: `${f(sumR, 3)} m²·K/W` }],
        steps: [`Us = tabla 9 (B' = ${f(bPrime, 2)} m; Rf = ${f(sumR, 3)} m²·K/W), interpolación lineal = ${f(r.value, 4)} W/(m²·K)`],
        notes: r.notes
      }
    };
  }

  // Solera o losa
  const z = num(params.depthM);
  const depth = Number.isFinite(z) && z >= 0 ? z : 0;
  if (depth > 0.5) {
    const r = slabCase2Us({ bPrime, depthM: depth, rf: sumR }, T.T4);
    if (!r.ok) return fail(r.error);
    return {
      value: r.value,
      assumptions: ['Caso 2: solera o losa a más de 0,50 m bajo el terreno. Rf es la resistencia de las capas sin resistencias superficiales.'],
      special: {
        kind: 'ground-slab',
        title: 'Solera en contacto con el terreno · caso 2 (z > 0,5 m)',
        table: T.T4,
        inputs: [...bInputs, { label: 'Profundidad z', value: `${f(depth, 2)} m (${r.band.label})` }, { label: 'Rf (ΣR capas)', value: `${f(sumR, 3)} m²·K/W` }],
        steps: [`Us = tabla 4 (${r.band.label}; B' = ${f(bPrime, 2)} m; Rf = ${f(sumR, 3)} m²·K/W), interpolación lineal = ${f(r.value, 4)} W/(m²·K)`],
        notes: r.notes
      }
    };
  }

  const mode = params.insulation || 'none';
  let ra = 0;
  let raSource = 'Sin aislamiento: Ra = 0.';
  if (mode !== 'none') {
    const manual = num(params.raManual);
    if (params.raMode === 'manual') {
      if (!(manual >= 0)) return fail('Indique la resistencia térmica Ra del aislamiento (m²·K/W).');
      ra = manual;
      raSource = `Ra introducida por el usuario: ${f(ra, 2)} m²·K/W.`;
    } else {
      const ins = included.filter((l) => materialsById[l.materialId]?.category === 'insulation');
      if (ins.length === 0) return fail('No hay capas de aislamiento térmico en la composición: añádalas o introduzca Ra manualmente.');
      ra = ins.reduce((acc, l) => acc + l.resistance, 0);
      raSource = `Ra = Σ R de las capas de aislamiento (${ins.map((l) => l.name).join(', ')}) = ${f(ra, 3)} m²·K/W.`;
    }
  }
  const d = mode === 'full' ? 1.5 : num(params.bandWidthM);
  if (mode === 'band' && !(d > 0)) return fail('Indique el ancho D de la banda de aislamiento perimetral (m).');
  const r = slabCase1Us({ bPrime, bandWidthM: mode === 'none' ? 0.5 : d, ra }, T.T3);
  if (!r.ok) return fail(r.error);
  const modeLabel = { none: 'sin aislamiento', band: `banda perimetral D = ${f(d, 2)} m`, full: 'aislamiento en toda la superficie (D ≥ 1,5 m)' }[mode];
  return {
    value: r.value,
    assumptions: [
      'Caso 1: solera o losa apoyada sobre el terreno o como máximo 0,50 m por debajo de él (DA DB-HE/1, 2.1.2.1).',
      raSource,
      'B\' se calcula con el perímetro expuesto (en contacto con el exterior o con espacios no calefactados).'
    ],
    special: {
      kind: 'ground-slab',
      title: 'Solera en contacto con el terreno · caso 1 (z ≤ 0,5 m)',
      table: T.T3,
      inputs: [...bInputs, { label: 'Profundidad z', value: `${f(depth, 2)} m` }, { label: 'Aislamiento', value: modeLabel }, { label: 'Ra', value: `${f(ra, 3)} m²·K/W` }],
      steps: [`Us = tabla 3 (B' = ${f(bPrime, 2)} m; ${modeLabel}; Ra = ${f(ra, 3)} m²·K/W), interpolación lineal = ${f(r.value, 4)} W/(m²·K)`],
      notes: r.notes
    }
  };
}

/** Coeficiente b (tabla 7) o valor conocido introducido por el usuario. */
function unheatedB(params, ground, issues) {
  const T7 = ground.tables.T7;
  if (params.bMode === 'manual') {
    const b = num(params.bManual);
    if (!(b > 0 && b <= 1)) {
      issues.push({ code: 'param-missing', message: 'Introduzca un coeficiente b entre 0 y 1.' });
      return null;
    }
    return {
      value: b,
      inputs: [{ label: 'b', value: `${f(b, 2)} (introducido por el usuario, p. ej. según la expresión 7)` }],
      step: `b = ${f(b, 2)} (valor del usuario)`,
      table: null
    };
  }
  const ratio = num(params.partitionAreaM2) / num(params.envelopeAreaM2);
  const r = reductionFactorB({ ratio, groupId: params.insulationCase, airtightnessLevel: params.airtightness }, T7);
  if (!r.ok) {
    issues.push({ code: 'param-missing', message: r.error });
    return null;
  }
  const level = ground.tables.T8.levels.find((l) => l.level === Number(params.airtightness));
  return {
    value: r.value,
    inputs: [
      { label: 'Ah-nh / Anh-e', value: `${f(num(params.partitionAreaM2), 2)} / ${f(num(params.envelopeAreaM2), 2)} = ${f(ratio, 2)} (fila ${r.row.label})` },
      { label: 'Estanqueidad', value: `Nivel ${level.level}: ${level.label} → caso ${ventilationCase(level.level)}` },
      { label: 'Aislamiento', value: r.group.label },
      { label: 'b', value: f(r.value, 2) }
    ],
    step: `b = tabla 7 (${r.group.label}; caso ${r.case}; Ah-nh/Anh-e = ${f(ratio, 2)}) = ${f(r.value, 2)}`,
    table: T7
  };
}


/** Factores de drenaje f (UNE-EN ISO 6946, anexo F; valores recogidos en el BBA Information Bulletin 4). */
export const DRAINAGE_FACTORS = [
  { id: '1', value: 1, label: 'Juntas a tope y acabado abierto (p. ej. grava)' },
  { id: '0.75', value: 0.75, label: 'Juntas a media madera y acabado abierto' },
  { id: '0.5', value: 0.5, label: 'Cubierta ajardinada o acabado de hormigón continuo' }
];

/** ΔUr de cubierta invertida. R1 es la resistencia del aislamiento situado sobre la impermeabilización. */
function invertedRoofCorrection(params, layerResults, materialsById, rt, u0, issues) {
  const fail = (message) => { issues.push({ code: 'param-missing', message }); return null; };
  const p = num(params.rainMmDay);
  if (!(p >= 0) || !Number.isFinite(p)) return fail('Corrección de cubierta invertida: indique la precipitación media diaria p durante la temporada de calefacción (mm/día).');
  const fOpt = DRAINAGE_FACTORS.find((d) => d.id === String(params.drainageFactor ?? '1'));
  if (!fOpt) return fail('Corrección de cubierta invertida: seleccione el factor de drenaje f.');
  const candidates = layerResults.filter((l) => l.included && materialsById[l.materialId]?.category === 'insulation');
  const layer = layerResults.find((l) => l.id === params.invertedInsulationLayerId && l.included) || candidates[0];
  if (!layer) return fail('Corrección de cubierta invertida: no hay ninguna capa de aislamiento sobre la impermeabilización.');
  const r1 = layer.resistance;
  const deltaU = p * fOpt.value * 0.04 * (r1 / rt) ** 2;
  const notes = [];
  if (deltaU < 0.03 * u0) notes.push(`ΔUr es menor que el 3 % de U₀ (${(100 * deltaU / u0).toFixed(1).replace('.', ',')} %): la norma permite despreciarla. Se aplica igualmente, del lado de la seguridad.`);
  return {
    p, f: fOpt.value, r1, deltaU, notes,
    inputs: [
      { label: 'Precipitación p', value: `${f(p, 2)} mm/día (temporada de calefacción)` },
      { label: 'Factor de drenaje f', value: `${f(fOpt.value, 2)} · ${fOpt.label}` },
      { label: 'Aislamiento sobre la impermeabilización', value: `${layer.name}: R1 = ${f(r1, 3)} m²·K/W` },
      { label: 'ΔUr', value: `${f(deltaU, 4)} W/(m²·K) (${f(100 * deltaU / u0, 1)} % de U₀)` }
    ]
  };
}
