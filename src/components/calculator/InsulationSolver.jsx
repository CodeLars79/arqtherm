import { useMemo, useState } from 'react';
import { Target } from 'lucide-react';
import FormField from '../ui/FormField.jsx';
import Button from '../ui/Button.jsx';
import { elementTypes, calculationData } from '../../data/index.js';
import { formatNumber, solveInsulationThickness, formatU } from '../../engine/index.js';

/** Espesor de aislamiento necesario para cumplir Ulim o el valor orientativo del Anejo E. */
export default function InsulationSolver({ assembly, calculation, compliance, orientative, materialsById, actions }) {
  const candidates = assembly.layers.filter((l) => {
    const m = materialsById[l.materialId];
    if (m?.airCavity) return false;
    if (m?.thermalResistance && !l.lambdaOverride) return false;
    return Boolean(m) || l.lambdaOverride;
  });
  const firstInsulation = candidates.find((l) => materialsById[l.materialId]?.category === 'insulation') ?? candidates[0];
  const [layerId, setLayerId] = useState(null);
  const [target, setTarget] = useState('limit');
  const selected = candidates.find((l) => l.id === layerId) ?? firstInsulation;

  const limit = compliance.state !== 'unavailable' ? compliance.limit : null;
  const orient = orientative && orientative.state !== 'unavailable' ? orientative.value : null;
  const targetU = target === 'orientative' ? orient : limit;

  const result = useMemo(() => {
    if (!selected || calculation.status !== 'complete' || !targetU) return null;
    return solveInsulationThickness({ assembly, layerId: selected.id, targetU, deps: { materialsById, elementTypes, calculationData } });
  }, [assembly, selected, targetU, calculation.status, materialsById]);

  if (calculation.status !== 'complete' || candidates.length === 0) return null;

  const name = (l) => l.name || materialsById[l.materialId]?.name || 'Capa';
  const idx = (l) => assembly.layers.indexOf(l) + 1;

  return (
    <section className="panel solver" aria-labelledby="solver-title">
      <div className="panel__header">
        <h2 id="solver-title" className="panel__title"><Target size={17} aria-hidden="true" /> Espesor de aislamiento necesario</h2>
        <p className="panel__subtitle">Espesor mínimo de una capa para alcanzar un valor de U, redondeado a espesores comerciales.</p>
      </div>
      <div className="solver__controls">
        <FormField label="Capa que se ajusta">
          {(p) => (
            <select {...p} className="input select" value={selected?.id ?? ''} onChange={(e) => setLayerId(e.target.value)}>
              {candidates.map((l) => <option key={l.id} value={l.id}>{idx(l)}. {name(l)}</option>)}
            </select>
          )}
        </FormField>
        <FormField label="Objetivo">
          {(p) => (
            <select {...p} className="input select" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="limit">U ≤ Ulim {limit ? `(${formatNumber(limit, 2)})` : '— seleccione zona'}</option>
              <option value="orientative" disabled={!orient}>U ≤ valor orientativo Anejo E {orient ? `(${formatNumber(orient, 2)})` : '(no disponible)'}</option>
            </select>
          )}
        </FormField>
      </div>

      {!targetU && <p className="small muted">Seleccione la zona climática (y, en particiones, las unidades que separa) para obtener el valor objetivo.</p>}
      {result && !result.ok && <p className="solver__error">{result.error}</p>}
      {result?.ok && (
        <div className="solver__result" aria-live="polite">
          {result.notNeeded ? (
            <p>El objetivo se cumple incluso sin esta capa (U con 1 mm ≤ {formatNumber(targetU, 2)}).</p>
          ) : (
            <>
              <dl className="solver__facts">
                <div><dt>Espesor mínimo</dt><dd className="num">{formatNumber(result.exactMm, 1)} mm</dd></div>
                <div><dt>Espesor comercial</dt><dd className="num solver__big">{formatNumber(result.roundedMm, 0)} mm</dd></div>
                <div><dt>U resultante</dt><dd className="num">{formatU(result.uAtRounded, targetU)} W/(m²·K)</dd></div>
              </dl>
              <p className="small muted">
                Ahora: {formatNumber(result.currentMm, 0)} mm, U = {formatU(result.currentU)}.
                {result.alreadyMeets ? ' El espesor actual ya cumple el objetivo.' : ''}
              </p>
              {result.roundedMm !== result.currentMm && (
                <Button size="sm" variant="primary" onClick={() => actions.updateLayer(selected.id, { thicknessMm: result.roundedMm })}>
                  Aplicar {formatNumber(result.roundedMm, 0)} mm a la capa {idx(selected)}
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
