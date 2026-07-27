import React, { useState, useEffect } from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { X, Printer, Download, FileText, Calendar, Layers, CheckSquare, Square } from 'lucide-react';
import { getTodayStr } from '../utils/dateUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPreparePrint?: (selectedCycleIds: string[]) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onPreparePrint }) => {
  const { cycles, selectedCycleId, exportDataJson, importDataJson, loadDemoData, clearAllData } = useCycle();
  const { t } = useLanguage();

  const [exportMode, setExportMode] = useState<'single' | 'multiple'>('single');
  const [selectedSingleId, setSelectedSingleId] = useState<string>('');
  const [selectedMultiIds, setSelectedMultiIds] = useState<string[]>([]);

  useEffect(() => {
    if (cycles.length > 0) {
      const initialSingle = (selectedCycleId && selectedCycleId !== 'all')
        ? selectedCycleId
        : cycles[0].id;
      setSelectedSingleId(initialSingle);
      setSelectedMultiIds(cycles.map(c => c.id));
    }
  }, [isOpen, cycles, selectedCycleId]);

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

  const handlePrint = () => {
    let idsToExport: string[] = [];
    if (exportMode === 'single') {
      idsToExport = selectedSingleId ? [selectedSingleId] : (cycles[0] ? [cycles[0].id] : ['all']);
    } else {
      idsToExport = selectedMultiIds.length > 0 ? selectedMultiIds : ['all'];
    }

    if (onPreparePrint) {
      onPreparePrint(idsToExport);
    } else {
      window.print();
    }
  };

  const handleDownloadJson = () => {
    const jsonStr = exportDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Creighton_FertilityCare_Chart_${getTodayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          const success = importDataJson(content);
          if (success) {
            alert('Chart data restored successfully!');
            onClose();
          } else {
            alert('Failed to import JSON file. Please check file format.');
          }
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-container export-modal-enhanced" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="modal-title">{t.exportModal.title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close export dialog">
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
                        {t.chartStrip.cycleBadge} {cycleNum} ({cycle.startDate} • {cycle.observations.length} {t.stats.days})
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
                    <button type="button" className="btn-text-action" onClick={handleDeselectAllMulti}>
                      {t.exportModal.deselectAll}
                    </button>
                  </div>
                </div>

                <div className="multi-cycle-list">
                  {cycles.map((cycle, idx) => {
                    const cycleNum = cycles.length - idx;
                    const isChecked = selectedMultiIds.includes(cycle.id);
                    return (
                      <label key={cycle.id} className={`multi-cycle-item ${isChecked ? 'checked' : ''}`}>
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
                          <strong>{t.chartStrip.cycleBadge} {cycleNum}</strong>
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

            <div className="pdf-info-note">
              {t.exportModal.oldestToNewestNote}
            </div>
          </div>

          <div className="export-actions-grid">
            <button className="export-card-btn primary-export-btn" onClick={handlePrint} aria-label={t.exportModal.printPdf}>
              <Printer size={24} className="export-icon" />
              <div className="export-text">
                <strong>{t.exportModal.printPdf}</strong>
                <span>Generates vector-crisp landscape PDF (35-day grid).</span>
              </div>
            </button>

            <button className="export-card-btn" onClick={handleDownloadJson} aria-label={t.actions.exportJson}>
              <Download size={24} className="export-icon" />
              <div className="export-text">
                <strong>{t.actions.exportJson}</strong>
                <span>Download full encrypted chart data JSON file.</span>
              </div>
            </button>
          </div>

          <div className="modal-divider" />

          <div className="import-restore-section">
            <label className="btn btn-secondary import-label" style={{ cursor: 'pointer' }}>
              <FileText size={16} />
              <span>{t.actions.importJson}</span>
              <input type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>

            <button
              className="btn btn-secondary"
              onClick={() => {
                loadDemoData();
                onClose();
              }}
            >
              {t.actions.loadDemo}
            </button>

            <button
              className="btn btn-danger"
              onClick={() => {
                if (confirm('Are you sure you want to clear all chart data?')) {
                  clearAllData();
                  onClose();
                }
              }}
            >
              {t.actions.clearData}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

