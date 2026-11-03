import { jsPDF } from 'jspdf';
import { registerFonts } from './fonts.js';
import { temperatureProfile } from './temperatureProfile.js';
import { insulationHatchPoints } from './insulationHatch.js';
import { formatNumber, formatU } from '../engine/index.js';
import { zoneLabel, DATA_STATUS } from '../data/index.js';
import { APP_NAME, APP_VERSION } from '../config.js';

/* ─────────────────────────── Paleta y medidas ─────────────────────────── */
const C = {
  ink: [22, 24, 26],
  ink2: [91, 95, 100],
  ink3: [138, 142, 147],
  rule: [226, 226, 221],
  ruleStrong: [201, 201, 195],
  paper: [246, 246, 244],
  white: [255, 255, 255],
  accent: [31, 90, 110],
  accentSoft: [231, 239, 241],
  ok: [45, 106, 58], okBg: [235, 244, 237],
  warn: [131, 86, 0], warnBg: [251, 244, 228],
  fail: [154, 43, 43], failBg: [251, 236, 236],
  neutral: [91, 95, 100], neutralBg: [240, 240, 236],
  cold: [52, 110, 160],
  warm: [190, 70, 45],
  insulationLine: [0, 0, 0],
  hatch: [0, 0, 0]
};
const SWATCH = {
  insulation: [255, 252, 225],
  ceramic: [255, 190, 145],
  concrete: [174, 176, 171],
  stone: [147, 141, 130],
  timber: [201, 166, 118],
  gypsum: [236, 235, 229],
  air: [255, 255, 255],
  other: [127, 141, 151]
};
const PAGE_W = 210;
const PAGE_H = 297;
const M = 16;               // margen
const W = PAGE_W - 2 * M;   // ancho útil
const FOOT = 14;            // reserva del pie

const THETA_I = 20;
const THETA_E = 0;

/* ─────────────────────────── Utilidades de dibujo ─────────────────────── */
const fill = (doc, c) => doc.setFillColor(c[0], c[1], c[2]);
const stroke = (doc, c) => doc.setDrawColor(c[0], c[1], c[2]);
const ink = (doc, c) => doc.setTextColor(c[0], c[1], c[2]);

function font(doc, weight, size, color = C.ink) {
  if (weight === 'bold') doc.setFont('Inter', 'bold');
  else if (weight === 'semi') doc.setFont('InterSemi', 'normal');
  else doc.setFont('Inter', 'normal');
  doc.setFontSize(size);
  ink(doc, color);
}

/** Texto con ajuste de línea; devuelve la nueva coordenada y. */
function para(doc, text, x, y, width, { size = 9, weight = 'normal', color = C.ink, lh = 1.42 } = {}) {
  font(doc, weight, size, color);
  const lines = doc.splitTextToSize(text, width);
  const step = (size * lh) / 2.835; // pt → mm
  lines.forEach((line, i) => doc.text(line, x, y + i * step, { baseline: 'top' }));
  return y + lines.length * step;
}

function label(doc, text, x, y, color = C.ink3) {
  font(doc, 'semi', 6.6, color);
  doc.setCharSpace(0.35);
  doc.text(text.toUpperCase(), x, y, { baseline: 'top' });
  doc.setCharSpace(0);
}

function hr(doc, y, color = C.rule, x1 = M, x2 = PAGE_W - M) {
  stroke(doc, color);
  doc.setLineWidth(0.25);
  doc.line(x1, y, x2, y);
}

/** Pastilla de estado con punto: el estado no depende solo del color. */
function pill(doc, text, x, y, tone) {
  const map = { ok: [C.ok, C.okBg], warn: [C.warn, C.warnBg], fail: [C.fail, C.failBg], neutral: [C.neutral, C.neutralBg], info: [C.accent, C.accentSoft] };
  const [fg, bg] = map[tone] || map.neutral;
  font(doc, 'semi', 7.2, fg);
  const w = doc.getTextWidth(text) + 8;
  fill(doc, bg);
  doc.roundedRect(x, y, w, 5.4, 2.7, 2.7, 'F');
  fill(doc, fg);
  doc.circle(x + 2.6, y + 2.7, 0.85, 'F');
  doc.text(text, x + 4.6, y + 2.75, { baseline: 'middle' });
  return w;
}

/** Rayado dentro de un rectángulo (recorte). */
function hatch(doc, x, y, w, h, kind) {
  doc.saveGraphicsState();
  doc.rect(x, y, w, h, null);
  doc.clip();
  doc.discardPath();
  // Tramas en línea fina negra (0,05 mm)
  doc.setLineWidth(0.05);
  if (kind === 'insulation') {
    // Símbolo de aislamiento: lazos que ocupan todo el ancho de la capa (véase insulationHatch.js)
    const pts = insulationHatchPoints(w, h);
    if (pts.length > 1) {
      stroke(doc, C.insulationLine);
      doc.setLineJoin('round');
      const segs = [];
      for (let i = 1; i < pts.length; i += 1) segs.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
      doc.lines(segs, x + pts[0][0], y + pts[0][1], [1, 1], 'S', false);
    }
  } else if (kind === 'ceramic' || kind === 'stone') {
    stroke(doc, C.hatch);
    for (let d = -h; d < w + h; d += 2.4) doc.line(x + d, y + h, x + d + h, y);
  } else if (kind === 'concrete') {
    fill(doc, C.hatch);
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < (w * h) / 5; i += 1) doc.circle(x + rnd() * w, y + rnd() * h, 0.12, 'F');
  } else if (kind === 'timber') {
    stroke(doc, C.hatch);
    for (let yy = y + 1.5; yy < y + h; yy += 2.2) doc.line(x, yy, x + w, yy + 0.4);
  } else if (kind === 'gypsum') {
    fill(doc, C.hatch);
    for (let yy = y + 1; yy < y + h; yy += 1.8) for (let xx = x + 0.6; xx < x + w; xx += 1.8) doc.circle(xx, yy, 0.07, 'F');
  }
  doc.restoreGraphicsState();
}

/* ─────────────────────────── Estados y textos ─────────────────────────── */
function resultTone(calculation) {
  if (calculation.status === 'unsupported') return ['No soportado', 'fail'];
  if (calculation.status !== 'complete') return ['Incompleto', 'neutral'];
  if (calculation.dataQuality === 'verified') return ['Datos verificados', 'ok'];
  if (calculation.dataQuality === 'user') return ['Datos del usuario', 'info'];
  return ['Ilustrativo', 'warn'];
}

function complianceTone(compliance) {
  if (compliance.state === 'complies') return ['Cumple', 'ok'];
  if (compliance.state === 'not-complies') return ['No cumple', 'fail'];
  return ['No disponible', 'neutral'];
}

