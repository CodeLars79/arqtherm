import { mmToM, isPositiveFinite, ok, fail } from './units.js';

/**
 * Resistencia térmica de una capa térmicamente homogénea.
 * R = d / λ   (DA DB-HE/1, expresión 3)
 *
 * @param {number} thicknessMm  espesor d en milímetros
 * @param {number} lambda       conductividad térmica de diseño λ en W/(m·K)
 * @returns {{ok:boolean, value:number|null, error?:{code:string,message:string}}}
 *          value en m²·K/W
 */
export function calculateLayerResistance(thicknessMm, lambda) {
  if (thicknessMm === null || thicknessMm === undefined) {
    return fail('thickness-missing', 'Falta el espesor de la capa.');
  }
  if (!isPositiveFinite(thicknessMm)) {
    return fail('thickness-invalid', 'El espesor debe ser un número finito mayor que cero.');
  }
  if (lambda === null || lambda === undefined) {
    return fail('lambda-missing', 'Falta la conductividad térmica λ de la capa.');
  }
  if (!isPositiveFinite(lambda)) {
    return fail('lambda-invalid', 'La conductividad térmica λ debe ser un número finito mayor que cero.');
  }
  return ok(mmToM(thicknessMm) / lambda);
}

/**
 * Capa caracterizada por una resistencia térmica tabulada (p. ej., una fábrica del CEC).
 * Comprueba que el espesor está dentro del rango de validez del valor tabulado.
 *
 * @param {number} thicknessMm
 * @param {number} resistance           m²·K/W
 * @param {[number,number]} [rangeMm]   rango de espesores de validez, inclusive
 */
export function calculateFixedResistance(thicknessMm, resistance, rangeMm) {
  if (thicknessMm === null || thicknessMm === undefined) {
    return fail('thickness-missing', 'Falta el espesor de la capa.');
  }
  if (!isPositiveFinite(thicknessMm)) {
    return fail('thickness-invalid', 'El espesor debe ser un número finito mayor que cero.');
  }
  if (!isPositiveFinite(resistance)) {
    return fail('resistance-invalid', 'La resistencia térmica tabulada no es válida.');
  }
  if (Array.isArray(rangeMm)) {
    const [min, max] = rangeMm;
    if (thicknessMm < min || thicknessMm > max) {
      const range = min === max ? `${min} mm` : `${min}–${max} mm`;
      return fail(
        'thickness-out-of-range',
        `El valor tabulado solo es válido para un espesor de ${range}.`
      );
    }
  }
  return ok(resistance);
}
