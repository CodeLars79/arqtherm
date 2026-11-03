import { useState } from 'react';
import { FolderOpen, Copy, Trash2, Pencil, Check, X, Archive } from 'lucide-react';
import Modal, { ConfirmDialog } from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import { elementTypes } from '../../data/index.js';

const dateFmt = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' });

function SavedRow({ entry, onOpen, onDuplicate, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(entry.assembly.name);
  const type = elementTypes.find((t) => t.id === entry.assembly.elementTypeId);
  const inputId = `rename-${entry.assembly.id}`;

  const commit = () => {
    const trimmed = name.trim();
    if (trimmed) onRename(entry.assembly.id, trimmed.slice(0, 120));
    setEditing(false);
  };

  return (
    <li className="saved__row">
      <div className="saved__info">
        {editing ? (
          <form className="saved__rename" onSubmit={(e) => { e.preventDefault(); commit(); }}>
            <label htmlFor={inputId} className="visually-hidden">Nuevo nombre</label>
            <input id={inputId} className="input" value={name} maxLength={120} autoFocus onChange={(e) => setName(e.target.value)} />
            <Button size="sm" variant="primary" icon={Check} iconOnly label="Guardar nombre" type="submit" />
            <Button size="sm" variant="ghost" icon={X} iconOnly label="Cancelar" onClick={() => { setName(entry.assembly.name); setEditing(false); }} />
          </form>
        ) : (
          <>
            <p className="saved__name">{entry.assembly.name}</p>
            <p className="small muted">
              {type?.shortLabel ?? entry.assembly.elementTypeId} · {entry.assembly.layers.length} capas · {dateFmt.format(new Date(entry.savedAt))}
            </p>
          </>
        )}
      </div>
      {!editing && (
        <div className="saved__actions">
          <Button size="sm" variant="primary" icon={FolderOpen} onClick={() => onOpen(entry)}>Abrir</Button>
          <Button size="sm" variant="ghost" icon={Pencil} iconOnly label={`Renombrar «${entry.assembly.name}»`} onClick={() => setEditing(true)} />
          <Button size="sm" variant="ghost" icon={Copy} iconOnly label={`Duplicar «${entry.assembly.name}»`} onClick={() => onDuplicate(entry.assembly.id)} />
          <Button size="sm" variant="ghost" icon={Trash2} iconOnly label={`Eliminar «${entry.assembly.name}»`} onClick={() => onDelete(entry)} />
        </div>
      )}
    </li>
  );
}

export default function SavedAssembliesDialog({ open, onClose, saved, onOpen, onRename, onDuplicate, onRemove }) {
  const [toDelete, setToDelete] = useState(null);

  return (
    <>
      <Modal
        open={open && !toDelete}
        onClose={onClose}
        title="Mis elementos guardados"
        description="Se guardan solo en el almacenamiento local de este navegador y dispositivo. No se sincronizan; exporte JSON para conservar copias."
        size="lg"
      >
        {saved.length === 0 ? (
          <EmptyState icon={Archive} title="Todavía no hay elementos guardados">
            Use «Guardar» en la calculadora para conservar el elemento actual.
          </EmptyState>
        ) : (
          <ul className="saved">
            {saved.map((entry) => (
              <SavedRow
                key={entry.assembly.id}
                entry={entry}
                onOpen={onOpen}
                onRename={onRename}
                onDuplicate={onDuplicate}
                onDelete={setToDelete}
              />
            ))}
          </ul>
        )}
      </Modal>
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Eliminar elemento guardado"
        description={toDelete ? `Se eliminará «${toDelete.assembly.name}» de este navegador. Esta acción no se puede deshacer.` : ''}
        confirmLabel="Eliminar"
        onCancel={() => setToDelete(null)}
        onConfirm={() => { onRemove(toDelete.assembly.id); setToDelete(null); }}
      />
    </>
  );
}