function orientativeTone(orientative) {
  if (!orientative) return ['No disponible', 'neutral'];
  if (orientative.state === 'within') return ['Dentro del valor', 'ok'];
  if (orientative.state === 'above') return ['Por encima', 'warn'];
  return ['No disponible', 'neutral'];
}

const mm = (v) => (typeof v === 'number' && Number.isFinite(v) ? `${formatNumber(v, v % 1 === 0 ? 0 : 1)} mm` : '—');

/* ─────────────────────────── Bloques de página ────────────────────────── */
function header(doc, now, metadata) {
  // Marca: tres bandas, como una sección constructiva
  fill(doc, C.accent);
  doc.setGState(new doc.GState({ opacity: 0.45 }));
  doc.rect(M, 13.2, 1.6, 6, 'F');
  doc.setGState(new doc.GState({ opacity: 1 }));
  doc.rect(M + 2.2, 13.2, 3.2, 6, 'F');
  doc.setGState(new doc.GState({ opacity: 0.75 }));
  doc.rect(M + 6, 13.2, 1.2, 6, 'F');
  doc.setGState(new doc.GState({ opacity: 1 }));
  font(doc, 'bold', 12.5, C.ink);
  doc.text('Arq', M + 9.6, 16.4, { baseline: 'middle' });
  const w = doc.getTextWidth('Arq');
  font(doc, 'normal', 12.5, C.ink2);
  doc.text('therm', M + 9.6 + w, 16.4, { baseline: 'middle' });

  const date = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(now);
  font(doc, 'semi', 7.5, C.ink);
  doc.text('Informe de transmitancia térmica', PAGE_W - M, 14.6, { align: 'right', baseline: 'middle' });
  font(doc, 'normal', 7, C.ink3);
  doc.text(`${date} · datos reglamentarios v${metadata.datasetVersion}`, PAGE_W - M, 18.4, { align: 'right', baseline: 'middle' });
  hr(doc, 23, C.ink);
}

function footer(doc, page, total) {
  hr(doc, PAGE_H - 12.5);
  font(doc, 'normal', 6.8, C.ink3);
  doc.text(
    `${APP_NAME} v${APP_VERSION} · Herramienta de apoyo: no sustituye la verificación del técnico competente.`,
    M, PAGE_H - 8.6, { baseline: 'middle' }
  );
  doc.text(`${page} / ${total}`, PAGE_W - M, PAGE_H - 8.6, { align: 'right', baseline: 'middle' });
}

function titleBlock(doc, y, { assembly, calculation }) {
  const typeLabel = calculation.elementType?.shortLabel ?? 'Elemento';
  label(doc, `Elemento · ${typeLabel}`, M, y, C.accent);
  y += 4.8;
  font(doc, 'semi', 19, C.ink);
  const lines = doc.splitTextToSize(assembly.name || 'Elemento sin nombre', W);
  lines.slice(0, 2).forEach((l, i) => doc.text(l, M, y + i * 7.6, { baseline: 'top' }));
  y += Math.min(lines.length, 2) * 7.6 + 1.6;

  const zone = assembly.climateZone ? `Zona climática de invierno ${zoneLabel(assembly.climateZone)}` : 'Zona climática no indicada';
  const meta = [
    calculation.elementType?.label,
    zone,
    `Espesor total ${mm(calculation.totalThicknessMm)}`,
    `${calculation.layers.length} capas`
  ].filter(Boolean).join('   ·   ');
  return para(doc, meta, M, y, W, { size: 8, color: C.ink2 }) + 6;
}

const TABLE_METHODS = ['ground-slab', 'ground-wall', 'crawl-space'];
const isTabulated = (c) => TABLE_METHODS.includes(c.calculationMethod);
const R_SYMBOL = { 'ground-slab': 'Rf', 'ground-wall': 'Rm', 'crawl-space': 'Rf' };
const TABLE_NAME = { 'ground-slab': 'Tablas 3-4', 'ground-wall': 'Tabla 5', 'crawl-space': 'Tabla 9' };

function heroFacts(calculation) {
  if (isTabulated(calculation)) {
    return [
      [`${R_SYMBOL[calculation.calculationMethod]} (ΣR capas)`, `${formatNumber(calculation.layersSum, 3)} m²·K/W`],
      ['Procedimiento', TABLE_NAME[calculation.calculationMethod]],
      ['Rsi + Rse', 'Incluidas']
    ];
  }
  if (calculation.calculationMethod === 'unheated-space' && calculation.special) {
    return [
      ['Up partición', `${formatU(calculation.special.up)}`],
      ['Coeficiente b', formatNumber(calculation.special.b, 2)],
      ['RT partición', `${formatNumber(calculation.totalResistance, 3)} m²·K/W`]
    ];
  }
  return [
    ['RT', `${formatNumber(calculation.totalResistance, 3)} m²·K/W`],
    ['ΣR capas', `${formatNumber(calculation.layersSum, 3)}`],
    ['Rsi + Rse', calculation.rsi !== null ? formatNumber(calculation.rsi + calculation.rse, 2) : '—']
  ];
}

