import React from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { X, Printer, Download, FileText } from 'lucide-react';
import { getTodayStr } from '../utils/dateUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { exportDataJson, importDataJson, loadDemoData, clearAllData } = useCycle();
  const { t } = useLanguage();

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
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
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="modal-title">{t.exportModal.title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close export dialog">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-description">{t.exportModal.description}</p>

          <div className="export-actions-grid">
            <button className="export-card-btn" onClick={handlePrint} aria-label={t.exportModal.printPdf}>
              <Printer size={24} className="export-icon" />
              <div className="export-text">
                <strong>{t.exportModal.printPdf}</strong>
                <span>Generates vector-crisp PDF for printing or practitioner review.</span>
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
