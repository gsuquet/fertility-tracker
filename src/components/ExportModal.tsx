import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import {
  X,
  Printer,
  Download,
  FileText,
  Calendar,
  Layers,
  CheckSquare,
  Square,
} from 'lucide-react';
import { getExportFilename } from '../utils/exportUtils';
import { parseObservationData } from '../domain/storageFormat';
import { summarizeObservations } from '../domain/backupImport';
import type { BackupSummary, ImportMode } from '../domain/backupImport';
import { ConfirmDialog } from './ConfirmDialog';
import { formatMessage } from '../i18n';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Receives the cycles to print and a short label for the PDF file name. */
  onPreparePrint: (selectedCycleIds: string[], fileDetail: string) => void;
}

/** A data action that waits for the user to confirm it. */
type PendingAction =
  | { kind: 'demo' }
  | { kind: 'clear' }
  | { kind: 'import'; text: string; summary: BackupSummary };

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onPreparePrint }) => {
  const {
    observations,
    cycles,
    selectedCycleId,
    exportDataJson,
    importDataJson,
    loadDemoData,
    clearAllData,
    markBackedUp,
  } = useCycle();
  const { t } = useLanguage();

  const [exportMode, setExportMode] = useState<'single' | 'multiple'>('single');
  const [selectedSingleId, setSelectedSingleId] = useState<string>('');
  const [selectedMultiIds, setSelectedMultiIds] = useState<string[]>([]);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [importError, setImportError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: isOpen resets the selection each time the modal opens
  useEffect(() => {
    const [newest] = cycles;
    if (newest) {
      const initialSingle = selectedCycleId === 'all' ? newest.id : selectedCycleId;
      setSelectedSingleId(initialSingle);
      setSelectedMultiIds(cycles.map(c => c.id));
    }
  }, [isOpen, cycles, selectedCycleId]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectAllMulti = () => {
    setSelectedMultiIds(cycles.map(c => c.id));
  };

  const handleDeselectAllMulti = () => {
    setSelectedMultiIds([]);
  };

  const toggleMultiCycle = (cycleId: string) => {
    setSelectedMultiIds(prev =>
      prev.includes(cycleId) ? prev.filter(id => id !== cycleId) : [...prev, cycleId]
    );
  };

  // Cycles are listed newest first, so Cycle 1 is the oldest
  const cycleLabel = (cycleId: string) => {
    const cycleIndex = cycles.findIndex(c => c.id === cycleId);
    return cycleIndex === -1 ? 'all-cycles' : `cycle-${cycles.length - cycleIndex}`;
  };

  const describeSelection = (ids: string[]) => {
    const [first, ...rest] = ids;
    if (first && rest.length === 0) return cycleLabel(first);
    return ids.length > 0 && ids.length < cycles.length ? 'selected-cycles' : 'all-cycles';
  };

  const handlePrint = () => {
    const idsToExport =
      exportMode === 'single'
        ? [selectedSingleId || 'all']
        : selectedMultiIds.length > 0
          ? selectedMultiIds
          : ['all'];
    onPreparePrint(idsToExport, describeSelection(idsToExport));
    onClose();
  };

  const handleDownloadJson = () => {
    const jsonStr = exportDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getExportFilename('backup');
    a.click();
    URL.revokeObjectURL(url);
    markBackedUp();
    onClose();
  };

  const hasData = observations.length > 0;

  // Without data there is nothing to lose, so the action runs at once.
  const runOrConfirm = (action: PendingAction) => {
    if (hasData) {
      setPending(action);
    } else {
      runAction(action);
    }
  };

  const runAction = (action: PendingAction, mode: ImportMode = 'replace') => {
    if (action.kind === 'demo') loadDemoData();
    if (action.kind === 'clear') clearAllData();
    if (action.kind === 'import') importDataJson(action.text, mode);
    setPending(null);
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    e.target.value = '';
    const imported = parseObservationData(text);
    setImportError(imported === null);
    if (imported) {
      runOrConfirm({ kind: 'import', text, summary: summarizeObservations(imported.observations) });
    }
  };

  const confirmContent = (action: PendingAction) => {
    const count = observations.length;
    const c = t.confirmDialog;
    if (action.kind === 'demo') {
      return {
        title: c.demoTitle,
        messages: [formatMessage(c.demoMessage, { count })],
        actions: [{ label: c.demoConfirm, onClick: () => runAction(action) }],
      };
    }
    if (action.kind === 'clear') {
      return {
        title: c.clearTitle,
        messages: [formatMessage(c.clearMessage, { count })],
        actions: [{ label: c.clearConfirm, onClick: () => runAction(action), danger: true }],
      };
    }
    const { summary } = action;
    const fileMessage =
      summary.count === 0
        ? c.importEmpty
        : formatMessage(c.importSummary, {
            count: summary.count,
            first: String(summary.firstDate),
            last: String(summary.lastDate),
          });
    return {
      title: c.importTitle,
      messages: [fileMessage, formatMessage(c.importChoice, { count })],
      actions: [
        { label: c.importMerge, onClick: () => runAction(action, 'merge') },
        { label: c.importReplace, onClick: () => runAction(action, 'replace'), danger: true },
      ],
    };
  };

  const confirmation = pending && confirmContent(pending);

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal-container export-modal-enhanced" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="modal-title">{t.exportModal.title}</h2>
          <button className="icon-button" onClick={onClose} aria-label={t.exportModal.close}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-description">{t.exportModal.description}</p>

          {/* PDF Scope Configurator Section */}
          <div className="pdf-config-section">
            <h3 className="section-subtitle">{t.exportModal.pdfExportMode}</h3>

            <div className="mode-segmented-control">
              <button
                type="button"
                className={`segmented-btn ${exportMode === 'single' ? 'active' : ''}`}
                onClick={() => setExportMode('single')}
              >
                <Calendar size={16} />
                <span>{t.exportModal.singleCycle}</span>
              </button>

              <button
                type="button"
                className={`segmented-btn ${exportMode === 'multiple' ? 'active' : ''}`}
                onClick={() => setExportMode('multiple')}
              >
                <Layers size={16} />
                <span>{t.exportModal.multipleCycles}</span>
              </button>
            </div>

            {exportMode === 'single' ? (
              <div className="single-cycle-select-wrapper">
                <label htmlFor="single-cycle-picker" className="form-label">
                  {t.exportModal.selectCycle}:
                </label>
                <select
                  id="single-cycle-picker"
                  className="form-select"
                  value={selectedSingleId}
                  onChange={e => setSelectedSingleId(e.target.value)}
                >
                  {cycles.map((cycle, idx) => {
                    const cycleNum = cycles.length - idx;
                    return (
                      <option key={cycle.id} value={cycle.id}>
                        {t.chartStrip.cycleBadge} {cycleNum} ({cycle.startDate} •{' '}
                        {cycle.observations.length} {t.stats.days})
                      </option>
                    );
                  })}
                </select>
              </div>
            ) : (
              <div className="multi-cycle-select-wrapper">
                <div className="multi-select-header">
                  <span className="form-label">{t.exportModal.selectCycles}:</span>
                  <div className="multi-select-actions">
                    <button
                      type="button"
                      className="btn-text-action"
                      onClick={handleSelectAllMulti}
                    >
                      {t.exportModal.selectAll}
                    </button>
                    <span className="action-divider">•</span>
                    <button
                      type="button"
                      className="btn-text-action"
                      onClick={handleDeselectAllMulti}
                    >
                      {t.exportModal.deselectAll}
                    </button>
                  </div>
                </div>

                <div className="multi-cycle-list">
                  {cycles.map((cycle, idx) => {
                    const cycleNum = cycles.length - idx;
                    const isChecked = selectedMultiIds.includes(cycle.id);
                    return (
                      <label
                        key={cycle.id}
                        className={`multi-cycle-item ${isChecked ? 'checked' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleMultiCycle(cycle.id)}
                          className="visually-hidden-checkbox"
                        />
                        {isChecked ? (
                          <CheckSquare size={18} className="checkbox-icon checked" />
                        ) : (
                          <Square size={18} className="checkbox-icon" />
                        )}
                        <span className="cycle-item-name">
                          <strong>
                            {t.chartStrip.cycleBadge} {cycleNum}
                          </strong>
                        </span>
                        <span className="cycle-item-dates">
                          {cycle.startDate} ({cycle.observations.length} {t.stats.days})
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pdf-info-note">{t.exportModal.oldestToNewestNote}</div>
          </div>

          <div className="export-actions-grid">
            <button
              className="export-card-btn primary-export-btn"
              onClick={handlePrint}
              aria-label={t.exportModal.printPdf}
            >
              <Printer size={24} className="export-icon" />
              <div className="export-text">
                <strong>{t.exportModal.printPdf}</strong>
                <span>{t.exportModal.pdfDescription}</span>
              </div>
            </button>

            <button
              className="export-card-btn"
              onClick={handleDownloadJson}
              aria-label={t.actions.exportJson}
            >
              <Download size={24} className="export-icon" />
              <div className="export-text">
                <strong>{t.actions.exportJson}</strong>
                <span>{t.exportModal.jsonDescription}</span>
              </div>
            </button>
          </div>

          <div className="modal-divider" />

          <div className="import-restore-section">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileText size={16} />
              <span>{t.actions.importJson}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              hidden
            />

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => runOrConfirm({ kind: 'demo' })}
            >
              {t.actions.loadDemo}
            </button>

            <button
              type="button"
              className="btn btn-danger"
              disabled={!hasData}
              onClick={() => setPending({ kind: 'clear' })}
            >
              {t.actions.clearData}
            </button>
          </div>

          {importError && (
            <p className="import-error" role="alert">
              {t.exportModal.importError}
            </p>
          )}
        </div>
      </div>

      {confirmation && (
        <ConfirmDialog
          title={confirmation.title}
          actions={confirmation.actions}
          onCancel={() => setPending(null)}
        >
          {confirmation.messages.map(message => (
            <p key={message}>{message}</p>
          ))}
        </ConfirmDialog>
      )}
    </div>
  );
};
