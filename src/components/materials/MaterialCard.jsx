import { ChevronRight } from 'lucide-react';
import DataStatusBadge from '../ui/DataStatusBadge.jsx';
import { categoryLabel } from '../../data/index.js';
import { formatNumber } from '../../engine/index.js';

/** Valor térmico principal de un material, con su unidad. */
export function materialValue(m) {
  if (m.airCavity) return { value: 'Según espesor', unit: '', symbol: 'R' };
  if (m.thermalResistance) return { value: formatNumber(m.thermalResistance, 2), unit: 'm²·K/W', symbol: 'R' };
  return { value: formatNumber(m.thermalConductivity, m.thermalConductivity < 0.1 ? 3 : 2), unit: 'W/(m·K)', symbol: 'λ' };
}

export default function MaterialCard({ material, onOpen }) {
  const v = materialValue(material);
  return (
    <li className="mat">
      <button type="button" className="mat__button" onClick={() => onOpen(material)}>
        <span className="mat__main">
          <span className="mat__name">{material.name}</span>
          <span className="mat__source small muted">
            {categoryLabel(material.category)} · {material.dataStatus === 'user' ? (material.source || 'Definido por el usuario') : material.sourceRef}
          </span>
        </span>
        <span className="mat__value num">
          <span className="mat__symbol">{v.symbol}</span> {v.value} <span className="mat__unit">{v.unit}</span>
        </span>
        <span className="mat__status"><DataStatusBadge status={material.dataStatus} /></span>
        <ChevronRight aria-hidden="true" size={16} className="mat__chevron" />
        <span className="visually-hidden">Ver detalle</span>
      </button>
    </li>
  );
}
