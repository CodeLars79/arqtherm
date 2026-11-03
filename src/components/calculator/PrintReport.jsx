import ResistanceBreakdown from './ResistanceBreakdown.jsx';
import { resultStatus } from './ResultsPanel.jsx';
import { formatNumber, formatU } from '../../engine/index.js';
import { cteMetadata, zoneLabel, DATA_STATUS } from '../../data/index.js';
import { APP_VERSION } from '../../config.js';

const dateFmt = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short' });

/** Informe técnico solo visible al imprimir. */
export default function PrintReport({ assembly, calculation, compliance, orientative, materialsById }) {
  const status = resultStatus(calculation);
  const usedMaterials = [...new Set(assembly.layers.map((l) => l.materialId).filter(Boolean))]
    .map((id) => materialsById[id]).filter(Boolean);
  const context = calculation.elementType?.contexts?.find((c) => c.id === assembly.contextId);

  return (
    <article className="print-report print-only">
      <header className="pr__header">
        <p className="pr__brand">Arqtherm · Informe de transmitancia térmica</p>
        <p>{dateFmt.format(new Date())} · v{APP_VERSION} · datos reglamentarios v{cteMetadata.datasetVersion}</p>
      </header>

      <h1>{assembly.name}</h1>
      <table className="pr__meta">
        <tbody>
          <tr><th>Tipo de elemento</th><td>{calculation.elementType?.label ?? '—'}</td></tr>
          <tr><th>Método</th><td>{calculation.method ?? '—'}</td></tr>
          <tr><th>Estado del resultado</th><td>{status.label}. {status.text}</td></tr>
          <tr><th>Zona climática de invierno</th><td>{assembly.climateZone ? zoneLabel(assembly.climateZone) : 'No indicada'}</td></tr>
          {context && <tr><th>Contexto</th><td>{context.label}</td></tr>}
        </tbody>
      </table>

      <h2>Resultado</h2>
      <p className="pr__u">
        U = <strong>{calculation.status === 'complete' ? formatU(calculation.uValue) : '—'}</strong> W/(m²·K) ·
        {calculation.totalResistance !== null
          ? <>R<sub>T</sub> = {formatNumber(calculation.totalResistance, 3)} m²·K/W · </>
          : <>ΣR capas = {formatNumber(calculation.layersSum, 3)} m²·K/W · </>}
        espesor = {calculation.totalThicknessMm ? `${formatNumber(calculation.totalThicknessMm, 0)} mm` : '—'}
      </p>

      {calculation.special && (
        <>
          <h2>{calculation.special.title}</h2>
          <ul>
            {calculation.special.inputs?.map((i) => <li key={i.label}>{i.label}: {i.value}</li>)}
            {calculation.special.steps.map((st) => <li key={st}>{st}</li>)}
            {calculation.special.notes?.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </>
      )}

      <h2>Composición (exterior → interior)</h2>
      <ResistanceBreakdown calculation={calculation} />

      <h2>Comprobación con el DB-HE</h2>
      {compliance.state === 'unavailable' ? (
        <p>Verificación no disponible: {compliance.reasons.join(' ')}</p>
      ) : (
        <p>
          <strong>{compliance.state === 'complies' ? 'Cumple' : 'No cumple'}</strong> el valor límite seleccionado:
          U = {formatU(calculation.uValue, compliance.limit)} {compliance.state === 'complies' ? '≤' : '>'} U<sub>lim</sub> = {formatNumber(compliance.limit, 2)} W/(m²·K).
          Fuente: {compliance.lookup.table.reference}; fila «{compliance.lookup.row.label}».
        </p>
      )}
      <p className="pr__note">
        Esta comparación se refiere a la transmitancia de la parte corriente de un elemento. No acredita
        el cumplimiento del CTE por el edificio ni sustituye la verificación del técnico competente.
      </p>

      <h2>Valores orientativos · Anejo E</h2>
      {!orientative || orientative.state === 'unavailable' ? (
        <p>Comparación no disponible: {orientative?.reasons.join(' ')}</p>
      ) : (
        <p>
          U = {formatU(calculation.uValue, orientative.value)} {orientative.state === 'within' ? '≤' : '>'} U<sub>orient</sub> = {formatNumber(orientative.value, 2)} W/(m²·K):{' '}
          <strong>{orientative.state === 'within' ? 'dentro del valor orientativo' : 'por encima del valor orientativo'}</strong>.
          Fuente: {orientative.lookup.table.reference}; fila «{orientative.lookup.row.label}». Valor orientativo para el
          predimensionado en uso residencial privado; no es una exigencia.
        </p>
      )}

      <h2>Hipótesis</h2>
      <ul>{calculation.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>

      <h2>Fuentes de datos</h2>
      <ul>
        {usedMaterials.map((m) => (
          <li key={m.id}>
            {m.name}: {m.dataStatus === 'user' ? `definido por el usuario${m.source ? ` (${m.source})` : ''}` : m.sourceRef} — {DATA_STATUS[m.dataStatus]?.label}
          </li>
        ))}
        {Object.values(cteMetadata.documents).map((d) => (
          <li key={d.id}>{d.title}, {d.revision}. {d.sourceUrl}</li>
        ))}
      </ul>
    </article>
  );
}
