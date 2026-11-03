/**
 * Perfil de temperaturas en régimen estacionario a través del elemento.
 * Cada salto de temperatura es proporcional a su resistencia: Δθ = (θi − θe) · R / RT.
 * Usa exactamente las mismas resistencias que el cálculo de U (sin redondeo).
 *
 * @param {object} calculation  resultado completo de calculateAssembly
 * @param {number} thetaI  temperatura interior (°C)
 * @param {number} thetaE  temperatura exterior (°C)
 * @returns {null | {thetaSe:number, thetaSi:number, interfaces:number[], excludedCount:number}}
 *   interfaces[k] = temperatura en la cara exterior de la capa k (k = 0..n), con interfaces[n] = θsi.
 *   Las capas excluidas (cámara muy ventilada y exteriores) quedan a θe.
 */
export function temperatureProfile(calculation, thetaI = 20, thetaE = 0) {
  if (!calculation || calculation.status !== 'complete') return null;
  const { layers, rse, totalResistance } = calculation;
  const dT = thetaI - thetaE;
  const excludedCount = layers.filter((l) => !l.included).length;
  const interfaces = [];
  for (let k = 0; k < excludedCount; k += 1) interfaces.push(thetaE);
  let theta = thetaE + (dT * rse) / totalResistance;
  const thetaSe = theta;
  interfaces.push(theta);
  for (let k = excludedCount; k < layers.length; k += 1) {
    theta += (dT * layers[k].resistance) / totalResistance;
    interfaces.push(theta);
  }
  return { thetaSe, thetaSi: theta, interfaces, excludedCount };
}