function heroBlock(doc, y, { calculation, compliance, orientative }) {
  const h = 40;
  const leftW = 84;
  // Valor U
  fill(doc, C.paper);
  doc.roundedRect(M, y, leftW, h, 1.6, 1.6, 'F');
  label(doc, 'Transmitancia térmica U', M + 6, y + 5.5);
  const complete = calculation.status === 'complete';
  font(doc, 'bold', 38, C.ink);
  const uText = complete ? formatU(calculation.uValue) : '—';
  doc.text(uText, M + 5.2, y + 23, { baseline: 'alphabetic' });
  const uw = doc.getTextWidth(uText);
  font(doc, 'normal', 9.5, C.ink2);
  doc.text('W/(m²·K)', M + 7.5 + uw, y + 23, { baseline: 'alphabetic' });

  const facts = heroFacts(calculation);
  const colW = (leftW - 12) / 3;
  facts.forEach(([k, v], i) => {
    const x = M + 6 + i * colW;
    font(doc, 'normal', 6.6, C.ink3);
    doc.text(k, x, y + 29.5, { baseline: 'top' });
    font(doc, 'semi', 8.2, C.ink);
    doc.text(v, x, y + 33.2, { baseline: 'top' });
  });

  // Estados
  const x0 = M + leftW + 8;
  const rows = [
    ['Calidad del resultado', resultTone(calculation), complete ? (calculation.dataQuality === 'illustrative' ? 'Incluye datos pendientes de cotejo o es un ejemplo' : calculation.dataQuality === 'user' ? 'Incluye valores del usuario' : 'Datos de referencia cotejados') : 'Faltan datos o no son válidos'],
    ['DB-HE · valor límite (exigencia)', complianceTone(compliance), compliance.state === 'unavailable' ? compliance.reasons[0] : `U ${compliance.state === 'complies' ? '≤' : '>'} Ulim = ${formatNumber(compliance.limit, 2)} W/(m²·K) · ${compliance.lookup.table.id === 'HE1-3.2' ? 'tabla 3.2-HE1' : 'tabla 3.1.1.a-HE1'}`],
    ['DB-HE · Anejo E (orientativo)', orientativeTone(orientative), !orientative || orientative.state === 'unavailable' ? (orientative?.reasons?.[0] ?? '—') : `U ${orientative.state === 'within' ? '≤' : '>'} Uorient = ${formatNumber(orientative.value, 2)} W/(m²·K) · tabla a-Anejo E`]
  ];
  rows.forEach(([title, [text, tone], detail], i) => {
    const yy = y + i * 13.6;
    font(doc, 'normal', 6.8, C.ink3);
    doc.text(title, x0, yy + 1, { baseline: 'top' });
    pill(doc, text, x0, yy + 4.4, tone);
    const pw = doc.getTextWidth(text) + 8;
    font(doc, 'normal', 7.2, C.ink2);
    const avail = PAGE_W - M - (x0 + pw + 3);
    const line = doc.splitTextToSize(detail || '', avail)[0] ?? '';
    doc.text(line, x0 + pw + 3, yy + 7.1, { baseline: 'middle' });
    if (i < 2) hr(doc, yy + 12.4, C.rule, x0, PAGE_W - M);
  });
  return y + h + 9;
}

/** Sección constructiva a escala con el perfil de temperaturas superpuesto. */
const OUTER_SIDE = { 'ground-slab': 'TERRENO', 'ground-wall': 'TERRENO', 'crawl-space': 'CÁMARA', 'unheated-space': 'NO HABIT.', 'buried-roof': 'EXTERIOR' };

function sectionBlock(doc, y, { calculation, materialsById }) {
  const withProfile = !calculation.special || ['buried-roof', 'inverted-roof'].includes(calculation.special.kind);
  label(doc, withProfile ? 'Sección constructiva y perfil de temperaturas' : 'Sección constructiva', M, y);
  font(doc, 'normal', 7, C.ink3);
  doc.text('Exterior → interior · anchuras proporcionales al espesor', PAGE_W - M, y, { align: 'right', baseline: 'top' });
  y += 6;

  const layers = calculation.layers;
  const h = 62;
  const airW = 20;
  const wallX = M + airW;
  const wallW = W - 2 * airW;
  const valid = layers.every((l) => l.thicknessMm);
  const total = valid ? layers.reduce((a, l) => a + l.thicknessMm, 0) : layers.length;
  const minW = 3.2;
  // Anchuras con mínimo legible, reescaladas para llenar el muro
  let widths = layers.map((l) => (valid ? (l.thicknessMm / total) * wallW : wallW / layers.length));
  widths = widths.map((w) => Math.max(w, minW));
  const scale = wallW / widths.reduce((a, b) => a + b, 0);
  widths = widths.map((w) => w * scale);

  // Aire exterior / interior
  fill(doc, [238, 243, 247]);
  doc.rect(M, y, airW, h, 'F');
  fill(doc, [250, 241, 236]);
  doc.rect(PAGE_W - M - airW, y, airW, h, 'F');
  font(doc, 'semi', 6.6, C.cold);
  doc.text(OUTER_SIDE[calculation.calculationMethod] || 'EXTERIOR', M + airW / 2, y + 3.4, { align: 'center', baseline: 'top' });
  font(doc, 'semi', 6.6, C.warm);
  doc.text('INTERIOR', PAGE_W - M - airW / 2, y + 3.4, { align: 'center', baseline: 'top' });

  // Capas
  const xs = [wallX];
  layers.forEach((l, i) => {
    const x = xs[i];
    const w = widths[i];
    xs.push(x + w);
    const cat = materialsById[l.materialId]?.category || 'other';
    fill(doc, SWATCH[cat] || SWATCH.other);
    doc.rect(x, y, w, h, 'F');
    hatch(doc, x, y, w, h, cat);
    if (!l.included) {
      doc.setGState(new doc.GState({ opacity: 0.55 }));
      fill(doc, C.white);
      doc.rect(x, y, w, h, 'F');
      doc.setGState(new doc.GState({ opacity: 1 }));
    }
    stroke(doc, C.ink);
    doc.setLineWidth(0.3);
    doc.rect(x, y, w, h, 'S');
    // Número de capa
    fill(doc, C.white);
    doc.circle(x + w / 2, y + h - 4, 2.1, 'F');
    stroke(doc, C.ink);
    doc.setLineWidth(0.2);
    doc.circle(x + w / 2, y + h - 4, 2.1, 'S');
    font(doc, 'semi', 6.4, C.ink);
    doc.text(String(i + 1), x + w / 2, y + h - 3.95, { align: 'center', baseline: 'middle' });
  });

  // Perfil de temperaturas (θi = 20 °C, θe = 0 °C)
  // El perfil θi/θe solo tiene sentido con aire exterior a ambos lados del cálculo por capas.
  const prof = calculation.special && !['buried-roof', 'inverted-roof'].includes(calculation.special.kind)
    ? null
    : temperatureProfile(calculation, THETA_I, THETA_E);
  const top = y + 9;
  const bottom = y + h - 10;
  const ty = (t) => bottom - ((t - THETA_E) / (THETA_I - THETA_E)) * (bottom - top);
  if (prof) {
    // Rejilla de referencia
    doc.setLineDashPattern([0.6, 0.9], 0);
    stroke(doc, C.ink3);
    doc.setLineWidth(0.15);
    [0, 10, 20].forEach((t) => doc.line(M, ty(t), PAGE_W - M, ty(t)));
    doc.setLineDashPattern([], 0);
    font(doc, 'normal', 5.8, C.ink2);
    [0, 10, 20].forEach((t) => doc.text(`${t} °C`, M + 1, ty(t) - 0.8));

    const pts = [[M, ty(THETA_E)]];
    const firstFace = xs[prof.excludedCount];
    pts.push([firstFace, ty(THETA_E)]);
    prof.interfaces.forEach((t, k) => { if (k >= prof.excludedCount) pts.push([xs[k], ty(t)]); });
    pts.push([PAGE_W - M, ty(THETA_I)]);
    // Halo blanco y línea
    doc.setLineCap('round');
    doc.setLineJoin('round');
    stroke(doc, C.white);
    doc.setLineWidth(1.6);
    for (let i = 1; i < pts.length; i += 1) doc.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
    stroke(doc, C.fail);
    doc.setLineWidth(0.7);
    for (let i = 1; i < pts.length; i += 1) doc.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
    fill(doc, C.fail);
    pts.slice(1, -1).forEach(([px, py]) => doc.circle(px, py, 0.55, 'F'));

    // Etiquetas θse y θsi
    const tag = (text, x, yy, align) => {
      font(doc, 'semi', 6.6, C.ink);
      const tw = doc.getTextWidth(text) + 2.4;
      const bx = align === 'right' ? x - tw : x;
      fill(doc, C.white);
      doc.roundedRect(bx, yy - 2.3, tw, 4.4, 0.8, 0.8, 'F');
      doc.text(text, bx + 1.2, yy, { baseline: 'middle' });
    };
    tag(`θse ${formatNumber(prof.thetaSe, 1)} °C`, firstFace - 1.2, ty(prof.thetaSe) - 4.2, 'right');
    tag(`θsi ${formatNumber(prof.thetaSi, 1)} °C`, xs[xs.length - 1] - 1.2, ty(prof.thetaSi) - 4.2, 'right');
  }

  // Cota del espesor total
  const dy = y + h + 4.5;
  stroke(doc, C.ink);
  doc.setLineWidth(0.2);
  doc.line(wallX, dy, wallX + wallW, dy);
  [wallX, wallX + wallW].forEach((x) => { doc.line(x, dy - 1.6, x, dy + 1.6); doc.line(x - 0.9, dy + 0.9, x + 0.9, dy - 0.9); });
  font(doc, 'semi', 7.2, C.ink);
  const dimText = mm(calculation.totalThicknessMm);
  const dw = doc.getTextWidth(dimText) + 3;
  fill(doc, C.white);
  doc.rect(wallX + wallW / 2 - dw / 2, dy - 2, dw, 4, 'F');
  doc.text(dimText, wallX + wallW / 2, dy, { align: 'center', baseline: 'middle' });

  // Leyenda de capas en dos columnas
  let ly = dy + 6;
  const colW = W / 2;
  const rowH = 4.6;
  layers.forEach((l, i) => {
    const col = i < Math.ceil(layers.length / 2) ? 0 : 1;
    const row = col === 0 ? i : i - Math.ceil(layers.length / 2);
    const x = M + col * colW;
    const yy = ly + row * rowH;
    const cat = materialsById[l.materialId]?.category || 'other';
    fill(doc, SWATCH[cat] || SWATCH.other);
    stroke(doc, C.ink3);
    doc.setLineWidth(0.15);
    doc.rect(x, yy - 1.6, 3.2, 3.2, 'FD');
    font(doc, 'semi', 7, C.ink);
    doc.text(String(i + 1), x + 5, yy, { baseline: 'middle' });
    font(doc, 'normal', 7, l.included ? C.ink : C.ink3);
    const nm = doc.splitTextToSize(l.name, colW - 34)[0];
    doc.text(nm, x + 9, yy, { baseline: 'middle' });
    font(doc, 'normal', 7, C.ink2);
    doc.text(mm(l.thicknessMm), x + colW - 6, yy, { align: 'right', baseline: 'middle' });
  });
  ly += Math.ceil(layers.length / 2) * rowH + 1.5;
  if (prof) ly = para(
    doc,
    `Perfil en régimen estacionario con θi = ${THETA_I} °C y θe = ${THETA_E} °C (condiciones ilustrativas), calculado con las mismas resistencias que U: cada salto es proporcional a R/RT.`
      + (prof && prof.excludedCount ? ' Las capas atenuadas quedan fuera del cálculo (cámara muy ventilada).' : ''),
    M, ly, W, { size: 6.8, color: C.ink3 }
  );
  return ly + 6;
}

