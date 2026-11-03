import { useId } from 'react';

/**
 * Etiqueta, ayuda y error asociados a un control mediante id / aria-describedby.
 * `children` es una función que recibe las props de accesibilidad del control.
 */
export default function FormField({ label, hint, error, children, className = '', hideLabel = false }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      <label htmlFor={id} className={hideLabel ? 'visually-hidden' : 'field__label'}>{label}</label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && <p id={hintId} className="field__hint">{hint}</p>}
      {error && <p id={errorId} className="field__error">{error}</p>}
    </div>
  );
}
