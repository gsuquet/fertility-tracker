import type React from 'react';
import { useState, useEffect } from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { X, Printer, Calendar, Layers, CheckSquare, Square } from 'lucide-react';
import { Modal } from './Modal';
import { useSheetDrag } from '../hooks/useSheetDrag';

interface ExportModalProps {
  onClose: () => void;
  /** Receives the cycles to print and a short label for the PDF file name. */
  onPreparePrint: (selectedCycleIds: string[], fileDetail: string) => void;
}

/** The print of the chart. Backup, restore, demo and delete are in Settings (RFC 0002). */
export const ExportModal: React.FC<ExportModalProps> = ({ onClose, onPreparePrint }) => {
  const { cycles, selectedCycleId } = useCycle();
  const { t } = useLanguage();
  // On a phone, a drag down closes the dialog as the close button does
  const { handlers: dragHandlers, bodyRef } = useSheetDrag<HTMLDivElement>(onClose, true);

  const [exportMode, setExportMode] = useState<'single' | 'multiple'>('single');
  const [selectedSingleId, setSelectedSingleId] = useState<string>('');
  const [selectedMultiIds, setSelectedMultiIds] = useState<string[]>([]);

  // The app mounts the dialog each time it opens, so each opening starts from this selection
  useEffect(() => {
    const [newest] = cycles;
    if (newest) {
      const initialSingle = selectedCycleId === 'all' ? newest.id : selectedCycleId;
      setSelectedSingleId(initialSingle);
      setSelectedMultiIds(cycles.map(c => c.id));
    }
  }, [cycles, selectedCycleId]);

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

  return (
    <Modal
      labelledBy="modal-title"
      onClose={onClose}
      className="modal-overlay"
      panelClassName="modal-container export-modal-enhanced"
    >
      <div className="sheet-handle" aria-hidden="true" {...dragHandlers} />
      <div className="modal-header" {...dragHandlers}>
        <h2 id="modal-title">{t.exportModal.title}</h2>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label={t.exportModal.close}
        >
          <X size={20} />
        </button>
      </div>

      <div className="modal-body" ref={bodyRef}>
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
                  <button type="button" className="btn-text-action" onClick={handleSelectAllMulti}>
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
            type="button"
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
        </div>
      </div>
    </Modal>
  );
};
