import { formatNumber } from '../../engine/index.js';

/** Tabla de resistencias: Rse, capas, Rsi y total. */
export default function ResistanceBreakdown({ calculation }) {
  const { layers, rsi, rse, totalResistance, surfaceResistance } = calculation;
  const veryVentilated = layers.some((l) => !l.included);

  return (
    <div className="table-wrap">
      <table className="breakdown">
        <caption className="visually-hidden">Desglose de resistencias térmicas</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Capa</th>
            <th scope="col" className="num">d (mm)</th>
            <th scope="col" className="num">λ (W/(m·K))</th>
            <th scope="col" className="num">R (m²·K/W)</th>
          </tr>
        </thead>
        <tbody>
          {rse !== null && <tr className="breakdown__surface">
            <td />
            <th scope="row">
              R<sub>se</sub> resistencia superficial exterior
              {veryVentilated && <span className="small muted"> (= Rsi, cámara muy ventilada)</span>}
            </th>
            <td className="num">—</td>
            <td className="num">—</td>
            <td className="num">{formatNumber(rse, 2)}</td>
          </tr>}
          {layers.map((l, i) => (
            <tr key={l.id} className={l.included ? '' : 'breakdown__excluded'}>
              <td className="num">{i + 1}</td>
              <th scope="row">
                {l.name}
                {l.formula && <span className="breakdown__formula">{l.formula}</span>}
                {!l.included && <span className="breakdown__formula">No computa</span>}
              </th>
              <td className="num">{formatNumber(l.thicknessMm, l.thicknessMm % 1 === 0 ? 0 : 1)}</td>
              <td className="num">{l.lambda ? formatNumber(l.lambda, 3) : '—'}</td>
              <td className="num">{l.included ? formatNumber(l.resistance, 3) : '—'}</td>
            </tr>
          ))}
          {rsi !== null && <tr className="breakdown__surface">
            <td />
            <th scope="row">R<sub>si</sub> resistencia superficial interior</th>
            <td className="num">—</td>
            <td className="num">—</td>
            <td className="num">{formatNumber(rsi, 2)}</td>
          </tr>}
        </tbody>
        <tfoot>
          <tr>
            <td />
            <th scope="row">{rsi !== null ? <>R<sub>T</sub> resistencia térmica total</> : <>ΣR resistencia de las capas (sin superficiales)</>}</th>
            <td className="num">{calculation.totalThicknessMm ? formatNumber(calculation.totalThicknessMm, 0) : '—'}</td>
            <td />
            <td className="num"><strong>{formatNumber(rsi !== null ? totalResistance : calculation.layersSum, 3)}</strong></td>
          </tr>
        </tfoot>
      </table>
      {surfaceResistance && (
        <p className="small muted table-note">
          Resistencias superficiales: {surfaceResistance.label}. Fuente: {surfaceResistance.reference}.
        </p>
      )}
    </div>
  );
}
