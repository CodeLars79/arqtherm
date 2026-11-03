import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import Button from './Button.jsx';

/**
 * Diálogo modal accesible basado en <dialog> nativo:
 * captura el foco, se cierra con Esc y devuelve el foco al elemento que lo abrió.
 */
export default function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const ref = useRef(null);
  const titleId = useId();
  const descId = useId();
  const returnFocus = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return undefined;
    const handleClose = () => {
      if (returnFocus.current && typeof returnFocus.current.focus === 'function') {
        returnFocus.current.focus();
      }
    };
    const handleCancel = (event) => {
      event.preventDefault();
      onClose?.();
    };
    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('cancel', handleCancel);
    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('cancel', handleCancel);
    };
  }, [onClose]);

  const handleBackdrop = (event) => {
    if (event.target === ref.current) onClose?.();
  };

  return (
    <dialog
      ref={ref}
      className={`modal modal--${size}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClick={handleBackdrop}
    >
      {open && (
        <div className="modal__inner">
          <header className="modal__header">
            <h2 id={titleId} className="modal__title">{title}</h2>
            <Button variant="ghost" size="sm" icon={X} iconOnly label="Cerrar" onClick={onClose} />
          </header>
          {description && <p id={descId} className="modal__description">{description}</p>}
          <div className="modal__body">{children}</div>
          {footer && <footer className="modal__footer">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}

/** Confirmación para acciones destructivas. */
export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirmar', onConfirm, onCancel }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      size="sm"
      footer={(
        <>
          <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
        </>
      )}
    />
  );
}
