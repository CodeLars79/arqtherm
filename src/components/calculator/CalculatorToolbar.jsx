import { FilePlus2, Save, FolderOpen, Download, FileText, Printer, RotateCcw, Loader2, LayoutTemplate, Share2 } from 'lucide-react';
import Button from '../ui/Button.jsx';

export default function CalculatorToolbar({ savedCount, onNew, onSave, onTemplates, onShare, onOpenSaved, onExportPdf, pdfBusy, onExportJson, onPrint, onReset }) {
  return (
    <div className="toolbar no-print" role="toolbar" aria-label="Acciones del elemento">
      <div className="toolbar__group">
        <Button size="sm" icon={FilePlus2} onClick={onNew}>Nuevo</Button>
        <Button size="sm" icon={LayoutTemplate} onClick={onTemplates}>Plantillas</Button>
        <Button size="sm" icon={Save} onClick={onSave}>Guardar</Button>
        <Button size="sm" icon={FolderOpen} onClick={onOpenSaved}>
          Mis elementos{savedCount > 0 ? ` (${savedCount})` : ''}
        </Button>
      </div>
      <div className="toolbar__group">
        <Button
          size="sm"
          variant="primary"
          icon={pdfBusy ? Loader2 : FileText}
          onClick={onExportPdf}
          disabled={pdfBusy}
          aria-busy={pdfBusy || undefined}
          className={pdfBusy ? 'btn--busy' : ''}
        >
          {pdfBusy ? 'Generando PDF…' : 'Exportar PDF'}
        </Button>
        <Button size="sm" icon={Share2} onClick={onShare}>Compartir</Button>
        <Button size="sm" icon={Download} onClick={onExportJson}>Exportar JSON</Button>
        {onPrint && <Button size="sm" icon={Printer} onClick={onPrint}>Imprimir</Button>}
        <Button size="sm" variant="ghost" icon={RotateCcw} onClick={onReset}>Restablecer ejemplo</Button>
      </div>
    </div>
  );
}
