import { Badge } from '../ui/StatusMessage.jsx';
import StatusMessage from '../ui/StatusMessage.jsx';
import ResistanceBreakdown from './ResistanceBreakdown.jsx';
import { formatNumber, formatU } from '../../engine/index.js';

export function resultStatus(calculation) {
  if (calculation.status === 'unsupported') return { tone: 'error', label: 'No soportado', text: 'Este tipo de elemento requiere un procedimiento no implementado.' };
  if (calculation.status !== 'complete') return { tone: 'neutral', label: 'Incompleto', text: 'Faltan datos o hay valores no válidos. No se muestra ningún resultado parcial.' };
  if (calculation.dataQuality === 'verified') return { tone: 'success', label: 'Datos verificados', text: 'Todas las capas usan datos de referencia cotejados con su fuente oficial.' };
  if (calculation.dataQuality === 'user') return { tone: 'info', label: 'Datos del usuario', text: 'El cálculo usa valores introducidos por el usuario, bajo su responsabilidad.' };
  return { tone: 'warning', label: 'Ilustrativo', text: 'El cálculo usa datos genéricos pendientes de cotejo o es un ejemplo. No lo use como justificación sin revisar los valores.' };
}

const TABLE_METHODS = ['ground-slab', 'ground-wall', 'crawl-space'];
const RESISTANCE_SYMBOL = { 'ground-slab': 'Rf', 'ground-wall': 'Rm', 'crawl-space': 'Rf' };
const TABLE_LABEL = { 'ground-slab': 'Tablas 3 y 4, DA DB-HE/1', 'ground-wall': 'Tabla 5, DA DB-HE/1', 'crawl-space': 'Tabla 9, DA DB-HE/1' };

export default function ResultsPanel({ calculation }) {
  const status = resultStatus(calculation);
  const complete = calculation.status === 'complete';
  const tabulated = TABLE_METHODS.includes(calculation.calculationMethod);
  const unheated = calculation.calculationMethod === 'unheated-space';
  const special = calculation.special;

  return (
    <section className="panel results" aria-labelledby="results-title">
      <div className="panel__header panel__header--row">
        <h2 id="results-title" className="panel__title">Resultados</h2>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <div className="u-hero" aria-live="polite">
        <p className="u-hero__label">Transmitancia térmica U</p>
        <p className="u-hero__value num">
          {complete ? formatU(calculation.uValue) : '—'}
          <span className="u-hero__unit">W/(m²·K)</span>
        </p>
        {tabulated ? (
          <dl className="u-hero__facts">
            <div><dt>{RESISTANCE_SYMBOL[calculation.calculationMethod]} (ΣR capas)</dt><dd className="num">{formatNumber(calculation.layersSum, 3)} m²·K/W</dd></div>
            <div><dt>Procedimiento</dt><dd>{TABLE_LABEL[calculation.calculationMethod]}</dd></div>
            <div><dt>R<sub>si</sub> + R<sub>se</sub></dt><dd>Incluidas en la tabla</dd></div>
          </dl>
        ) : unheated ? (
          <dl className="u-hero__facts">
            <div><dt>U<sub>p</sub> partición</dt><dd className="num">{special ? `${formatU(special.up)} W/(m²·K)` : '—'}</dd></div>
            <div><dt>Coeficiente b</dt><dd className="num">{special ? formatNumber(special.b, 2) : '—'}</dd></div>
            <div><dt>R<sub>T</sub> partición</dt><dd className="num">{formatNumber(calculation.totalResistance, 3)} m²·K/W</dd></div>
          </dl>
        ) : (
          <dl className="u-hero__facts">
            <div><dt>R<sub>T</sub></dt><dd className="num">{formatNumber(calculation.totalResistance, 3)} m²·K/W</dd></div>
            <div><dt>ΣR capas</dt><dd className="num">{formatNumber(calculation.layersSum, 3)} m²·K/W</dd></div>
            <div><dt>R<sub>si</sub> + R<sub>se</sub></dt><dd className="num">{calculation.rsi !== null ? formatNumber(calculation.rsi + calculation.rse, 2) : '—'} m²·K/W</dd></div>
          </dl>
        )}
      </div>

      <p className="small muted">{status.text}</p>

      {calculation.issues.length > 0 && (
        <StatusMessage tone={calculation.status === 'unsupported' ? 'error' : 'neutral'} title="Para completar el cálculo">
          <ul className="issue-list">
            {calculation.issues.map((i, n) => <li key={`${i.code}-${n}`}>{i.message}</li>)}
          </ul>
        </StatusMessage>
      )}

      {calculation.layers.length > 0 && calculation.status !== 'unsupported' && (
        <ResistanceBreakdown calculation={calculation} />
      )}

      <details className="details" open={Boolean(special)}>
        <summary>Método de cálculo</summary>
        <p><strong>{calculation.method || 'Sin método: seleccione un tipo de elemento soportado.'}</strong></p>
        {!tabulated && (
          <ol className="formulas">
            <li><span className="mono">R = d / λ</span> — resistencia de cada capa homogénea (d en metros).</li>
            <li><span className="mono">R<sub>T</sub> = R<sub>si</sub> + ΣR<sub>i</sub> + R<sub>se</sub></span></li>
            <li><span className="mono">{unheated ? <>U<sub>p</sub> = 1 / R<sub>T</sub> · U = U<sub>p</sub> · b</> : <>U = 1 / R<sub>T</sub></>}</span></li>
          </ol>
        )}
        {tabulated && (
          <ol className="formulas">
            <li><span className="mono">R = d / λ</span> — resistencia de cada capa (d en metros), sin resistencias superficiales.</li>
            <li>U se lee en la tabla del DA DB-HE/1 con interpolación lineal; la tabla ya incluye el efecto del terreno y de las superficies.</li>
          </ol>
        )}
        {complete && special && (
          <>
            {special.inputs?.length > 0 && (
              <dl className="special-inputs">
                {special.inputs.map((i) => <div key={i.label} style={{ display: 'contents' }}><dt>{i.label}</dt><dd>{i.value}</dd></div>)}
              </dl>
            )}
            <div className="mono small calc-trace special-trace">
              {special.steps.map((st) => <span key={st}>{st}</span>)}
            </div>
            {special.notes?.length > 0 && (
              <StatusMessage tone="warning" title="Fuera del rango de la tabla">
                <ul className="issue-list">{special.notes.map((n) => <li key={n}>{n}</li>)}</ul>
              </StatusMessage>
            )}
            {special.table && (
              <p className="small muted">Fuente: {special.table.reference}. {special.table.note}</p>
            )}
          </>
        )}
        {complete && !special && (
          <p className="mono small calc-trace">
            R<sub>T</sub> = {formatNumber(calculation.rsi, 2)} + {formatNumber(calculation.layersSum, 4)} + {formatNumber(calculation.rse, 2)} = {formatNumber(calculation.totalResistance, 4)} m²·K/W ·
            U = 1 / {formatNumber(calculation.totalResistance, 4)} = {formatNumber(calculation.uValue, 4)} W/(m²·K)
          </p>
        )}
      </details>

      <details className="details">
        <summary>Hipótesis</summary>
        <ul>
          {calculation.assumptions.map((a) => <li key={a}>{a}</li>)}
        </ul>
      </details>
    </section>
  );
}