/** Barra apilada del reparto de RT. */
function shareBlock(doc, y, { calculation, materialsById }) {
  const tab = isTabulated(calculation);
  label(doc, tab ? 'Reparto de la resistencia de las capas ΣR' : 'Reparto de la resistencia térmica total RT', M, y);
  y += 6;
  const rt = tab ? calculation.layersSum : calculation.totalResistance;
  const segs = [
    ...(tab ? [] : [{ name: 'Rse', r: calculation.rse, color: [214, 226, 234] }]),
    ...calculation.layers.filter((l) => l.included).map((l) => ({
      name: String(l.index + 1), full: l.name, r: l.resistance,
      color: SWATCH[materialsById[l.materialId]?.category] || SWATCH.other
    })),
    ...(tab ? [] : [{ name: 'Rsi', r: calculation.rsi, color: [236, 214, 206] }])
  ];
  const barH = 9;
  let x = M;
  segs.forEach((s) => {
    const w = (s.r / rt) * W;
    fill(doc, s.color);
    doc.rect(x, y, w, barH, 'F');
    stroke(doc, C.white);
    doc.setLineWidth(0.5);
    doc.line(x + w, y, x + w, y + barH);
    const pct = (s.r / rt) * 100;
    if (w > 9) {
      font(doc, 'semi', 6.6, C.ink);
      doc.text(s.name, x + 1.5, y + 3.2, { baseline: 'middle' });
      font(doc, 'normal', 6.2, C.ink2);
      doc.text(`${formatNumber(pct, 0)} %`, x + 1.5, y + 6.6, { baseline: 'middle' });
    }
    x += w;
  });
  y += barH + 4;
  const top = segs.filter((s) => s.full).sort((a, b) => b.r - a.r)[0];
  if (top) {
    y = para(
      doc,
      tab
        ? `La capa ${top.name} (${top.full}) aporta el ${formatNumber((top.r / rt) * 100, 0)} % de la resistencia de las capas. U se lee en la tabla del DA DB-HE/1, que incluye el efecto del terreno.`
        : `La capa ${top.name} (${top.full}) aporta el ${formatNumber((top.r / rt) * 100, 0)} % de RT. Las resistencias superficiales suman ${formatNumber(((calculation.rsi + calculation.rse) / rt) * 100, 0)} %.`,
      M, y, W, { size: 7.4, color: C.ink2 }
    );
  }
  return y + 7;
}

