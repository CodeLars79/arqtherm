import { CheckCircle2, XCircle, CircleSlash, AlertTriangle } from 'lucide-react';
import FormField from '../ui/FormField.jsx';
import { cteMetadata, climateZonesData } from '../../data/index.js';
import { formatNumber, zoneForAltitude, parseZoneCode, formatU } from '../../engine/index.js';

const provinces = climateZonesData.provinces;

/** Emplazamiento: provincia y altitud (zona del Anejo B y clima de enero para condensaciones). */
function SiteFields({ assembly, actions }) {
  const site = assembly.site || {};
  const province = provinces.find((p) => p.ineCode === site.ineCode);
  const alt = site.altitudeM ?? province?.capitalReferenceAltitudeM;
  const z = province ? zoneForAltitude(province, alt ?? 0) : null;
  const winter = z ? parseZoneCode(z.zone).winter : null;
  const zoneId = winter === 'α' ? 'alpha' : winter;
  return (
    <>
      <div className="site-grid">
        <FormField label="Provincia del emplazamiento">
          {(p) => (
            <select {...p} className="input select" value={site.ineCode ?? ''} onChange={(e) => actions.setSite({ ineCode: e.target.value || null })}>
              <option value="">— Seleccione —</option>
              {provinces.map((pr) => <option key={pr.ineCode} value={pr.ineCode}>{pr.name}</option>)}
            </select>
          )}
        </FormField>
        <FormField label="Altitud de la localidad (m)" hint={province && site.altitudeM == null ? `Vacío: altitud de referencia de ${province.capital} (${province.capitalReferenceAltitudeM} m).` : undefined}>
          {(p) => (
            <input
              {...p}
              className="input input--num"
              type="number"
              min="0"
              inputMode="numeric"
              value={site.altitudeM ?? ''}
              onChange={(e) => actions.setSite({ altitudeM: e.target.value === '' ? null : Number(e.target.value) })}
            />
          )}
        </FormField>
      </div>
      {z && (
        <p className="site-zone">
          Tabla a-Anejo B: zona <strong>{z.zone}</strong> ({province.name}, {formatNumber(alt, 0)} m).{' '}
          {assembly.climateZone !== zoneId ? (
            <button type="button" className="linklike" onClick={() => actions.setClimateZone(zoneId)}>Usar zona de invierno {winter}</button>
          ) : <span className="muted">Zona de invierno aplicada.</span>}
        </p>
      )}
    </>
  );
}

const STATES = {
  complies: { icon: CheckCircle2, cls: 'verdict--ok', title: 'Cumple el valor límite seleccionado' },
  'not-complies': { icon: XCircle, cls: 'verdict--fail', title: 'No cumple el valor límite seleccionado' },
  unavailable: { icon: CircleSlash, cls: 'verdict--na', title: 'Verificación no disponible' }
};

const ORIENTATIVE_STATES = {
  within: { icon: CheckCircle2, cls: 'orient--within', title: 'Dentro del valor orientativo' },
  above: { icon: AlertTriangle, cls: 'orient--above', title: 'Por encima del valor orientativo' },
  unavailable: { icon: CircleSlash, cls: 'orient--na', title: 'Comparación no disponible' }
};

