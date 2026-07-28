import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useCycle } from '../context/CycleContext';
import { ActiveTab } from '../types/crms';
import { Sun, Moon, Globe, Plus, Download, Layout, Calendar as CalendarIcon, BarChart2, Layers } from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onOpenExport }) => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { setIsDrawerOpen, setSelectedObservation, cycles, selectedCycleId, setSelectedCycleId } = useCycle();

  const handleNewEntry = () => {
    setSelectedObservation(null);
    setIsDrawerOpen(true);
  };

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-logo">🌱</div>
        <div className="brand-text">
          <h1 className="brand-title">{t.appTitle}</h1>
          <span className="brand-subtitle">{t.subtitle}</span>
        </div>
      </div>

      <div className="header-tabs">
        <button
          className={`tab-btn ${activeTab === 'chart' ? 'active' : ''}`}
          onClick={() => setActiveTab('chart')}
        >
          <Layout size={18} />
          <span>{t.tabs.chart}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          <CalendarIcon size={18} />
          <span>{t.tabs.calendar}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart2 size={18} />
          <span>{t.tabs.analytics}</span>
        </button>
      </div>

      <div className="header-controls">
        {/* Cycle Switcher Dropdown */}
        {cycles.length > 0 && (
          <div className="cycle-selector-wrapper" title="Filter / View Cycle History">
            <Layers size={16} className="cycle-selector-icon" />
            <select
              className="cycle-select-dropdown"
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
          </div>
        )}

        <button className="btn btn-primary new-entry-btn" onClick={handleNewEntry}>
          <Plus size={18} />
          <span>{t.actions.newEntry}</span>
        </button>

        <button className="icon-button" onClick={onOpenExport} title={t.actions.exportPdf}>
          <Download size={18} />
        </button>

        <button
          className="lang-toggle-btn"
          onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}
          title="Switch Language / Changer de langue"
        >
          <Globe size={16} />
          <span>{language.toUpperCase()}</span>
        </button>

        <button className="icon-button" onClick={toggleTheme} title="Toggle Dark/Light Mode">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
};