/** Escala de U frente a Ulim y al valor orientativo del Anejo E. */
function scaleBlock(doc, y, { calculation, compliance, orientative }) {
  label(doc, 'U frente a las referencias del DB-HE', M, y);
  y += 7;
  const u = calculation.uValue;
  const lim = compliance.state !== 'unavailable' ? compliance.limit : null;
  const ori = orientative && orientative.state !== 'unavailable' ? orientative.value : null;
  const max = Math.max(u, lim ?? 0, ori ?? 0) * 1.3;
  const sx = (v) => M + (v / max) * W;
  const barY = y + 7;
  const barH = 6;

  // Zonas
  const zones = [];
  if (ori !== null) zones.push([0, ori, C.okBg]);
  if (lim !== null) zones.push([ori ?? 0, lim, ori !== null ? C.warnBg : C.okBg]);
  zones.push([Math.max(lim ?? 0, ori ?? 0), max, lim !== null ? C.failBg : C.warnBg]);
  zones.forEach(([a, b, c]) => { if (b > a) { fill(doc, c); doc.rect(sx(a), barY, sx(b) - sx(a), barH, 'F'); } });
  stroke(doc, C.ruleStrong);
  doc.setLineWidth(0.2);
  doc.rect(M, barY, W, barH, 'S');

  // Marcas de referencia (arriba)
  const ref = (v, text, color) => {
    stroke(doc, color);
    doc.setLineWidth(0.5);
    doc.line(sx(v), barY - 1.5, sx(v), barY + barH);
    font(doc, 'semi', 6.8, color);
    doc.text(text, sx(v), barY - 2.6, { align: 'center', baseline: 'bottom' });
  };
  if (ori !== null) ref(ori, `Anejo E ${formatNumber(ori, 2)}`, C.warn);
  if (lim !== null) ref(lim, `Ulim ${formatNumber(lim, 2)}`, C.fail);

  // Marcador de U (abajo)
  const ux = sx(u);
  fill(doc, C.ink);
  doc.triangle(ux, barY + barH + 0.4, ux - 1.9, barY + barH + 3.6, ux + 1.9, barY + barH + 3.6, 'F');
  stroke(doc, C.ink);
  doc.setLineWidth(0.6);
  doc.line(ux, barY - 0.5, ux, barY + barH);
  font(doc, 'bold', 8, C.ink);
  doc.text(`U ${formatU(u)}`, ux, barY + barH + 7.2, { align: 'center', baseline: 'middle' });

  // Eje
  font(doc, 'normal', 6, C.ink3);
  doc.text('0', M, barY + barH + 7.2, { baseline: 'middle' });
  doc.text(`${formatNumber(max, 2)} W/(m²·K)`, PAGE_W - M, barY + barH + 7.2, { align: 'right', baseline: 'middle' });

  y = barY + barH + 12;
  const key = [];
  if (ori !== null) key.push(['Hasta el valor orientativo del Anejo E', C.okBg]);
  if (lim !== null) key.push([ori !== null ? 'Entre el orientativo y el límite' : 'Hasta el valor límite', ori !== null ? C.warnBg : C.okBg]);
  key.push([lim !== null ? 'Por encima del valor límite' : 'Por encima del valor orientativo', lim !== null ? C.failBg : C.warnBg]);
  let kx = M;
  key.forEach(([t, c]) => {
    fill(doc, c);
    stroke(doc, C.ruleStrong);
    doc.setLineWidth(0.15);
    doc.rect(kx, y - 1.4, 2.8, 2.8, 'FD');
    font(doc, 'normal', 6.8, C.ink2);
    doc.text(t, kx + 4, y, { baseline: 'middle' });
    kx += doc.getTextWidth(t) + 10;
  });
  return y + 6;
}

/* ─────────────────────────── Página 2: detalle ───────────────────────── */
function ensure(doc, y, need, ctx) {
  if (y + need <= PAGE_H - FOOT - 8) return y;
  doc.addPage();
  header(doc, ctx.now, ctx.metadata);
  return 31;
}

function sectionTitle(doc, y, text) {
  font(doc, 'semi', 10.5, C.ink);
  doc.text(text, M, y, { baseline: 'top' });
  return y + 6.6;
}

function layerTable(doc, y, { calculation, materialsById }, ctx) {
  y = sectionTitle(doc, y, 'Composición y resistencias');
  const cols = [
    { k: '#', w: 7, align: 'left' },
    { k: 'Capa', w: 65, align: 'left' },
    { k: 'd (mm)', w: 16, align: 'right' },
    { k: 'λ W/(m·K)', w: 20, align: 'right' },
    { k: 'R m²·K/W', w: 19, align: 'right' },
    { k: isTabulated(calculation) ? '% ΣR' : '% RT', w: 13, align: 'right' },
    { k: 'Dato', w: 38, align: 'left' }
  ];
  const colX = [];
  cols.reduce((x, c) => { colX.push(x); return x + c.w; }, M);
  const cellX = (i) => (cols[i].align === 'right' ? colX[i] + cols[i].w - 1.5 : colX[i] + (i === 6 ? 2.5 : 0));

  fill(doc, C.paper);
  doc.rect(M, y, W, 6.4, 'F');
  font(doc, 'semi', 6.8, C.ink2);
  cols.forEach((c, i) => doc.text(c.k, cellX(i), y + 3.3, { align: c.align, baseline: 'middle' }));
  y += 6.4;

  const tabT = isTabulated(calculation);
  const rt = tabT ? calculation.layersSum : calculation.totalResistance;
  const rows = [
    ...(tabT ? [] : [{ n: '', name: 'Rse · resistencia superficial exterior', d: null, l: null, r: calculation.rse, surface: true }]),
    ...calculation.layers.map((l, i) => ({ n: String(i + 1), name: l.name, sub: l.formula || (l.included ? '' : 'No computa (cámara muy ventilada)'), d: l.thicknessMm, l: l.lambda, r: l.included ? l.resistance : null, status: l.dataStatus, included: l.included })),
    ...(tabT ? [] : [{ n: '', name: 'Rsi · resistencia superficial interior', d: null, l: null, r: calculation.rsi, surface: true }])
  ];
  rows.forEach((row) => {
    font(doc, row.surface ? 'normal' : 'semi', 7.4, row.included === false ? C.ink3 : C.ink);
    const nameLines = doc.splitTextToSize(row.name, cols[1].w - 2);
    const h = Math.max(6.4, nameLines.length * 3.4 + (row.sub ? 3.4 : 0) + 2.6);
    y = ensure(doc, y, h, ctx);
    if (row.surface) { fill(doc, [250, 250, 248]); doc.rect(M, y, W, h, 'F'); }
    const mid = y + 3.6;
    font(doc, 'normal', 7.4, C.ink2);
    doc.text(row.n, cellX(0), mid, { baseline: 'middle' });
    font(doc, row.surface ? 'normal' : 'semi', 7.4, row.surface || row.included === false ? C.ink2 : C.ink);
    nameLines.forEach((ln, i) => doc.text(ln, cellX(1), mid + i * 3.4, { baseline: 'middle' }));
    if (row.sub) {
      font(doc, 'normal', 6.4, C.ink3);
      doc.text(row.sub, cellX(1), mid + nameLines.length * 3.4, { baseline: 'middle' });
    }
    font(doc, 'normal', 7.4, C.ink);
    doc.text(row.d ? formatNumber(row.d, row.d % 1 === 0 ? 0 : 1) : '—', cellX(2), mid, { align: 'right', baseline: 'middle' });
    doc.text(row.l ? formatNumber(row.l, 3) : '—', cellX(3), mid, { align: 'right', baseline: 'middle' });
    font(doc, 'semi', 7.4, C.ink);
    doc.text(row.r !== null && row.r !== undefined ? formatNumber(row.r, 3) : '—', cellX(4), mid, { align: 'right', baseline: 'middle' });
    font(doc, 'normal', 7.4, C.ink2);
    doc.text(row.r ? `${formatNumber((row.r / rt) * 100, 1)}` : '—', cellX(5), mid, { align: 'right', baseline: 'middle' });
    if (row.status) {
      const tone = { 'reference-verified': 'ok', 'reference-pending-check': 'warn', provisional: 'fail', user: 'info' }[row.status] || 'neutral';
      pill(doc, DATA_STATUS[row.status]?.short ?? row.status, cellX(6), mid - 2.7, tone);
    }
    hr(doc, y + h);
    y += h;
  });
  // Total
  y = ensure(doc, y, 8, ctx);
  stroke(doc, C.ink);
  doc.setLineWidth(0.35);
  doc.line(M, y, PAGE_W - M, y);
  font(doc, 'semi', 8, C.ink);
  doc.text(tabT ? 'ΣR · resistencia de las capas (sin superficiales)' : 'RT · resistencia térmica total', cellX(1), y + 3.8, { baseline: 'middle' });
  doc.text(calculation.totalThicknessMm ? formatNumber(calculation.totalThicknessMm, 0) : '—', cellX(2), y + 3.8, { align: 'right', baseline: 'middle' });
  font(doc, 'bold', 8, C.ink);
  doc.text(formatNumber(rt, 3), cellX(4), y + 3.8, { align: 'right', baseline: 'middle' });
  doc.text('100', cellX(5), y + 3.8, { align: 'right', baseline: 'middle' });
  y += 8;
  if (calculation.surfaceResistance) {
    y = para(doc, `Resistencias superficiales: ${calculation.surfaceResistance.label}. Fuente: ${calculation.surfaceResistance.reference}.`, M, y, W, { size: 6.8, color: C.ink3 });
  }
  return y + 7;
}

