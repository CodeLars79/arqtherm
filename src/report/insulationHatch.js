/**
 * Símbolo de aislamiento flexible (lazos entrelazados), escalado al ancho de la capa.
 *
 * Curva continua cuyo barrido horizontal ocupa siempre todo el ancho [0, w]:
 *   x(t) = w/2 · (1 + sin t)
 *   y(t) = p · t / 2π − b · sin 2t
 * con paso vertical p = 0,404·w y retroceso b = 0,155·w. Los coeficientes se ajustaron
 * midiendo el dibujo de referencia, de modo que la forma de los lazos se mantiene
 * igual a cualquier escala: una capa más gruesa da lazos mayores y más espaciados.
 */
export const HATCH_PITCH = 0.404;
export const HATCH_BACK = 0.155;
const STEPS_PER_PERIOD = 96;

/**
 * Puntos de la curva que cubren un rectángulo de ancho `width` y alto `height`
 * (origen arriba a la izquierda). Sobresale por arriba y por abajo: recórtese al rectángulo.
 * @returns {Array<[number, number]>}
 */
export function insulationHatchPoints(width, height) {
  if (!(width > 0) || !(height > 0)) return [];
  const p = HATCH_PITCH * width;
  const b = HATCH_BACK * width;
  const a = width / 2;
  // Primer extremo izquierdo un poco por debajo del borde superior, como en la referencia.
  const phase = 0.11 * p + p / 4;
  const tFrom = (-(p + b) - phase) / p * 2 * Math.PI - Math.PI;
  const tTo = ((height + p + b) - phase) / p * 2 * Math.PI + Math.PI;
  const dt = (2 * Math.PI) / STEPS_PER_PERIOD;
  const pts = [];
  for (let t = tFrom; t <= tTo; t += dt) {
    pts.push([a * (1 + Math.sin(t)), (p * t) / (2 * Math.PI) - b * Math.sin(2 * t) + phase]);
  }
  return pts;
}

/** Trazado SVG («d») de la curva. */
export function insulationHatchPath(width, height) {
  const pts = insulationHatchPoints(width, height);
  if (!pts.length) return '';
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join('');
}
