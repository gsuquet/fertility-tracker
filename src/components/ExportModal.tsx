import type React from 'react';
import { useState } from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { X, Printer, ImageDown, FileDown } from 'lucide-react';
import { Modal } from './Modal';
import { useSheetDrag } from '../hooks/useSheetDrag';
import { formatMessage } from '../i18n';
import { getCycleEndDate } from '../domain/cycleBoundaryDetector';
import { getTodayStr } from '../utils/dateUtils';
import { cycleLength, selectPrintCycles, shortDate } from '../utils/printCycles';
import type { ChartFileFormat, ChartFileResult } from '../utils/chartImage';
import { saveChartFile } from '../utils/chartImage';

interface ExportModalProps {
  onClose: () => void;
  /** Receives the cycles to print and a short label for the PDF file name. */
  onPreparePrint: (selectedCycleIds: string[], fileDetail: string) => void;
  /** Receives what became of the PNG or the PDF file, or `failed` when the browser cannot make it. */
  onFileDone: (format: ChartFileFormat, result: ChartFileResult) => void;
}

/**
 * Share chart: the choice of cycles, Download PNG, Download PDF and Print (RFC 0002). Backup,
 * restore, demo and delete are in Settings.
 */
export const ExportModal: React.FC<ExportModalProps> = ({
  onClose,
  onPreparePrint,
  onFileDone,
}) => {
  const { cycles, selectedCycleId } = useCycle();
  const { t } = useLanguage();
  // On a phone, a drag down closes the dialog as the close button does
  const { handlers: dragHandlers, bodyRef } = useSheetDrag<HTMLDivElement>(onClose, true);

  // The app mounts the dialog each time it opens, so each opening starts from the cycle of the
  // cycle picker, or from the newest cycle with All cycles
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const picked = cycles.find(c => c.id === selectedCycleId) ?? cycles[0];
    return picked ? [picked.id] : [];
  });

  const toggle = (cycleId: string) =>
    setSelectedIds(prev =>
      prev.includes(cycleId) ? prev.filter(id => id !== cycleId) : [...prev, cycleId]
    );

  // Cycles are listed newest first, so Cycle 1 is the oldest
  const cycleNumber = (index: number) => cycles.length - index;

  // Without cycles, the two actions export one empty cycle that starts today
  const ids = cycles.length === 0 ? ['all'] : selectedIds;
  const fileDetail = () => {
    const [first] = ids;
    if (ids.length === 1 && first !== 'all') {
      return `cycle-${cycleNumber(cycles.findIndex(c => c.id === first))}`;
    }
    return ids.length < cycles.length ? 'selected-cycles' : 'all-cycles';
  };

  const handlePrint = () => {
    onPreparePrint(ids, fileDetail());
    onClose();
  };

  // The file is made in the click, before the dialog closes: iOS opens its share sheet only
  // from a click
  const handleDownload = (format: ChartFileFormat) => {
    const printCycles = selectPrintCycles(cycles, ids, getTodayStr());
    const saved = saveChartFile(printCycles, t, fileDetail(), format).catch(
      (): ChartFileResult => 'failed'
    );
    onClose();
    void saved.then(result => onFileDone(format, result));
  };

  const nothingSelected = ids.length === 0;

  return (
    <Modal
      labelledBy="share-title"
      onClose={onClose}
      className="modal-overlay"
      panelClassName="modal-container export-modal-enhanced share-dialog"
    >
      <div className="sheet-handle" aria-hidden="true" {...dragHandlers} />
      <div className="modal-header" {...dragHandlers}>
        <h2 id="share-title">{t.exportModal.title}</h2>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label={t.exportModal.close}
        >
          <X size={20} />
        </button>
      </div>

      <div className="modal-body share-body" ref={bodyRef}>
        {cycles.length > 0 && (
          <fieldset className="share-cycles">
            <legend className="share-cycles-title">{t.exportModal.cycles}</legend>
            <ul className="share-cycle-list">
              {cycles.map((cycle, index) => {
                const checked = selectedIds.includes(cycle.id);
                const lengthDays = cycleLength(cycle);
                // The name is the cycle number. The tag and the dates are the description.
                const id = `share-cycle-${cycle.id}`;
                return (
                  <li key={cycle.id}>
                    <label className={`share-cycle ${checked ? 'is-checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(cycle.id)}
                        aria-labelledby={`${id}-name`}
                        aria-describedby={index === 0 ? `${id}-tag ${id}-dates` : `${id}-dates`}
                      />
                      <span className="share-cycle-text">
                        <span className="share-cycle-name">
                          <span id={`${id}-name`}>
                            {t.chartStrip.cycleBadge} {cycleNumber(index)}
                          </span>
                          {index === 0 && (
                            <span className="share-cycle-tag" id={`${id}-tag`}>
                              {t.cyclePicker.current}
                            </span>
                          )}
                        </span>
                        <span className="share-cycle-dates" id={`${id}-dates`}>
                          {shortDate(cycle.startDate, t.locale)} –{' '}
                          {shortDate(getCycleEndDate(cycle), t.locale)} ·{' '}
                          {formatMessage(t.chartStrip.cycleDays, { count: lengthDays })}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        )}
        <p className="share-note">{t.exportModal.oldestToNewestNote}</p>
      </div>

      <div className="modal-footer share-footer">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handlePrint}
          disabled={nothingSelected}
        >
          <Printer size={18} aria-hidden="true" />
          {t.exportModal.print}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => handleDownload('png')}
          disabled={nothingSelected}
        >
          <ImageDown size={18} aria-hidden="true" />
          {t.exportModal.downloadPng}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => handleDownload('pdf')}
          disabled={nothingSelected}
        >
          <FileDown size={18} aria-hidden="true" />
          {t.exportModal.downloadPdf}
        </button>
      </div>
    </Modal>
  );
};
