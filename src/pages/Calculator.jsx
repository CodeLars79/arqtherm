import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext.jsx';
import { useAssembly } from '../hooks/useAssembly.js';
import { useSavedAssemblies } from '../hooks/useSavedAssemblies.js';
import AssemblyEditor from '../components/calculator/AssemblyEditor.jsx';
import ResultsPanel, { resultStatus } from '../components/calculator/ResultsPanel.jsx';
import CTEVerification from '../components/calculator/CTEVerification.jsx';
import CalculatorToolbar from '../components/calculator/CalculatorToolbar.jsx';
import SavedAssembliesDialog from '../components/calculator/SavedAssembliesDialog.jsx';
import PrintReport from '../components/calculator/PrintReport.jsx';
import ExportDialog from '../components/calculator/ExportDialog.jsx';
import CondensationPanel from '../components/calculator/CondensationPanel.jsx';
import InsulationSolver from '../components/calculator/InsulationSolver.jsx';
import TemplatesDialog from '../components/calculator/TemplatesDialog.jsx';
import ShareDialog from '../components/calculator/ShareDialog.jsx';
import { assemblyFromTemplate } from '../data/templates.js';
import { encodeAssembly, decodeAssembly, buildShareUrl, SHARE_PARAM } from '../utils/shareLink.js';
import { elementTypes } from '../data/index.js';
import { IS_HOSTED } from '../config.js';
import StatusMessage from '../components/ui/StatusMessage.jsx';
import { ConfirmDialog } from '../components/ui/Modal.jsx';
import { buildExport, exportFilename } from '../utils/exportAssembly.js';
import { saveFile } from '../utils/saveFile.js';
import { cteMetadata } from '../data/index.js';
import { formatNumber, formatU } from '../engine/index.js';

const SAVE_MESSAGES = {
  declined: { tone: 'warning', text: 'Descarga cancelada.' },
  unavailable: { tone: 'error', text: 'Esta vista no permite descargar archivos. Abra la página en claude.ai o use la aplicación local.' },
  error: { tone: 'error', text: 'No se pudo guardar el archivo. Inténtelo de nuevo.' }
};

