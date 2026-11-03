import { Plus } from 'lucide-react';
import FormField from '../ui/FormField.jsx';
import Button from '../ui/Button.jsx';
import StatusMessage from '../ui/StatusMessage.jsx';
import LayerList from './LayerList.jsx';
import AssemblyPreview from './AssemblyPreview.jsx';
import { elementTypes, elementTypeGroups } from '../../data/index.js';
import ElementParameters from './ElementParameters.jsx';
import { formatNumber } from '../../engine/index.js';

export default function AssemblyEditor({ assembly, calculation, materialsById, actions }) {
  const elementType = elementTypes.find((e) => e.id === assembly.elementTypeId);

  return (
    <section className="panel editor" aria-labelledby="editor-title">
      <div className="panel__header">
        <h2 id="editor-title" className="panel__title">Composición del elemento</h2>
        <p className="panel__subtitle">Capas del exterior (1) al interior.</p>
      </div>

      {assembly.isExample && (
        <StatusMessage tone="warning" title="Elemento de ejemplo ilustrativo">
          Usa valores genéricos del Catálogo de Elementos Constructivos (verificados). No es una
          solución constructiva verificada. Sustituya los materiales por los de su proyecto.
        </StatusMessage>
      )}

      <div className="editor__meta">
        <FormField label="Nombre del elemento">
          {(p) => (
            <input
              {...p}
              className="input"
              value={assembly.name}
              maxLength={120}
              onChange={(e) => actions.setName(e.target.value)}
            />
          )}
        </FormField>
        <FormField label="Tipo de elemento" hint={elementType?.supported ? elementType.method : undefined}>
          {(p) => (
            <select {...p} className="input select" value={assembly.elementTypeId} onChange={(e) => actions.setElementType(e.target.value)}>
              {elementTypeGroups.map((g) => {
                const items = elementTypes.filter((t) => t.group === g.id);
                return items.length ? (
                  <optgroup key={g.id} label={g.label}>
                    {items.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </optgroup>
                ) : null;
              })}
            </select>
          )}
        </FormField>
      </div>

      {elementType && !elementType.supported && (
        <StatusMessage tone="error" title="Procedimiento no implementado">{elementType.unsupportedReason}</StatusMessage>
      )}

      <ElementParameters elementType={elementType} params={assembly.params} onChange={actions.setParams} layers={assembly.layers} materialsById={materialsById} />

      <AssemblyPreview calculation={calculation} materialsById={materialsById} />

      <LayerList assembly={assembly} calculation={calculation} materialsById={materialsById} actions={actions} />

      <div className="editor__footer">
        {assembly.layers.length > 0 && (
          <Button variant="secondary" icon={Plus} onClick={actions.addLayer}>Añadir capa</Button>
        )}
        <p className="editor__total">
          Espesor total <strong className="num">{calculation.totalThicknessMm ? `${formatNumber(calculation.totalThicknessMm, 0)} mm` : '—'}</strong>
        </p>
      </div>
    </section>
  );
}
