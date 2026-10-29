import type React from 'react';
import { useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Modal } from '../Modal';
import { Check, Copy, Keyboard, MoreVertical, Trash2 } from 'lucide-react';

interface ObservationActionsMenuProps {
  /** The code of the day before, or null when that day has no observation. */
  yesterdayCode: string | null;
  onCopyYesterday: () => void;
  directOnly: boolean;
  onToggleDirectOnly: () => void;
  /** Deletes the saved observation. Leave it out for a day without one. */
  onDelete?: (() => void) | undefined;
}

/**
 * The ⋮ menu of an observation: Copy yesterday, Direct Code Only and, last and in red,
 * Delete observation. The menu opens under its button. Escape, Back and a click outside close it.
 */
export const ObservationActionsMenu: React.FC<ObservationActionsMenuProps> = ({
  yesterdayCode,
  onCopyYesterday,
  directOnly,
  onToggleDirectOnly,
  onDelete,
}) => {
  const { t } = useLanguage();
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const open = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  };
  const close = () => setCoords(null);
  const run = (action: () => void) => () => {
    close();
    action();
  };

  /** The arrow keys move between the items, as in a native menu. Tab closes the menu. */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      close();
      return;
    }
    const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const items = Array.from(
      (menuRef.current as HTMLDivElement).querySelectorAll<HTMLElement>(
        '[role^="menuitem"]:not(:disabled)'
      )
    );
    const index = items.indexOf(document.activeElement as HTMLElement);
    (items[(index + step + items.length) % items.length] as HTMLElement).focus();
  };

  return (
    <>
      <button
        type="button"
        className="icon-button obs-actions-btn"
        aria-label={t.observationForm.actionsLabel}
        aria-haspopup="menu"
        aria-expanded={coords !== null}
        onClick={open}
      >
        <MoreVertical size={20} />
      </button>
      {coords && (
        <Modal
          label={t.observationForm.actionsLabel}
          onClose={close}
          className="obs-menu-backdrop"
          panelClassName="obs-menu"
          panelStyle={{ position: 'fixed', top: `${coords.top}px`, right: `${coords.right}px` }}
        >
          <div
            ref={menuRef}
            role="menu"
            aria-label={t.observationForm.actionsLabel}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
          >
            <button
              type="button"
              role="menuitem"
              className="obs-menu-item"
              disabled={yesterdayCode === null}
              onClick={run(onCopyYesterday)}
            >
              <Copy size={18} />
              <span>{t.observationForm.copyYesterday}</span>
              {yesterdayCode && <span className="obs-menu-hint">{yesterdayCode}</span>}
            </button>
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={directOnly}
              className="obs-menu-item"
              onClick={run(onToggleDirectOnly)}
            >
              <Keyboard size={18} />
              <span>{t.todayView.modeDirect}</span>
              {directOnly && <Check size={18} className="obs-menu-check" />}
            </button>
            {onDelete && (
              <>
                <hr />
                <button
                  type="button"
                  role="menuitem"
                  className="obs-menu-item danger"
                  onClick={run(onDelete)}
                >
                  <Trash2 size={18} />
                  <span>{t.observationForm.deleteObservation}</span>
                </button>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
};