function checkBox(doc, y, title, tone, lines, ctx) {
  const pad = 4;
  font(doc, 'normal', 7.4, C.ink);
  const wrapped = lines.flatMap((l) => doc.splitTextToSize(l, W - 2 * pad - 30));
  const h = Math.max(14, wrapped.length * 3.5 + 2 * pad + 1);
  y = ensure(doc, y, h + 3, ctx);
  const map = { ok: C.ok, warn: C.warn, fail: C.fail, neutral: C.ruleStrong, info: C.accent };
  stroke(doc, C.rule);
  doc.setLineWidth(0.25);
  doc.rect(M, y, W, h, 'S');
  fill(doc, map[tone] || C.ruleStrong);
  doc.rect(M, y, 1.2, h, 'F');
  font(doc, 'semi', 8, C.ink);
  doc.text(title[0], M + pad + 1, y + pad + 1, { baseline: 'top' });
  pill(doc, title[1], M + pad + 1, y + pad + 5.4, tone);
  font(doc, 'normal', 7.4, C.ink);
  wrapped.forEach((ln, i) => doc.text(ln, M + pad + 31, y + pad + 1 + i * 3.5, { baseline: 'top' }));
  return y + h + 4;
}

/** Condensaciones superficiales e intersticiales (DA DB-HE/2), con diagrama de Glaser. */
function condensationSection(doc, y, cond, ctx) {
  const { surface, interstitial } = cond;
  y = ensure(doc, y + 2, interstitial?.points ? 125 : 45, ctx);
  y = sectionTitle(doc, y, 'Condensaciones · DA DB-HE/2');
  const sTone = surface.state === 'ok' ? 'ok' : surface.state === 'fail' ? 'fail' : 'neutral';
  const sText = surface.state === 'ok' ? 'Sin riesgo' : surface.state === 'fail' ? 'Riesgo' : 'No disponible';
  y = checkBox(doc, y, ['Superficiales', sText], sTone, surface.state === 'unavailable'
    ? [surface.reason]
    : [
        `fRsi = 1 − 0,25 · U = ${formatNumber(surface.fRsi, 3)} ${surface.state === 'ok' ? '≥' : '<'} fRsi,min = ${formatNumber(surface.fRsiMin, 2)}.`,
        `${surface.hygrometryClass.label}. DA DB-HE/2, tabla 1.`
      ], ctx);
  const iTone = interstitial.state === 'ok' ? 'ok' : interstitial.state === 'fail' ? 'fail' : 'neutral';
  const iText = interstitial.state === 'ok' ? 'Sin condensación' : interstitial.state === 'fail' ? 'Condensación' : 'No disponible';
  y = checkBox(doc, y, ['Intersticiales', iText], iTone, interstitial.state === 'unavailable'
    ? [interstitial.reason]
    : [
        interstitial.state === 'ok'
          ? 'Pn < Psat en todas las interfases (método de Glaser, enero).'
          : `Pn ≥ Psat en: ${interstitial.condensationAt.map((p) => p.label.toLowerCase()).join('; ')}.`,
        `Exterior: ${interstitial.exterior.capital}, enero, θe = ${formatNumber(interstitial.exterior.thetaE, 1)} °C, φe = ${formatNumber(interstitial.exterior.phiE * 100, 0)} %${interstitial.exterior.corrected ? ' (corregido por altitud)' : ''}. Interior: θi = ${interstitial.thetaI} °C, φi = ${formatNumber(interstitial.phiI * 100, 0)} %.`
      ], ctx);
  if (interstitial.state === 'unavailable' || !interstitial.points) return y;

  // Diagrama de Glaser
  const h = 46;
  y = ensure(doc, y, h + 20, ctx);
  label(doc, 'Diagrama de Glaser · enero', M, y);
  y += 5;
  const x0 = M + 14;
  const w = W - 16;
  const pts = interstitial.points;
  const total = pts[pts.length - 1].xMm || 1;
  const maxP = Math.max(...pts.map((p) => Math.max(p.p, p.psat))) * 1.08;
  const X = (mm) => x0 + (mm / total) * w;
  const Y = (pa) => y + h - (pa / maxP) * h;
  let acc = 0;
  interstitial.layers.forEach((l, i) => {
    fill(doc, i % 2 ? [246, 246, 243] : [251, 251, 249]);
    doc.rect(X(acc), y, X(acc + l.thicknessMm) - X(acc), h, 'F');
    font(doc, 'semi', 6.2, C.ink2);
    doc.text(String(l.index + 1), (X(acc) + X(acc + l.thicknessMm)) / 2, y + h + 3, { align: 'center', baseline: 'middle' });
    acc += l.thicknessMm;
  });
  stroke(doc, C.rule);
  doc.setLineWidth(0.2);
  doc.rect(x0, y, w, h, 'S');
  [0, 0.5, 1].forEach((t) => {
    const pa = Math.round((maxP * t) / 100) * 100;
    font(doc, 'normal', 6, C.ink3);
    doc.text(formatNumber(pa, 0), x0 - 1.5, Y(pa), { align: 'right', baseline: 'middle' });
  });
  // Psat (curva) y Pn (recta por tramos)
  const sat = (theta) => 610.5 * Math.exp(theta >= 0 ? (17.269 * theta) / (theta + 237.3) : (21.875 * theta) / (theta + 265.5));
  doc.setLineWidth(0.55);
  stroke(doc, C.fail);
  for (let i = 0; i < pts.length - 1; i += 1) {
    for (let k = 0; k < 10; k += 1) {
      const t0 = k / 10;
      const t1 = (k + 1) / 10;
      const a = pts[i];
      const b = pts[i + 1];
      doc.line(X(a.xMm + (b.xMm - a.xMm) * t0), Y(sat(a.theta + (b.theta - a.theta) * t0)), X(a.xMm + (b.xMm - a.xMm) * t1), Y(sat(a.theta + (b.theta - a.theta) * t1)));
    }
  }
  stroke(doc, C.accent);
  doc.setLineDashPattern([1.2, 0.8], 0);
  for (let i = 0; i < pts.length - 1; i += 1) doc.line(X(pts[i].xMm), Y(pts[i].p), X(pts[i + 1].xMm), Y(pts[i + 1].p));
  doc.setLineDashPattern([], 0);
  pts.forEach((p) => {
    fill(doc, p.condensation ? C.fail : C.white);
    stroke(doc, p.condensation ? C.fail : C.accent);
    doc.setLineWidth(0.3);
    doc.circle(X(p.xMm), Y(p.p), p.condensation ? 1.1 : 0.7, 'FD');
  });
  y += h + 6;
  font(doc, 'normal', 6.6, C.ink2);
  stroke(doc, C.fail); doc.setLineWidth(0.55); doc.line(x0, y, x0 + 6, y);
  doc.text('Psat · presión de saturación (Pa)', x0 + 8, y, { baseline: 'middle' });
  stroke(doc, C.accent); doc.setLineDashPattern([1.2, 0.8], 0); doc.line(x0 + 62, y, x0 + 68, y); doc.setLineDashPattern([], 0);
  doc.text('Pn · presión de vapor (Pa)', x0 + 70, y, { baseline: 'middle' });
  doc.text('Exterior → interior, capas a escala de espesor', PAGE_W - M, y, { align: 'right', baseline: 'middle' });
  y = para(doc, 'Fuente: DA DB-HE/2 (octubre 2013), expresiones 3, 4 y 9, tabla 1 y tabla C.1 (enero), cotejadas con el PDF oficial de codigotecnico.org.', M, y + 4, W, { size: 6.8, color: C.ink3 });
  return y + 4;
}