export default function Calculator() {
  const { materialsById, storageError, addCustomMaterial } = useAppData();
  const { assembly, actions, calculation, compliance, orientative, condensation } = useAssembly(materialsById);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [incoming, setIncoming] = useState(null);
  const savedApi = useSavedAssemblies();

  const [flash, setFlash] = useState(null);

  // Zona climática enviada desde la página «Zonas climáticas».
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const incoming = location.state?.climateZone;
    if (!incoming) return;
    const zone = cteMetadata.climateZones.find((z) => z.id === incoming);
    if (zone) {
      actions.setClimateZone(zone.id);
      if (location.state.ineCode) actions.setSite({ ineCode: location.state.ineCode, altitudeM: location.state.altitudeM ?? null });
      setFlash({ tone: 'success', text: `Zona climática de invierno ${zone.label} aplicada${location.state.fullZone ? ` (zona ${location.state.fullZone}${location.state.place ? `, ${location.state.place}` : ''})` : ''}.` });
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Elemento compartido por enlace (?e=…): se pide confirmación antes de sustituir el actual.
  useEffect(() => {
    const code = new URLSearchParams(location.search).get(SHARE_PARAM);
    if (!code) return;
    const decoded = decodeAssembly(code, { elementTypeIds: elementTypes.map((e) => e.id), materialsById });
    navigate(location.pathname, { replace: true });
    if (!decoded.ok) {
      setFlash({ tone: 'error', title: 'No se pudo abrir el elemento compartido', text: decoded.error });
      return;
    }
    setIncoming(decoded);
  }, [location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  const acceptIncoming = () => {
    incoming.customMaterials.forEach(addCustomMaterial);
    actions.replace(incoming.assembly);
    setFlash({ tone: 'success', text: `Abierto el elemento compartido «${incoming.assembly.name}». Guárdelo para conservarlo en este navegador.` });
    setIncoming(null);
  };

  const pickTemplate = (template) => {
    actions.replace(assemblyFromTemplate(template, assembly));
    setTemplatesOpen(false);
    setFlash({ tone: 'success', text: `Plantilla «${template.name}» cargada. Ajuste materiales y espesores a su proyecto.` });
  };

  const openShare = () => {
    const code = encodeAssembly(assembly, materialsById);
    const siteUrl = import.meta.env.VITE_SITE_URL || (IS_HOSTED ? 'https://www.arqtherm.com' : '');
    setShareUrl(buildShareUrl(code, {
      siteUrl: IS_HOSTED ? siteUrl : '',
      useHash: import.meta.env.VITE_ROUTER === 'hash',
      origin: window.location.origin,
      pathname: window.location.pathname
    }));
  };
  const [confirm, setConfirm] = useState(null);
  const [savedOpen, setSavedOpen] = useState(false);
  const [exportText, setExportText] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    if (!flash || flash.tone === 'error') return undefined;
    const t = setTimeout(() => setFlash(null), 6000);
    return () => clearTimeout(t);
  }, [flash]);

  const requestRemoveLayer = useCallback((layer) => {
    if (!layer.materialId && layer.thicknessMm === null) {
      actions.removeLayer(layer.id);
      return;
    }
    setConfirm({
      title: 'Eliminar capa',
      description: `Se eliminará la capa «${materialsById[layer.materialId]?.name ?? 'sin material'}» del elemento.`,
      confirmLabel: 'Eliminar capa',
      onConfirm: () => actions.removeLayer(layer.id)
    });
  }, [actions, materialsById]);

  const editorActions = { ...actions, requestRemoveLayer };

  const handleSave = () => {
    savedApi.save(assembly);
    setFlash({ tone: 'success', text: `«${assembly.name}» guardado en este navegador.` });
  };

  const handleExportJson = async () => {
    const data = buildExport({ assembly, calculation, compliance, orientative, condensation, materialsById, metadata: cteMetadata });
    const json = JSON.stringify(data, null, 2);
    const result = await saveFile({ filename: exportFilename(assembly.name), blob: new Blob([json], { type: 'application/json' }) });
    if (result === 'saved') {
      setFlash({ tone: 'success', text: 'JSON exportado con resultados, fuentes, hipótesis y versión de los datos reglamentarios.' });
    } else if (result === 'unavailable') {
      setExportText(json); // sin descargas: se muestra para copiarlo
    } else {
      setFlash(SAVE_MESSAGES[result]);
    }
  };

  const handleExportPdf = async () => {
    setPdfBusy(true);
    try {
      const { buildReportPdf, reportFilename } = await import('../report/generatePdf.js');
      const doc = buildReportPdf({ assembly, calculation, compliance, orientative, condensation, materialsById, metadata: cteMetadata });
      const blob = doc.output('blob');
      const result = await saveFile({ filename: reportFilename(assembly.name), blob });
      setFlash(result === 'saved'
        ? { tone: 'success', text: `Informe PDF generado (${doc.getNumberOfPages()} páginas): resumen gráfico y detalle técnico.` }
        : SAVE_MESSAGES[result]);
    } catch {
      setFlash({ tone: 'error', text: 'No se pudo generar el informe PDF.' });
    } finally {
      setPdfBusy(false);
    }
  };

  const openSaved = (entry) => {
    actions.replace({ ...entry.assembly });
    setSavedOpen(false);
    setFlash({ tone: 'success', text: `Abierto «${entry.assembly.name}».` });
  };

  const status = resultStatus(calculation);

  return (
    <div className="calculator">
      <div className="page-head no-print">
        <div>
          <p className="eyebrow">Calculadora</p>
          <h1 className="page-title">Transmitancia térmica de elementos de capas</h1>
        </div>
        <CalculatorToolbar
          savedCount={savedApi.saved.length}
          onNew={() => setConfirm({
            title: 'Nuevo elemento',
            description: 'Se descartará el elemento actual si no lo ha guardado.',
            confirmLabel: 'Crear nuevo',
            onConfirm: actions.newAssembly
          })}
          onSave={handleSave}
          onTemplates={() => setTemplatesOpen(true)}
          onShare={openShare}
          onOpenSaved={() => setSavedOpen(true)}
          onExportPdf={handleExportPdf}
          pdfBusy={pdfBusy}
          onExportJson={handleExportJson}
          onPrint={IS_HOSTED ? null : () => window.print()}
          onReset={() => setConfirm({
            title: 'Restablecer el ejemplo',
            description: 'Se reemplazará el elemento actual por el ejemplo ilustrativo. Los cambios no guardados se perderán.',
            confirmLabel: 'Restablecer',
            onConfirm: actions.resetToExample
          })}
        />
      </div>

      <div className="no-print flash-area" aria-live="polite">
        {flash && (
          <StatusMessage tone={flash.tone} title={flash.title}>
            {flash.text && <p>{flash.text}</p>}
            {flash.list?.length > 0 && <ul className="issue-list">{flash.list.map((e) => <li key={e}>{e}</li>)}</ul>}
          </StatusMessage>
        )}
        {(storageError || savedApi.storageError) && (
          <StatusMessage tone="error">{storageError || savedApi.storageError}</StatusMessage>
        )}
      </div>

      <div className="workspace no-print">
        <AssemblyEditor assembly={assembly} calculation={calculation} materialsById={materialsById} actions={editorActions} />
        <div className="workspace__side" id="results">
          <ResultsPanel calculation={calculation} />
          <CTEVerification assembly={assembly} calculation={calculation} compliance={compliance} orientative={orientative} actions={actions} />
          <InsulationSolver assembly={assembly} calculation={calculation} compliance={compliance} orientative={orientative} materialsById={materialsById} actions={actions} />
          <CondensationPanel assembly={assembly} condensation={condensation} materialsById={materialsById} actions={actions} />
        </div>
      </div>

      <a className="u-sticky no-print" href="#results" aria-label="Ver resultados">
        <span className="u-sticky__label">U</span>
        <span className="u-sticky__value num">{calculation.status === 'complete' ? formatU(calculation.uValue) : '—'}</span>
        <span className="u-sticky__unit">W/(m²·K)</span>
        <span className="u-sticky__status">{status.label}</span>
      </a>

      <PrintReport assembly={assembly} calculation={calculation} compliance={compliance} orientative={orientative} materialsById={materialsById} />

      <SavedAssembliesDialog
        open={savedOpen}
        onClose={() => setSavedOpen(false)}
        saved={savedApi.saved}
        onOpen={openSaved}
        onRename={savedApi.rename}
        onDuplicate={savedApi.duplicate}
        onRemove={savedApi.remove}
      />

      <ExportDialog
        open={exportText !== null}
        onClose={() => setExportText(null)}
        json={exportText ?? ''}
        filename={exportFilename(assembly.name)}
      />

      <TemplatesDialog
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        onPick={pickTemplate}
        materialsById={materialsById}
        current={assembly}
      />

      <ShareDialog
        open={shareUrl !== null}
        onClose={() => setShareUrl(null)}
        url={shareUrl ?? ''}
        includesCustom={assembly.layers.some((l) => l.materialId?.startsWith('user-'))}
      />

      <ConfirmDialog
        open={Boolean(incoming)}
        title="Abrir elemento compartido"
        description={incoming ? `Se abrirá «${incoming.assembly.name}» (${incoming.assembly.layers.length} capas) en lugar del elemento actual. Guarde antes el actual si lo necesita.` : ''}
        confirmLabel="Abrir"
        onCancel={() => setIncoming(null)}
        onConfirm={acceptIncoming}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel}
        onCancel={() => setConfirm(null)}
        onConfirm={() => { confirm?.onConfirm(); setConfirm(null); }}
      />
    </div>
  );
}
