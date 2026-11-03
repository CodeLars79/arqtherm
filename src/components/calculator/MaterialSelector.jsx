import { useMemo } from 'react';
import { materialCategories, referenceMaterials } from '../../data/index.js';
import { useAppData } from '../../state/AppDataContext.jsx';

/** Selector de material agrupado por categorías. */
export default function MaterialSelector({ value, onChange, ...fieldProps }) {
  const { customMaterials } = useAppData();

  const groups = useMemo(() => materialCategories.map((cat) => ({
    ...cat,
    items: referenceMaterials.filter((m) => m.category === cat.id)
  })).filter((g) => g.items.length > 0), []);

  return (
    <select
      className="input select"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      {...fieldProps}
    >
      <option value="">— Sin material (introducir λ) —</option>
      {customMaterials.length > 0 && (
        <optgroup label="Mis materiales (usuario)">
          {customMaterials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </optgroup>
      )}
      {groups.map((g) => (
        <optgroup key={g.id} label={g.label}>
          {g.items.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
