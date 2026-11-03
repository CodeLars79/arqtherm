import { CheckCircle2, XCircle, CircleSlash } from 'lucide-react';
import FormField from '../ui/FormField.jsx';
import GlaserChart from './GlaserChart.jsx';
import { calculationData } from '../../data/index.js';
import { formatNumber, layerMu } from '../../engine/index.js';

const DATA = calculationData.condensation;
const STATE = {
  ok: { icon: CheckCircle2, cls: 'verdict--ok' },
  fail: { icon: XCircle, cls: 'verdict--fail' },
  unavailable: { icon: CircleSlash, cls: 'verdict--na' }
};

function Verdict({ state, title, children }) {
  const s = STATE[state];
  const Icon = s.icon;
  return (
    <div className={`verdict ${s.cls}`} role="status">
      <Icon aria-hidden="true" size={20} strokeWidth={1.75} />
      <div>
        <p className="verdict__title">{title}</p>
        <div className="verdict__text">{children}</div>
      </div>
    </div>
  );
}

/** Comprobación de condensaciones superficiales e intersticiales (DA DB-HE/2). */
export default function CondensationPanel({ assembly, condensation, materialsById, actions }) {
  const site = assembly.site || {};
  const { surface, interstitial } = condensation;

  return (
    <section className="panel condensation" aria-labelledby="cond-title">
      <div className="panel__header">
        <h2 id="cond-title" className="panel__title">Condensaciones · DA DB-HE/2</h2>
        <p className="panel__subtitle">Superficiales (factor de temperatura f<sub>Rsi</sub>) e intersticiales (diagrama de Glaser, enero).</p>
      </div>

      {!condensation.applicable ? (
        <Verdict state="unavailable" title="Comprobación no disponible">
          <ul className="verdict__reasons">{condensation.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        </Verdict>
      ) : (
        <>
          <FormField label="Clase de higrometría del espacio interior">
            {(p) => (
              <select {...p} className="input select" value={site.hygrometryClass ?? '3'} onChange={(e) => actions.setSite({ hygrometryClass: e.target.value })}>
                {DATA.hygrometryClasses.map((c) => <option key={c.id} value={c.id}>{c.label} (φi = {Math.round(c.phiI * 100)} %)</option>)}
              </select>
            )}
          </FormField>

          <h3 className="cond__h">Condensaciones superficiales</h3>
          {surface.state === 'unavailable' ? (
            <Verdict state="unavailable" title="Falta la zona climática">{surface.reason}</Verdict>
          ) : (
            <Verdict state={surface.state} title={surface.state === 'ok' ? 'Sin riesgo de condensación superficial' : 'Riesgo de condensación superficial'}>
              <span className="num">f<sub>Rsi</sub> = 1 − 0,25 · U = {formatNumber(surface.fRsi, 3)} {surface.state === 'ok' ? '≥' : '<'} f<sub>Rsi,min</sub> = {formatNumber(surface.fRsiMin, 2)}</span>
            </Verdict>
          )}

          <h3 className="cond__h">Condensaciones intersticiales</h3>
          {interstitial.state === 'unavailable' && (
            <Verdict state="unavailable" title="Faltan datos">{interstitial.reason}</Verdict>
          )}
          {interstitial.state !== 'unavailable' && (
            <>
              <Verdict state={interstitial.state} title={interstitial.state === 'ok' ? 'Sin condensaciones intersticiales' : 'Se producen condensaciones intersticiales'}>
                {interstitial.state === 'ok'
                  ? <>P<sub>n</sub> &lt; P<sub>sat</sub> en todas las interfases.</>
                  : <>P<sub>n</sub> ≥ P<sub>sat</sub> en: {interstitial.condensationAt.map((p) => p.label.toLowerCase()).join('; ')}. Considere una barrera de vapor en la cara caliente del aislamiento o cambiar el orden de las capas.</>}
              </Verdict>
              <GlaserChart interstitial={interstitial} materialsById={materialsById} />
              <p className="small muted">
                Clima de enero de {interstitial.exterior.capital} (DA DB-HE/2, tabla C.1)
                {interstitial.exterior.corrected ? `, corregido para ${formatNumber(interstitial.exterior.deltaAltitude, 0)} m más de altitud (−1 °C cada 100 m, misma humedad absoluta)` : ''}.
              </p>
            </>
          )}

          {interstitial.layers && (
            <details className="details" open={interstitial.state === 'unavailable'}>
              <summary>Factor de resistencia a la difusión del vapor μ</summary>
              <div className="table-wrap">
                <table className="breakdown">
                  <thead>
                    <tr><th scope="col">#</th><th scope="col">Capa</th><th scope="col" className="num">μ</th><th scope="col" className="num">S<sub>d</sub> (m)</th></tr>
                  </thead>
                  <tbody>
                    {interstitial.layers.map((l) => {
                      const assemblyLayer = assembly.layers.find((a) => a.id === l.id);
                      const material = materialsById[l.materialId];
                      const fromMaterial = layerMu({}, material, DATA.airLayerMu).value;
                      return (
                        <tr key={l.id}>
                          <td className="num">{l.index + 1}</td>
                          <th scope="row">
                            {l.name}
                            {l.muSource === 'air' && <span className="breakdown__formula">Cámara de aire: μ = 1</span>}
                            {l.muSource === 'infinite' && <span className="breakdown__formula">μ = ∞ según el CEC: estanca al vapor</span>}
                            {material?.properties?.muRange && <span className="breakdown__formula">Rango CEC: μ = {material.properties.muRange[0]}–{material.properties.muRange[1]}; use el del producto</span>}
                          </th>
                          <td className="num">
                            {l.muSource === 'air' ? '1' : l.muSource === 'infinite' ? '∞' : (
                              <input
                                className={`input input--sm input--num mu-input ${l.mu === null ? 'mu-input--missing' : ''}`}
                                type="number"
                                min="1"
                                step="any"
                                aria-label={`μ de la capa ${l.index + 1}`}
                                placeholder={fromMaterial ? String(fromMaterial) : material?.properties?.muRange ? `${material.properties.muRange[0]}–${material.properties.muRange[1]}` : 'μ'}
                                value={assemblyLayer?.mu ?? (fromMaterial ?? '')}
                                onChange={(e) => actions.updateLayer(l.id, { mu: e.target.value === '' ? null : Number(e.target.value) })}
                              />
                            )}
                          </td>
                          <td className="num">{l.muSource === 'infinite' ? '∞' : l.sd !== null ? formatNumber(l.sd, 2) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="small muted">Valores μ del material de referencia cuando existen; si no, introdúzcalo (UNE-EN ISO 10456 o ficha del fabricante). S<sub>d</sub> = μ · e.</p>
            </details>
          )}

          <details className="details">
            <summary>Método y alcance</summary>
            <ul>
              {DATA.notes.map((n) => <li key={n}>{n}</li>)}
              <li>Fuente: {DATA.reference}. {DATA.note}</li>
            </ul>
          </details>
        </>
      )}
    </section>
  );
}
