import { formatNumber } from '../../engine/index.js';

const W = 560;
const H = 250;
const PAD = { l: 52, r: 14, t: 16, b: 40 };

const CATEGORY_CLASS = {
  insulation: 'swatch--insulation', ceramic: 'swatch--ceramic', concrete: 'swatch--concrete', stone: 'swatch--stone',
  timber: 'swatch--timber', gypsum: 'swatch--gypsum', air: 'swatch--air', other: 'swatch--other'
};

/**
 * Diagrama de Glaser: presión de vapor Pn y presión de saturación Psat en cada interfase,
 * con las capas a escala de espesor (exterior a la izquierda).
 */
export default function GlaserChart({ interstitial, materialsById }) {
  const { points, layers } = interstitial;
  const total = points[points.length - 1].xMm || 1;
  const maxP = Math.max(...points.map((p) => Math.max(p.p, p.psat))) * 1.08;
  const x = (mm) => PAD.l + (mm / total) * (W - PAD.l - PAD.r);
  const y = (pa) => H - PAD.b - (pa / maxP) * (H - PAD.t - PAD.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round((maxP * t) / 100) * 100);
  const line = (key) => points.map((p, i) => `${i ? 'L' : 'M'}${x(p.xMm).toFixed(1)} ${y(p[key]).toFixed(1)}`).join('');

  // Psat no es lineal dentro de cada capa: se dibuja con puntos intermedios.
  const psatPath = (() => {
    const out = [];
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      for (let k = 0; k <= 12; k += 1) {
        const t = k / 12;
        const theta = a.theta + (b.theta - a.theta) * t;
        const ps = 610.5 * Math.exp(theta >= 0 ? (17.269 * theta) / (theta + 237.3) : (21.875 * theta) / (theta + 265.5));
        out.push(`${out.length ? 'L' : 'M'}${x(a.xMm + (b.xMm - a.xMm) * t).toFixed(1)} ${y(ps).toFixed(1)}`);
      }
    }
    return out.join('');
  })();

  let acc = 0;
  return (
    <figure className="glaser">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Diagrama de Glaser: presión de vapor y presión de saturación en ${points.length} interfases. ${interstitial.condensationAt.length ? `Condensación en ${interstitial.condensationAt.length} puntos.` : 'Sin condensación.'}`}>
        <defs>
          {layers.map((l) => (
            <clipPath key={l.id} id={`gl-${l.id}`}><rect x={x(acc)} y={PAD.t} width={x(acc + l.thicknessMm) - x(acc)} height={H - PAD.t - PAD.b} /></clipPath>
          ))}
        </defs>
        {layers.map((l) => {
          const x0 = x(acc);
          const w = x(acc + l.thicknessMm) - x0;
          acc += l.thicknessMm;
          const cat = materialsById[l.materialId]?.category ?? 'other';
          return (
            <g key={l.id}>
              <foreignObject x={x0} y={PAD.t} width={w} height={H - PAD.t - PAD.b} className="glaser__layer">
                <div className={`glaser__swatch ${CATEGORY_CLASS[cat] || 'swatch--other'}`} />
              </foreignObject>
              <text x={x0 + w / 2} y={H - PAD.b + 13} textAnchor="middle" className="glaser__num">{l.index + 1}</text>
            </g>
          );
        })}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="glaser__grid" />
            <text x={PAD.l - 6} y={y(t) + 3.5} textAnchor="end" className="glaser__tick">{formatNumber(t, 0)}</text>
          </g>
        ))}
        <text x={12} y={PAD.t + (H - PAD.t - PAD.b) / 2} transform={`rotate(-90 12 ${PAD.t + (H - PAD.t - PAD.b) / 2})`} textAnchor="middle" className="glaser__axis">Presión (Pa)</text>
        <text x={PAD.l} y={H - 6} className="glaser__axis">Exterior</text>
        <text x={W - PAD.r} y={H - 6} textAnchor="end" className="glaser__axis">Interior</text>
        <path d={psatPath} className="glaser__psat" />
        <path d={line('p')} className="glaser__p" />
        {points.map((p) => (
          <circle key={p.xMm + p.label} cx={x(p.xMm)} cy={y(p.p)} r={p.condensation ? 4.5 : 2.6} className={p.condensation ? 'glaser__dot glaser__dot--fail' : 'glaser__dot'} />
        ))}
      </svg>
      <figcaption className="glaser__legend">
        <span><i className="glaser__key glaser__key--psat" /> P<sub>sat</sub> presión de saturación</span>
        <span><i className="glaser__key glaser__key--p" /> P<sub>n</sub> presión de vapor</span>
        <span className="muted">Enero · θ<sub>e</sub> = {formatNumber(interstitial.exterior.thetaE, 1)} °C, φ<sub>e</sub> = {formatNumber(interstitial.exterior.phiE * 100, 0)} % · θ<sub>i</sub> = {interstitial.thetaI} °C, φ<sub>i</sub> = {formatNumber(interstitial.phiI * 100, 0)} %</span>
      </figcaption>
    </figure>
  );
}
