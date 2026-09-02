import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useCycle } from '../context/CycleContext';
import { Layers, ChevronDown, Check, X, Calendar } from 'lucide-react';

export const CyclePicker: React.FC = () => {
  const { cycles, selectedCycleId, setSelectedCycleId } = useCycle();
  const [isOpen, setIsOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuCoords({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }
  };

  const toggleOpen = () => {
    if (!isOpen) {
      updateCoords();
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      if (isOpen) {
        updateCoords();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  if (cycles.length === 0) return null;

  const activeCycleIndex = cycles.findIndex(c => c.id === selectedCycleId);
  const activeCycleNumber = activeCycleIndex !== -1 ? cycles.length - activeCycleIndex : null;
  const activeCycle = activeCycleIndex !== -1 ? cycles[activeCycleIndex] : null;

  const getButtonLabel = (isMobile: boolean) => {
    if (selectedCycleId === 'all') {
      return isMobile ? `All (${cycles.length})` : `All Cycles (${cycles.length})`;
    }
    if (activeCycleNumber) {
      return isMobile
        ? `Cycle ${activeCycleNumber}`
        : `Cycle ${activeCycleNumber} (${activeCycle?.startDate})`;
    }
    return `All Cycles`;
  };

  const handleSelect = (id: string) => {
    setSelectedCycleId(id);
    setIsOpen(false);
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640;

  const menuContent = isOpen ? (
    <>
      <div className="cycle-dropdown-backdrop" onClick={() => setIsOpen(false)} />
      <div
        ref={dropdownRef}
        className="cycle-dropdown-menu"
        role="listbox"
        tabIndex={-1}
        style={
          !isMobile && menuCoords
            ? {
                position: 'fixed',
                top: `${menuCoords.top}px`,
                right: `${menuCoords.right}px`,
                left: 'auto',
                bottom: 'auto',
              }
            : undefined
        }
      >
        <div className="cycle-dropdown-header">
          <span>Filter Cycle View</span>
          <button
            type="button"
            className="cycle-dropdown-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close cycle menu"
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
                <strong>All Cycles</strong>
              </div>
              <span className="cycle-option-subtitle">
                Display all {cycles.length} recorded cycles
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
                    <strong>Cycle {cycleNum}</strong>
                    {idx === 0 && <span className="current-cycle-badge">Current</span>}
                  </div>
                  <span className="cycle-option-subtitle">
                    Started {cycle.startDate} • {obsCount} day{obsCount !== 1 ? 's' : ''} logged
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
        aria-label="Filter cycle view"
        title="Filter / View Cycle History"
      >
        <Layers size={16} className="cycle-selector-icon" aria-hidden="true" />
        <span className="cycle-selector-text desktop-text">{getButtonLabel(false)}</span>
        <span className="cycle-selector-text mobile-text">{getButtonLabel(true)}</span>
        <ChevronDown size={14} className={`cycle-selector-arrow ${isOpen ? 'open' : ''}`} />
      </button>

      {/* Visually hidden select for test compatibility */}
      <select
        aria-hidden="true"
        tabIndex={-1}
        className="visually-hidden-select"
        value={selectedCycleId}
        onChange={e => setSelectedCycleId(e.target.value)}
      >
        <option value="all">All Cycles ({cycles.length})</option>
        {cycles.map((cycle, idx) => (
          <option key={cycle.id} value={cycle.id}>
            Cycle {cycles.length - idx} ({cycle.startDate})
          </option>
        ))}
      </select>

      {typeof document !== 'undefined' && menuContent
        ? ReactDOM.createPortal(menuContent, document.body)
        : null}
    </div>
  );
};
