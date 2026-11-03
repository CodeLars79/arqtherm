import { useMemo } from 'react';
import Modal from '../ui/Modal.jsx';
import { TEMPLATES, assemblyFromTemplate } from '../../data/templates.js';
import { elementTypes, calculationData } from '../../data/index.js';
import { calculateAssembly, formatNumber } from '../../engine/index.js';

const CATEGORY_CLASS = {
  insulation: 'swatch--insulation', ceramic: 'swatch--ceramic', concrete: 'swatch--concrete', stone: 'swatch--stone',
  timber: 'swatch--timber', gypsum: 'swatch--gypsum', air: 'swatch--air', other: 'swatch--other'
};

/** Selector de plantillas de soluciones constructivas habituales. */
export default function TemplatesDialog({ open, onClose, onPick, materialsById, current }) {
  const items = useMemo(() => TEMPLATES.map((t) => {
    const a = assemblyFromTemplate(t, current);
    const c = calculateAssembly(a, { materialsById, elementTypes, calculationData });
    const total = t.layers.reduce((s, [, d]) => s + d, 0);
    const pending = t.layers.filter(([id]) => !id).length;
    return { t, u: c.status === 'complete' ? c.uValue : null, total, pending, type: elementTypes.find((e) => e.id === t.elementTypeId) };
  }), [materialsById, current]);
  const groups = [...new Set(TEMPLATES.map((t) => t.group))];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Plantillas de soluciones constructivas"
      description="Puntos de partida habituales en España con materiales genéricos de la biblioteca. Al elegir una, sustituye al elemento actual (guárdelo antes si lo necesita) y conserva la zona y el emplazamiento."
      size="lg"
    >
      {groups.map((g) => (
        <section key={g} className="tpl-group">
          <h3 className="tpl-group__title">{g}</h3>
          <ul className="tpl-list">
            {items.filter((i) => i.t.group === g).map(({ t, u, total, pending, type }) => (
              <li key={t.id}>
                <button type="button" className="tpl" onClick={() => onPick(t)}>
                  <span className="tpl__bar" aria-hidden="true">
                    {t.layers.map(([id, d], i) => (
                      <span key={`${id}-${i}`} className={`tpl__seg ${id ? CATEGORY_CLASS[materialsById[id]?.category] || 'swatch--other' : 'tpl__seg--pending'}`} style={{ flexGrow: Math.max(d, 8) }} />
                    ))}
                  </span>
                  <span className="tpl__body">
                    <span className="tpl__name">{t.name}</span>
                    <span className="tpl__desc">{t.description}</span>
                    <span className="tpl__meta">
                      {type?.shortLabel} · {formatNumber(total, 1).replace(/,0$/, '')} mm · {t.layers.length} capas
                      {pending > 0 && <span className="tpl__pending"> · {pending === 1 ? '1 capa requiere' : `${pending} capas requieren`} λ del fabricante</span>}
                    </span>
                  </span>
                  <span className="tpl__u num">
                    <small>U</small>{u === null ? (pending ? '?' : '—') : formatNumber(u, 2)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="small muted">Materiales genéricos del CEC verificados (salvo los de fabricante o del autor, pendientes de cotejo) y espesores típicos. Sustitúyalos por los productos de su proyecto.</p>
    </Modal>
  );
}
