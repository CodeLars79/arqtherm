import { useEffect, useRef, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';

/** Enlace para compartir el elemento: copiar al portapapeles o seleccionar el texto. */
export default function ShareDialog({ open, onClose, url, includesCustom }) {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { if (open) setCopied(false); }, [open, url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      inputRef.current?.select();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Compartir elemento"
      description="El enlace contiene todo el elemento: capas, parámetros, zona y emplazamiento. No se guarda nada en ningún servidor."
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
          <Button variant="primary" icon={copied ? Check : Copy} onClick={copy}>{copied ? 'Copiado' : 'Copiar enlace'}</Button>
        </>
      )}
    >
      <label className="field__label" htmlFor="share-url">Enlace</label>
      <textarea
        id="share-url"
        ref={inputRef}
        className="input share-url"
        readOnly
        rows={4}
        value={url}
        onFocus={(e) => e.target.select()}
      />
      <p className="small muted">
        Quien lo abra verá el elemento en su calculadora y podrá guardarlo en su navegador.
        {includesCustom ? ' Incluye los materiales definidos por usted que utiliza.' : ''}
      </p>
    </Modal>
  );
}
