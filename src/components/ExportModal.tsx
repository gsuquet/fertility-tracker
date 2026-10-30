import type React from 'react';
import { useEffect, useState } from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { X, Printer, ImageDown } from 'lucide-react';
import { Modal } from './Modal';
import { useSheetDrag } from '../hooks/useSheetDrag';
import { formatMessage } from '../i18n';
import type { Observation } from '../types/crms';
import { getCycleEndDate } from '../domain/cycleBoundaryDetector';
import { formatDateDisplay, getTodayStr } from '../utils/dateUtils';
import { selectPrintCycles } from '../utils/printCycles';
import { downloadChartPng } from '../utils/chartImage';

interface ExportModalProps {
  onClose: () => void;
  /** Receives the cycles to print and a short label for the PDF file name. */
  onPreparePrint: (selectedCycleIds: string[], fileDetail: string) => void;
  /** Receives true after the PNG download, or false when the browser cannot make the image. */
  onImageDone: (downloaded: boolean) => void;
}

/** The short date of a cycle row, for example "Sep 30" */
const shortDate = (date: string, locale: string) =>
  formatDateDisplay(date, locale, { month: 'short', day: 'numeric' });

/**
 * Share chart: the choice of cycles, Download PNG and Print or PDF (RFC 0002). Backup, restore,
 * demo and delete are in Settings.
 */
export const ExportModal: React.FC<ExportModalProps> = ({
  onClose,
  onPreparePrint,
  onImageDone,
}) => {
  const { cycles, selectedCycleId } = useCycle();
  const { t } = useLanguage();
  // On a phone, a drag down closes the dialog as the close button does
  const { handlers: dragHandlers, bodyRef } = useSheetDrag<HTMLDivElement>(onClose, true);

  // The app mounts the dialog each time it opens, so each opening starts from the cycle of the
  // cycle picker, or from the newest cycle with All cycles
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  useEffect(() => {
    const picked = cycles.find(c => c.id === selectedCycleId) ?? cycles[0];
    setSelectedIds(picked ? [picked.id] : []);
  }, [cycles, selectedCycleId]);

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

  const handleDownloadPng = () => {
    const detail = fileDetail();
    onClose();
    void downloadChartPng(selectPrintCycles(cycles, ids, getTodayStr()), t, detail)
      .catch(() => false)
      .then(onImageDone);
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
        <fieldset className="share-cycles">
          <legend className="share-cycles-title">{t.exportModal.cycles}</legend>
          {cycles.length > 0 && (
            <ul className="share-cycle-list">
              {cycles.map((cycle, index) => {
                const checked = selectedIds.includes(cycle.id);
                // A cycle always has an observation: the first day
                const lengthDays = (cycle.observations.at(-1) as Observation).cycleDay;
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
          )}
        </fieldset>
        <p className="share-note">{t.exportModal.oldestToNewestNote}</p>
      </div>

      <div className="share-footer">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleDownloadPng}
          disabled={nothingSelected}
        >
          <ImageDown size={18} aria-hidden="true" />
          {t.exportModal.downloadPng}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handlePrint}
          disabled={nothingSelected}
        >
          <Printer size={18} aria-hidden="true" />
          {t.exportModal.printPdf}
        </button>
      </div>
    </Modal>
  );
};
