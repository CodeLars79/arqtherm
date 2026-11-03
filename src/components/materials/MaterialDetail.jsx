import { Trash2, ExternalLink } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import DataStatusBadge from '../ui/DataStatusBadge.jsx';
import StatusMessage from '../ui/StatusMessage.jsx';
import { categoryLabel, materialSources, DATA_STATUS, VALUE_TYPES } from '../../data/index.js';
import { formatNumber } from '../../engine/index.js';
import { materialValue } from './MaterialCard.jsx';

const PROPERTY_LABELS = {
  density: ['Densidad ρ', 'kg/m³'],
  densityRange: ['Densidad ρ', 'kg/m³'],
  densityMax: ['Densidad ρ máx.', 'kg/m³'],
  specificHeat: ['Calor específico cp', 'J/(kg·K)'],
  mu: ['Factor de resistencia al vapor μ', '—'],
  muRange: ['Factor de resistencia al vapor μ (rango CEC)', '—'],
  muInfinite: ['Factor de resistencia al vapor μ', '']
};

const fmt = (v) => (v === true ? '∞ (estanco al vapor)' : Array.isArray(v) ? `${v[0]}–${v[1]}` : String(v));

export default function MaterialDetail({ material, onClose, onDelete }) {
  if (!material) return <Modal open={false} onClose={onClose} title="" />;
  const v = materialValue(material);
  const source = materialSources[material.sourceId];
  const status = DATA_STATUS[material.dataStatus];

  return (
    <Modal
      open
      onClose={onClose}
      title={material.name}
      size="md"
      footer={material.dataStatus === 'user' ? (
        <Button variant="danger" icon={Trash2} onClick={() => onDelete(material)}>Eliminar material</Button>
      ) : null}
    >
      <div className="detail">
        <p className="detail__value num">
          <span className="mat__symbol">{v.symbol}</span> {v.value} <span className="mat__unit">{v.unit}</span>
        </p>
        <p><DataStatusBadge status={material.dataStatus} /> <span className="small muted">{status?.description}</span></p>

        <dl className="facts">
          <div><dt>Categoría</dt><dd>{categoryLabel(material.category)}</dd></div>
          <div><dt>Tipo de valor</dt><dd>{VALUE_TYPES[material.valueType] ?? material.valueType ?? '—'}</dd></div>
          {material.conductivityRange && (
            <div><dt>Rango tabulado de λ</dt><dd className="num">{formatNumber(material.conductivityRange[0], 3)}–{formatNumber(material.conductivityRange[1], 3)} W/(m·K)</dd></div>
          )}
          {material.thicknessRangeMm && (
            <div><dt>Espesores de validez</dt><dd className="num">{fmt(material.thicknessRangeMm)} mm</dd></div>
          )}
          {material.properties && Object.entries(material.properties).map(([k, val]) => (
            <div key={k}><dt>{PROPERTY_LABELS[k]?.[0] ?? k}</dt><dd className="num">{fmt(val)} {PROPERTY_LABELS[k]?.[1] ?? ''}</dd></div>
          ))}
          {material.verification && (
            <div><dt>Verificación</dt><dd>Cotejado con {material.verification.document}, pág. {material.verification.page} del PDF, el {new Date(`${material.verification.verifiedOn}T12:00:00`).toLocaleDateString('es-ES')}</dd></div>
          )}
          <div><dt>Referencia</dt><dd>{material.dataStatus === 'user' ? (material.source || 'Definido por el usuario') : material.sourceRef}</dd></div>
          {source && (
            <>
              <div><dt>Fuente</dt><dd>{source.title}{source.date ? ` (${source.date})` : ''}{source.publisher ? `. ${source.publisher}` : ''}</dd></div>
              {source.conditions && <div><dt>Condiciones</dt><dd>{source.conditions}</dd></div>}
              {source.transcribedFrom && <div><dt>Transcrito de</dt><dd>{source.transcribedFrom}</dd></div>}
              {source.officialUrl && (
                <div><dt>Enlace</dt><dd><a href={source.officialUrl} target="_blank" rel="noopener noreferrer">Fuente oficial <ExternalLink aria-hidden="true" size={13} /></a></dd></div>
              )}
            </>
          )}
          {material.createdAt && <div><dt>Creado</dt><dd>{new Date(material.createdAt).toLocaleDateString('es-ES')}</dd></div>}
        </dl>

        {material.notes && <p className="detail__notes">{material.notes}</p>}
        {source?.legalNote && <StatusMessage tone="info">{source.legalNote}</StatusMessage>}
      </div>
    </Modal>
  );
}