/** Comparación con el valor orientativo de la tabla a-Anejo E (no es una exigencia). */
function OrientativeComparison({ calculation, orientative }) {
  const state = ORIENTATIVE_STATES[orientative.state];
  const Icon = state.icon;
  const lookup = orientative.lookup;
  const scope = lookup?.ok ? lookup.table.scope : null;

  return (
    <section className="orient" aria-labelledby="orient-title">
      <div className="orient__head">
        <h3 id="orient-title" className="orient__title">Valores orientativos · Anejo E</h3>
        <span className="orient__tag">Orientativo, no exigible</span>
      </div>
      <p className="small muted">
        Referencia del DB-HE para el predimensionado en uso residencial privado, con vistas a cumplir el coeficiente global K.
      </p>

      <div className={`orient__result ${state.cls}`} role="status" aria-live="polite">
        <Icon aria-hidden="true" size={18} strokeWidth={1.75} />
        <div>
          <p className="orient__state">{state.title}</p>
          {orientative.state === 'unavailable' ? (
            <ul className="verdict__reasons">
              {orientative.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          ) : (
            <p className="verdict__text num">
              U = {formatU(calculation.uValue, orientative.value)} {orientative.state === 'within' ? '≤' : '>'} U<sub>orient</sub> = {formatNumber(orientative.value, 2)} W/(m²·K)
              {orientative.state === 'above' && (
                <> · reducir U en {formatU(-orientative.margin, 0)} W/(m²·K) para alcanzarlo</>
              )}
            </p>
          )}
        </div>
      </div>

      {lookup?.ok && (
        <dl className="facts">
          <div><dt>Fila aplicada</dt><dd>{lookup.row.label}</dd></div>
          <div><dt>Fuente</dt><dd>{lookup.table.reference}. <a href={lookup.table.verifiedAgainst} target="_blank" rel="noopener noreferrer">Cotejado con la Guía de aplicación del DB-HE</a></dd></div>
        </dl>
      )}

      {scope && (
        <details className="details">
          <summary>Alcance del Anejo E</summary>
          <ul>{scope.map((n) => <li key={n}>{n}</li>)}</ul>
        </details>
      )}
    </section>
  );
}

/** Comparación opcional de U con Ulim (DB-HE, tablas 3.1.1.a-HE1 / 3.2-HE1) y con el Anejo E. */
export default function CTEVerification({ assembly, calculation, compliance, orientative, actions }) {
  const elementType = calculation.elementType;
  const contexts = elementType?.contexts || [];
  const state = STATES[compliance.state];
  const Icon = state.icon;
  const lookup = compliance.lookup;

  return (
    <section className="panel verification" aria-labelledby="cte-title">
      <div className="panel__header">
        <h2 id="cte-title" className="panel__title">Comprobación con el CTE DB-HE</h2>
        <p className="panel__subtitle">Transmitancia frente al valor límite U<sub>lim</sub> y al valor orientativo del Anejo E.</p>
      </div>

      <div className="verification__controls">
        <SiteFields assembly={assembly} actions={actions} />
        <FormField label="Zona climática de invierno" hint={cteMetadata.climateZoneHelp}>
          {(p) => (
            <select {...p} className="input select" value={assembly.climateZone ?? ''} onChange={(e) => actions.setClimateZone(e.target.value)}>
              <option value="">— Seleccione —</option>
              {cteMetadata.climateZones.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
            </select>
          )}
        </FormField>
        {contexts.length > 0 && (
          <FormField label="Unidades que separa la partición">
            {(p) => (
              <select {...p} className="input select" value={assembly.contextId ?? ''} onChange={(e) => actions.setContext(e.target.value)}>
                <option value="">— Seleccione —</option>
                {contexts.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            )}
          </FormField>
        )}
      </div>

      <div className={`verdict ${state.cls}`} role="status" aria-live="polite">
        <Icon aria-hidden="true" size={22} strokeWidth={1.75} />
        <div>
          <p className="verdict__title">{state.title}</p>
          {compliance.state === 'unavailable' ? (
            <ul className="verdict__reasons">
              {compliance.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          ) : (
            <p className="verdict__text num">
              U = {formatU(calculation.uValue, compliance.limit)} {compliance.state === 'complies' ? '≤' : '>'} U<sub>lim</sub> = {formatNumber(compliance.limit, 2)} W/(m²·K)
            </p>
          )}
        </div>
      </div>

      {lookup?.ok && (
        <dl className="facts">
          <div><dt>Valor límite</dt><dd className="num">{formatNumber(lookup.limit, 2)} W/(m²·K) ({lookup.symbol})</dd></div>
          <div><dt>Fila aplicada</dt><dd>{lookup.row.label}</dd></div>
          <div><dt>Fuente</dt><dd>{lookup.table.reference}, pág. {lookup.table.page}. <a href={lookup.table.verifiedAgainst} target="_blank" rel="noopener noreferrer">DB-HE consolidado ({cteMetadata.documents['DB-HE'].revision})</a></dd></div>
          <div><dt>Verificación del dato</dt><dd>Cotejado el {lookup.table.verifiedOn} · conjunto de datos v{cteMetadata.datasetVersion}</dd></div>
        </dl>
      )}

      {orientative && <OrientativeComparison calculation={calculation} orientative={orientative} />}

      <details className="details">
        <summary>Hipótesis y alcance de la comprobación</summary>
        <ul>
          <li>Se compara U a precisión completa con U<sub>lim</sub>; cumple si U ≤ U<sub>lim</sub> («no superará», HE1 3.1.1).</li>
          <li>U es la transmitancia de la parte corriente; no incluye puentes térmicos.</li>
          <li>Esta comparación no acredita que el edificio cumpla el CTE: también deben verificarse, entre otros, K (coeficiente global), q<sub>sol;jul</sub>, permeabilidad al aire, condensaciones, HE0 y el resto de documentos básicos.</li>
          {cteMetadata.applicability.transitionalNotes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      </details>
    </section>
  );
}
