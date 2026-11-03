import { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import FormField from '../ui/FormField.jsx';
import StatusMessage from '../ui/StatusMessage.jsx';
import { materialCategories } from '../../data/index.js';
import { parseNumericInput, isPositiveFinite } from '../../engine/index.js';
import { createId } from '../../utils/ids.js';

const EMPTY = { name: '', category: 'insulation', lambda: '', valueType: 'design', source: '', notes: '' };

/** Alta de un material definido por el usuario. */
export default function CustomMaterialForm({ open, onClose, onCreate }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const lambda = parseNumericInput(form.lambda);
    const next = {};
    if (!form.name.trim()) next.name = 'Indique un nombre.';
    if (!isPositiveFinite(lambda)) next.lambda = 'Introduzca una conductividad mayor que cero (p. ej., 0,034).';
    else if (lambda > 500) next.lambda = 'Valor fuera de rango razonable para materiales de construcción.';
    setErrors(next);
    if (Object.keys(next).length) return;

    onCreate({
      id: createId('user'),
      name: form.name.trim().slice(0, 120),
      category: form.category,
      thermalConductivity: lambda,
      unit: 'W/(m·K)',
      dataStatus: 'user',
      valueType: form.valueType,
      source: form.source.trim().slice(0, 200),
      notes: form.notes.trim().slice(0, 500),
      createdAt: new Date().toISOString()
    });
    setForm(EMPTY);
    setErrors({});
  };

  const close = () => { setForm(EMPTY); setErrors({}); onClose(); };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Nuevo material de usuario"
      description="Se guarda solo en este navegador. Los valores son responsabilidad de quien los introduce."
      footer={(
        <>
          <Button variant="secondary" onClick={close}>Cancelar</Button>
          <Button variant="primary" type="submit" form="custom-material-form">Añadir material</Button>
        </>
      )}
    >
      <form id="custom-material-form" className="form-grid" onSubmit={submit} noValidate>
        <FormField label="Nombre" error={errors.name}>
          {(p) => <input {...p} className="input" value={form.name} maxLength={120} onChange={set('name')} placeholder="p. ej., Lana mineral marca X, 40 mm" />}
        </FormField>
        <FormField label="Categoría">
          {(p) => (
            <select {...p} className="input select" value={form.category} onChange={set('category')}>
              {materialCategories.filter((c) => c.id !== 'air').map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          )}
        </FormField>
        <FormField label="Conductividad térmica λ, W/(m·K)" error={errors.lambda}>
          {(p) => <input {...p} className="input input--num" inputMode="decimal" value={form.lambda} onChange={set('lambda')} placeholder="0,034" />}
        </FormField>
        <FormField label="Tipo de valor" hint="El cálculo debe usar valores de diseño (DB-HE, HE1 5.1.7).">
          {(p) => (
            <select {...p} className="input select" value={form.valueType} onChange={set('valueType')}>
              <option value="design">Valor térmico de diseño</option>
              <option value="declared">Valor declarado por el fabricante (λD)</option>
            </select>
          )}
        </FormField>
        <FormField label="Fuente" hint="p. ej., Declaración de prestaciones nº…, ficha técnica, ensayo.">
          {(p) => <input {...p} className="input" value={form.source} maxLength={200} onChange={set('source')} />}
        </FormField>
        <FormField label="Notas">
          {(p) => <textarea {...p} className="input textarea" rows={3} value={form.notes} maxLength={500} onChange={set('notes')} />}
        </FormField>
        {form.valueType === 'declared' && (
          <StatusMessage tone="warning">
            Un valor declarado puede requerir conversión a valor de diseño (UNE-EN ISO 10456) según las condiciones de uso.
          </StatusMessage>
        )}
      </form>
    </Modal>
  );
}
