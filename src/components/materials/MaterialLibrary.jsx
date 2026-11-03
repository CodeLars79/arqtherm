import { useMemo, useState } from 'react';
import { Plus, SearchX } from 'lucide-react';
import MaterialFilters from './MaterialFilters.jsx';
import MaterialCard from './MaterialCard.jsx';
import MaterialDetail from './MaterialDetail.jsx';
import CustomMaterialForm from './CustomMaterialForm.jsx';
import Button from '../ui/Button.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import StatusMessage from '../ui/StatusMessage.jsx';
import { ConfirmDialog } from '../ui/Modal.jsx';
import { referenceMaterials, categoryLabel } from '../../data/index.js';
import { useAppData } from '../../state/AppDataContext.jsx';

const normalise = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function MaterialLibrary() {
  const { customMaterials, addCustomMaterial, removeCustomMaterial } = useAppData();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [flash, setFlash] = useState(null);

  const all = useMemo(() => [...customMaterials, ...referenceMaterials], [customMaterials]);

  const filtered = useMemo(() => {
    const q = normalise(query);
    return all.filter((m) => {
      if (category === 'user' && m.dataStatus !== 'user') return false;
      if (category !== 'all' && category !== 'user' && m.category !== category) return false;
      if (status !== 'all' && m.dataStatus !== status) return false;
      if (!q) return true;
      return normalise(`${m.name} ${m.sourceRef ?? ''} ${m.source ?? ''} ${categoryLabel(m.category)}`).includes(q);
    });
  }, [all, query, category, status]);

  return (
    <>
      <div className="library__intro">
        <StatusMessage tone="info" title="Calidad de los datos">
          Los materiales del Catálogo de Elementos Constructivos del CTE (v6.3) están <strong>verificados</strong>:
          cada valor se ha cotejado con el PDF publicado en codigotecnico.org y su ficha indica la página. Para
          productos industriales son valores genéricos y orientativos: en proyecto use el valor de diseño
          derivado del valor declarado por el fabricante. Los materiales con datos de fabricante o del autor
          figuran como pendientes de cotejo.
        </StatusMessage>
        <Button variant="primary" icon={Plus} onClick={() => setFormOpen(true)}>Nuevo material</Button>
      </div>

      <div aria-live="polite">{flash && <StatusMessage tone="success">{flash}</StatusMessage>}</div>

      <MaterialFilters
        query={query} onQuery={setQuery}
        category={category} onCategory={setCategory}
        status={status} onStatus={setStatus}
        count={filtered.length}
      />

      {filtered.length === 0 ? (
        <EmptyState icon={SearchX} title="Ningún material coincide con la búsqueda">
          Pruebe con otro término o cambie los filtros.
        </EmptyState>
      ) : (
        <ul className="mat-list">
          {filtered.map((m) => <MaterialCard key={m.id} material={m} onOpen={setSelected} />)}
        </ul>
      )}

      <MaterialDetail
        material={toDelete ? null : selected}
        onClose={() => setSelected(null)}
        onDelete={(m) => setToDelete(m)}
      />

      <CustomMaterialForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onCreate={(m) => {
          addCustomMaterial(m);
          setFormOpen(false);
          setFlash(`Material «${m.name}» añadido. Ya está disponible en la calculadora.`);
        }}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Eliminar material de usuario"
        description={toDelete ? `Se eliminará «${toDelete.name}». Las capas que lo usen quedarán sin material hasta que elija otro.` : ''}
        confirmLabel="Eliminar"
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          removeCustomMaterial(toDelete.id);
          setFlash(`Material «${toDelete.name}» eliminado.`);
          setToDelete(null);
          setSelected(null);
        }}
      />
    </>
  );
}
