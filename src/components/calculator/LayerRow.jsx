import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Copy, Trash2, RotateCcw } from 'lucide-react';
import Button from '../ui/Button.jsx';
import FormField from '../ui/FormField.jsx';
import DataStatusBadge from '../ui/DataStatusBadge.jsx';
import MaterialSelector from './MaterialSelector.jsx';
import { parseNumericInput, formatNumber, isPositiveFinite } from '../../engine/index.js';

const toText = (n) => (typeof n === 'number' && Number.isFinite(n) ? String(n).replace('.', ',') : '');

/**
 * Una capa del elemento: material, espesor (mm) y conductividad λ.
 * Los textos se editan localmente; al motor solo llegan números válidos o null.
 */
export default function LayerRow({ layer, result, index, count, material, actions, position }) {
  const [thicknessText, setThicknessText] = useState(toText(layer.thicknessMm));
  const [lambdaText, setLambdaText] = useState(toText(layer.lambda));
  const [thicknessInputError, setThicknessInputError] = useState(null);
  const [lambdaInputError, setLambdaInputError] = useState(null);

  // Sincroniza si el valor cambia desde fuera (p. ej., al restablecer).
  useEffect(() => {
    if (parseNumericInput(thicknessText) !== layer.thicknessMm) setThicknessText(toText(layer.thicknessMm));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer.thicknessMm]);

  const kind = material?.airCavity ? 'air' : (material && isPositiveFinite(material.thermalResistance) && !layer.lambdaOverride ? 'fixed' : 'lambda');
  const showsMaterialLambda = kind === 'lambda' && material && !layer.lambdaOverride;

  const onThickness = (text) => {
    setThicknessText(text);
    const value = parseNumericInput(text);
    setThicknessInputError(text.trim() !== '' && value === null ? 'Introduzca un número (p. ej., 50 o 12,5).' : null);
    actions.updateLayer(layer.id, { thicknessMm: value });
  };

  const onLambda = (text) => {
    setLambdaText(text);
    const value = parseNumericInput(text);
    setLambdaInputError(text.trim() !== '' && value === null ? 'Introduzca un número (p. ej., 0,035).' : null);
    actions.updateLayer(layer.id, { lambda: value, lambdaOverride: true });
  };

  const onMaterial = (materialId) => {
    setLambdaText('');
    setLambdaInputError(null);
    actions.updateLayer(layer.id, { materialId, lambdaOverride: materialId ? false : true, lambda: null });
  };

  const resetLambda = () => {
    setLambdaText('');
    setLambdaInputError(null);
    actions.updateLayer(layer.id, { lambda: null, lambdaOverride: false });
  };

  const calcError = result?.error || null;
  const thicknessError = thicknessInputError || (calcError && /espesor/i.test(calcError) ? calcError : null);
  const otherError = !thicknessError && !lambdaInputError ? calcError : (calcError && !/espesor/i.test(calcError) ? calcError : null);

  return (
    <li className={`layer ${result && !result.included ? 'layer--excluded' : ''}`}>
      <div className="layer__head">
        <span className="layer__index" aria-hidden="true">{index + 1}</span>
        <h3 className="layer__title">
          <span className="visually-hidden">Capa {index + 1}{position ? ` (${position})` : ''}: </span>
          {result?.name || material?.name || 'Capa sin material'}
        </h3>
        {position && <span className="layer__position">{position}</span>}
        <div className="layer__actions">
          <Button size="sm" variant="ghost" icon={ArrowUp} iconOnly label={`Subir capa ${index + 1} (hacia el exterior)`} disabled={index === 0} onClick={() => actions.moveLayer(layer.id, -1)} />
          <Button size="sm" variant="ghost" icon={ArrowDown} iconOnly label={`Bajar capa ${index + 1} (hacia el interior)`} disabled={index === count - 1} onClick={() => actions.moveLayer(layer.id, 1)} />
          <Button size="sm" variant="ghost" icon={Copy} iconOnly label={`Duplicar capa ${index + 1}`} onClick={() => actions.duplicateLayer(layer.id)} />
          <Button size="sm" variant="ghost" icon={Trash2} iconOnly label={`Eliminar capa ${index + 1}`} onClick={() => actions.requestRemoveLayer(layer)} />
        </div>
      </div>

      <div className="layer__grid">
        <FormField label="Material" className="layer__material">
          {(p) => <MaterialSelector value={layer.materialId} onChange={onMaterial} {...p} />}
        </FormField>

        <FormField label="Espesor (mm)" error={thicknessError} className="layer__thickness">
          {(p) => (
            <input
              {...p}
              className="input input--num"
              inputMode="decimal"
              autoComplete="off"
              value={thicknessText}
              onChange={(e) => onThickness(e.target.value)}
              placeholder="mm"
            />
          )}
        </FormField>

        {kind === 'lambda' ? (
          <FormField
            label="λ, W/(m·K)"
            error={lambdaInputError}
            hint={layer.lambdaOverride && material ? 'Valor manual (usuario)' : undefined}
            className="layer__lambda"
          >
            {(p) => (
              <div className="input-with-action">
                <input
                  {...p}
                  className="input input--num"
                  inputMode="decimal"
                  autoComplete="off"
                  value={showsMaterialLambda ? toText(material.thermalConductivity) : lambdaText}
                  onChange={(e) => onLambda(e.target.value)}
                  placeholder="λ"
                />
                {layer.lambdaOverride && material && isPositiveFinite(material.thermalConductivity) && (
                  <Button size="sm" variant="ghost" icon={RotateCcw} iconOnly label="Restablecer λ del material" onClick={resetLambda} />
                )}
              </div>
            )}
          </FormField>
        ) : (
          <div className="field layer__lambda">
            <span className="field__label">{kind === 'air' ? 'Cámara de aire' : 'Resistencia tabulada'}</span>
            <p className="layer__fixed">
              {kind === 'air' ? 'R según DA DB-HE/1' : `R = ${formatNumber(material.thermalResistance, 2)} m²·K/W`}
            </p>
          </div>
        )}

        <div className="layer__r" aria-live="polite">
          <span className="field__label">R, m²·K/W</span>
          <p className="num">{result?.included ? formatNumber(result?.resistance, 3) : 'no computa'}</p>
        </div>
      </div>

      <div className="layer__meta">
        {result && <DataStatusBadge status={result.dataStatus} />}
        {result?.excludedReason && <span className="small muted">{result.excludedReason}</span>}
        {otherError && <p className="field__error" role="alert">{otherError}</p>}
      </div>
    </li>
  );
}
