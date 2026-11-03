import { formatNumber } from '../../engine/index.js';

const CATEGORY_CLASS = {
  insulation: 'swatch--insulation',
  ceramic: 'swatch--ceramic',
  concrete: 'swatch--concrete',
  stone: 'swatch--stone',
  timber: 'swatch--timber',
  gypsum: 'swatch--gypsum',
  air: 'swatch--air',
  other: 'swatch--other'
};

/**
 * Sección esquemática del elemento: anchos proporcionales al espesor.
 */
export default function AssemblyPreview({ calculation, materialsById, compact = false }) {
  const layers = calculation.layers;
  const valid = layers.filter((l) => l.thicknessMm);
  const total = valid.reduce((acc, l) => acc + l.thicknessMm, 0);

  if (layers.length === 0) return null;

  const summary = layers
    .map((l, i) => `${i + 1}. ${l.name}${l.thicknessMm ? `, ${formatNumber(l.thicknessMm, 0)} mm` : ''}`)
    .join('; ');

  return (
    <figure className={`preview ${compact ? 'preview--compact' : ''}`}>
      <div className="preview__axis" aria-hidden="true">
        <span>Exterior</span>
        <span>Interior</span>
      </div>
      <div className="preview__bar" role="img" aria-label={`Sección del elemento, del exterior al interior: ${summary}`}>
        {layers.map((l, i) => {
          const material = materialsById[l.materialId];
          const share = total > 0 && l.thicknessMm ? (l.thicknessMm / total) * 100 : 0;
          const cls = CATEGORY_CLASS[material?.category] || 'swatch--other';
          return (
            <div
              key={l.id}
              className={`preview__layer ${cls} ${l.included ? '' : 'preview__layer--excluded'} ${l.error ? 'preview__layer--error' : ''}`}
              style={{ flexGrow: Math.max(share, 2) }}
              title={`${i + 1}. ${l.name}`}
            >
              {!compact && <span className="preview__num">{i + 1}</span>}
            </div>
          );
        })}
      </div>
      {!compact && (
        <figcaption className="preview__caption">
          Esquema no a escala gráfica exacta (anchura mínima para capas finas). Espesor total:{' '}
          <strong className="num">{calculation.totalThicknessMm ? `${formatNumber(calculation.totalThicknessMm, 0)} mm` : '—'}</strong>
        </figcaption>
      )}
    </figure>
  );
}