function bulletList(doc, y, items, ctx, { size = 7.2, color = C.ink2 } = {}) {
  items.forEach((t) => {
    font(doc, 'normal', size, color);
    const lines = doc.splitTextToSize(t, W - 5);
    const h = lines.length * size * 0.5;
    y = ensure(doc, y, h + 1.2, ctx);
    fill(doc, C.ink3);
    doc.circle(M + 1, y + 1.4, 0.45, 'F');
    lines.forEach((ln, i) => doc.text(ln, M + 4, y + i * size * 0.5, { baseline: 'top' }));
    y += h + 1.2;
  });
  return y;
}

/* ─────────────────────────── Documento ───────────────────────────────── */
/**
 * Genera el informe PDF. Devuelve el documento jsPDF.
 * Página 1: resumen gráfico. Página 2 (y siguientes): detalle técnico.
 */
export function buildReportPdf({ assembly, calculation, compliance, orientative, condensation = null, materialsById, metadata, now = new Date() }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  registerFonts(doc);
  doc.setProperties({
    title: `${assembly.name} · Informe de transmitancia térmica`,
    subject: 'Transmitancia térmica U según DA DB-HE/1 y comprobación con el CTE DB-HE',
    creator: `${APP_NAME} v${APP_VERSION}`,
    keywords: 'CTE, DB-HE, transmitancia, valor U'
  });
  const ctx = { now, metadata };
  const complete = calculation.status === 'complete';

  /* Página 1 · resumen gráfico */
  header(doc, now, metadata);
  let y = 30;
  y = titleBlock(doc, y, { assembly, calculation });
  y = heroBlock(doc, y, { calculation, compliance, orientative });
  if (complete) {
    y = sectionBlock(doc, y, { calculation, materialsById });
    y = shareBlock(doc, y, { calculation, materialsById });
    if (compliance.state !== 'unavailable' || (orientative && orientative.state !== 'unavailable')) {
      y = scaleBlock(doc, y, { calculation, compliance, orientative });
    }
  } else {
    y = para(doc, 'El cálculo no está completo, por lo que el informe no incluye resultados gráficos. Revise:', M, y, W, { size: 9 });
    y = bulletList(doc, y + 2, calculation.issues.map((i) => i.message), ctx, { size: 8, color: C.ink });
  }

  /* Página 2 · detalle técnico */
  doc.addPage();
  header(doc, now, metadata);
  y = 31;
  if (calculation.layers.length && calculation.status !== 'unsupported') y = layerTable(doc, y, { calculation, materialsById }, ctx);

  y = ensure(doc, y, 20, ctx);
  y = sectionTitle(doc, y, 'Comprobaciones con el DB-HE');
  const [cText, cTone] = complianceTone(compliance);
  y = checkBox(doc, y, ['Valor límite', cText], cTone, compliance.state === 'unavailable'
    ? [`Verificación no disponible: ${compliance.reasons.join(' ')}`]
    : [
        `U = ${formatU(calculation.uValue, compliance.limit)} ${compliance.state === 'complies' ? '≤' : '>'} Ulim = ${formatNumber(compliance.limit, 2)} W/(m²·K). Margen: ${formatU(compliance.margin, 0)} W/(m²·K).`,
        `${compliance.lookup.table.reference}, pág. ${compliance.lookup.table.page}. Fila: ${compliance.lookup.row.label}.`,
        'Comparación de la parte corriente de un elemento: no acredita el cumplimiento del CTE por el edificio.'
      ], ctx);
  const [oText, oTone] = orientativeTone(orientative);
  y = checkBox(doc, y, ['Anejo E · orientativo', oText], oTone, !orientative || orientative.state === 'unavailable'
    ? [`Comparación no disponible: ${orientative?.reasons?.join(' ') ?? ''}`]
    : [
        `U = ${formatU(calculation.uValue, orientative.value)} ${orientative.state === 'within' ? '≤' : '>'} Uorient = ${formatNumber(orientative.value, 2)} W/(m²·K).${orientative.state === 'above' ? ` Para alcanzarlo, U debe reducirse ${formatU(-orientative.margin, 0)} W/(m²·K).` : ''}`,
        `${orientative.lookup.table.reference}. Fila: ${orientative.lookup.row.label}.`,
        'Valor orientativo para el predimensionado en uso residencial privado, con vistas a cumplir K. Presupone un correcto tratamiento de los puentes térmicos. No es una exigencia.'
      ], ctx);

  if (condensation?.applicable) y = condensationSection(doc, y, condensation, ctx);

  y = ensure(doc, y + 2, 30, ctx);
  y = sectionTitle(doc, y, 'Método de cálculo');
  y = para(doc, calculation.method || 'Sin método: tipo de elemento no soportado.', M, y, W, { size: 7.6, weight: 'semi' });
  const formula = isTabulated(calculation)
    ? 'R = d / λ  ·  ΣR de las capas sin resistencias superficiales  ·  U leída en la tabla del DA DB-HE/1 con interpolación lineal'
    : calculation.calculationMethod === 'unheated-space'
      ? 'R = d / λ  ·  RT = Rsi + ΣRi + Rse (tabla 6)  ·  Up = 1 / RT  ·  U = Up · b'
      : 'R = d / λ  ·  RT = Rsi + ΣRi + Rse  ·  U = 1 / RT   (d en metros; cálculo a precisión completa, redondeo solo al presentar)';
  y = para(doc, formula, M, y + 1, W, { size: 7.4, color: C.ink2 });
  if (complete && calculation.special) {
    const sp = calculation.special;
    if (sp.inputs?.length) {
      y = ensure(doc, y + 2, 6 + sp.inputs.length * 4, ctx);
      sp.inputs.forEach((inp) => {
        font(doc, 'normal', 7.2, C.ink2);
        doc.text(inp.label, M, y + 2, { baseline: 'middle' });
        font(doc, 'normal', 7.2, C.ink);
        const vl = doc.splitTextToSize(inp.value, W - 52);
        vl.forEach((ln, i) => doc.text(ln, M + 50, y + 2 + i * 3.4, { baseline: 'middle' }));
        y += Math.max(4, vl.length * 3.4 + 0.6);
      });
    }
    sp.steps.forEach((st) => {
      font(doc, 'normal', 7.2, C.ink);
      const lines = doc.splitTextToSize(st, W - 6);
      const h = lines.length * 3.5 + 4;
      y = ensure(doc, y + 1.5, h, ctx);
      fill(doc, C.paper);
      doc.rect(M, y, W, h, 'F');
      lines.forEach((ln, i) => doc.text(ln, M + 3, y + 2.6 + i * 3.5, { baseline: 'top' }));
      y += h;
    });
    if (sp.notes?.length) y = para(doc, sp.notes.join(' '), M, y + 2, W, { size: 7, color: C.ink2 });
    if (sp.table) y = para(doc, `Fuente: ${sp.table.reference}. ${sp.table.note || ''}`, M, y + 1.5, W, { size: 6.8, color: C.ink3 });
    y += 4;
  } else if (complete) {
    y = ensure(doc, y + 2, 10, ctx);
    fill(doc, C.paper);
    const trace = `RT = ${formatNumber(calculation.rsi, 2)} + ${formatNumber(calculation.layersSum, 4)} + ${formatNumber(calculation.rse, 2)} = ${formatNumber(calculation.totalResistance, 4)} m²·K/W     U = 1 / ${formatNumber(calculation.totalResistance, 4)} = ${formatNumber(calculation.uValue, 4)} W/(m²·K)`;
    doc.rect(M, y, W, 7.5, 'F');
    font(doc, 'normal', 7.4, C.ink);
    doc.text(trace, M + 3, y + 3.9, { baseline: 'middle' });
    y += 11;
  }

  y = ensure(doc, y + 1, 20, ctx);
  y = sectionTitle(doc, y, 'Hipótesis');
  y = bulletList(doc, y, calculation.assumptions, ctx);

  y = ensure(doc, y + 4, 20, ctx);
  y = sectionTitle(doc, y, 'Fuentes');
  const used = [...new Set(assembly.layers.map((l) => l.materialId).filter(Boolean))].map((id) => materialsById[id]).filter(Boolean);
  const sources = [
    ...used.map((m) => `${m.name}: ${m.dataStatus === 'user' ? `definido por el usuario${m.source ? ` (${m.source})` : ''}` : m.sourceRef} — ${DATA_STATUS[m.dataStatus]?.label ?? ''}`),
    ...Object.values(metadata.documents).map((d) => `${d.title}, ${d.revision}. ${d.sourceUrl}`)
  ];
  y = bulletList(doc, y, sources, ctx);

  y = ensure(doc, y + 4, 18, ctx);
  fill(doc, C.accentSoft);
  const disc = 'Arqtherm es una herramienta de apoyo. Los resultados dependen de los datos introducidos y de las hipótesis indicadas, y no sustituyen la responsabilidad del técnico competente de verificar los requisitos aplicables al proyecto. Compruebe la versión vigente del CTE y su régimen transitorio para la fecha de solicitud de licencia.';
  font(doc, 'normal', 7.2, C.accent);
  const dl = doc.splitTextToSize(disc, W - 8);
  doc.rect(M, y, W, dl.length * 3.5 + 6, 'F');
  dl.forEach((ln, i) => doc.text(ln, M + 4, y + 3 + i * 3.5, { baseline: 'top' }));

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p);
    footer(doc, p, total);
  }
  return doc;
}

/** Nombre de archivo del informe. */
export function reportFilename(name) {
  const slug = (name || 'elemento')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return `arqtherm-${slug || 'elemento'}.pdf`;
}
