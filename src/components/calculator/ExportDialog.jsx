import { useRef, useState } from 'react';
import { Copy } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';

/**
 * Alternativa cuando la vista no permite descargas: el JSON se muestra para copiarlo.
 */
export default function ExportDialog({ open, onClose, json, filename }) {
  const ref = useRef(null);
  const [copied, setCopied] = useState(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied('Copiado al portapapeles.');
    } catch {
      ref.current?.focus();
      ref.current?.select();
      setCopied('Texto seleccionado: cópielo con Ctrl+C o ⌘+C.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => { setCopied(null); onClose(); }}
      title="Exportar JSON"
      description={`Esta vista no permite descargar archivos. Copie el contenido y guárdelo como «${filename}».`}
      size="lg"
      footer={(
        <>
          <span className="small muted export__status" aria-live="polite">{copied}</span>
          <Button variant="primary" icon={Copy} onClick={copy}>Copiar JSON</Button>
        </>
      )}
    >
      <label htmlFor="export-json" className="visually-hidden">Contenido JSON del elemento</label>
      <textarea id="export-json" ref={ref} className="input textarea export__text" readOnly value={json} rows={16} />
    </Modal>
  );
}
