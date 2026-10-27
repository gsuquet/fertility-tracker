import type React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { formatMessage } from '../i18n';
import { Layers, ChevronDown, Check, X, Calendar } from 'lucide-react';

export const CyclePicker: React.FC = () => {
  const { cycles, selectedCycleId, setSelectedCycleId } = useCycle();
  const { t } = useLanguage();
  // The menu is open while it has a position
  const [menuCoords, setMenuCoords] = useState<{ top: number; right: number } | null>(null);
  const isOpen = menuCoords !== null;
  const buttonRef = useRef<HTMLButtonElement>(null);

  const updateCoords = useCallback((button: HTMLElement) => {
    const rect = button.getBoundingClientRect();
    setMenuCoords({
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    });
  }, []);

  const close = () => setMenuCoords(null);

  const toggleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isOpen) {
      close();
    } else {
      updateCoords(event.currentTarget);
    }
  };

  // While the menu is open, a full-screen backdrop catches clicks outside it
  useEffect(() => {
    const button = buttonRef.current;
    if (!isOpen || !button) return;

    const handleScrollOrResize = () => updateCoords(button);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuCoords(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updateCoords]);

  if (cycles.length === 0) return null;

  // An unknown id shows as 'all' until the provider resets it
  const activeCycleIndex = cycles.findIndex(c => c.id === selectedCycleId);
  const activeCycle = cycles[activeCycleIndex];

  const getButtonLabel = (isMobile: boolean) => {
    if (!activeCycle) {
      return formatMessage(isMobile ? t.cyclePicker.allShort : t.cyclePicker.allCyclesCount, {
        count: cycles.length,
      });
    }
    const activeCycleNumber = cycles.length - activeCycleIndex;
    return formatMessage(isMobile ? t.common.cycleNumber : t.cyclePicker.cycleWithDate, {
      number: activeCycleNumber,
      date: activeCycle.startDate,
    });
  };

  const handleSelect = (id: string) => {
    setSelectedCycleId(id);
    close();
  };

  const isMobile = window.innerWidth <= 640;

  const menuContent = menuCoords ? (
    <>
      <div className="cycle-dropdown-backdrop" onClick={close} />
      <div
        className="cycle-dropdown-menu"
        role="listbox"
        tabIndex={-1}
        style={
          isMobile
            ? undefined
            : {
                position: 'fixed',
                top: `${menuCoords.top}px`,
                right: `${menuCoords.right}px`,
                left: 'auto',
                bottom: 'auto',
              }
        }
      >
        <div className="cycle-dropdown-header">
          <span>{t.cyclePicker.menuTitle}</span>
          <button
            type="button"
            className="cycle-dropdown-close"
            onClick={close}
            aria-label={t.cyclePicker.closeMenu}
          >
            <X size={16} />
          </button>
        </div>
        <div className="cycle-dropdown-list">
          <button
            type="button"
            role="option"
            aria-selected={selectedCycleId === 'all'}
            className={`cycle-option-item ${selectedCycleId === 'all' ? 'selected' : ''}`}
            onClick={() => handleSelect('all')}
          >
            <div className="cycle-option-info">
              <div className="cycle-option-title">
                <Layers size={16} className="cycle-item-icon" />
                <strong>{t.cyclePicker.allCycles}</strong>
              </div>
              <span className="cycle-option-subtitle">
                {formatMessage(t.cyclePicker.displayAll, { count: cycles.length })}
              </span>
            </div>
            {selectedCycleId === 'all' && <Check size={18} className="cycle-check-icon" />}
          </button>

          {cycles.map((cycle, idx) => {
            const cycleNum = cycles.length - idx;
            const isSelected = selectedCycleId === cycle.id;
            const obsCount = cycle.observations.length;
            return (
              <button
                key={cycle.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`cycle-option-item ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelect(cycle.id)}
              >
                <div className="cycle-option-info">
                  <div className="cycle-option-title">
                    <Calendar size={16} className="cycle-item-icon" />
                    <strong>{formatMessage(t.common.cycleNumber, { number: cycleNum })}</strong>
                    {idx === 0 && (
                      <span className="current-cycle-badge">{t.cyclePicker.current}</span>
                    )}
                  </div>
                  <span className="cycle-option-subtitle">
                    {formatMessage(
                      obsCount !== 1 ? t.cyclePicker.startedDays : t.cyclePicker.startedOneDay,
                      { date: cycle.startDate, count: obsCount }
                    )}
                  </span>
                </div>
                {isSelected && <Check size={18} className="cycle-check-icon" />}
              </button>
            );
          })}
        </div>
      </div>
    </>
  ) : null;

  return (
    <div className="cycle-picker-container">
      <button
        ref={buttonRef}
        type="button"
        className={`cycle-selector-btn ${isOpen ? 'active' : ''}`}
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t.cyclePicker.buttonLabel}
        title={t.cyclePicker.buttonTitle}
      >
        <Layers size={16} className="cycle-selector-icon" aria-hidden="true" />
        <span className="cycle-selector-text desktop-text">{getButtonLabel(false)}</span>
        <span className="cycle-selector-text mobile-text">{getButtonLabel(true)}</span>
        <ChevronDown size={14} className={`cycle-selector-arrow ${isOpen ? 'open' : ''}`} />
      </button>

      {menuContent && ReactDOM.createPortal(menuContent, document.body)}
    </div>
  );
};
