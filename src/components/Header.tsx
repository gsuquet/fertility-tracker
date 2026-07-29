import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useCycle } from '../context/CycleContext';
import { ActiveTab } from '../types/crms';
import { Sun, Moon, Globe, Plus, Download, Layout, Calendar as CalendarIcon, BarChart2, Layers, CalendarDays } from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onOpenExport }) => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { setSelectedObservation, cycles, selectedCycleId, setSelectedCycleId } = useCycle();

  const handleNewEntry = () => {
    setSelectedObservation(null);
    setActiveTab('today');
  };

  return (
    <header className="app-header">
      <div className="header-brand" onClick={() => setActiveTab('today')} title="Creighton FertilityCare System Home">
        <div className="brand-logo" aria-hidden="true">🌱</div>
        <div className="brand-text">
          <h1 className="brand-title">{t.appTitle}</h1>
          <span className="brand-subtitle">{t.subtitle}</span>
        </div>
      </div>

      <nav className="header-tabs" role="tablist" aria-label="Main Navigation Views">
        <button
          role="tab"
          aria-selected={activeTab === 'today'}
          aria-controls="today-panel"
          id="tab-today"
          className={`tab-btn ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          <CalendarDays size={18} />
          <span>{t.tabs.today}</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'chart'}
          aria-controls="chart-panel"
          id="tab-chart"
          className={`tab-btn ${activeTab === 'chart' ? 'active' : ''}`}
          onClick={() => setActiveTab('chart')}
        >
          <Layout size={18} />
          <span>{t.tabs.chart}</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'calendar'}
          aria-controls="calendar-panel"
          id="tab-calendar"
          className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          <CalendarIcon size={18} />
          <span>{t.tabs.calendar}</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'analytics'}
          aria-controls="analytics-panel"
          id="tab-analytics"
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart2 size={18} />
          <span>{t.tabs.analytics}</span>
        </button>
      </nav>

      <div className="header-controls">
        {/* Cycle Switcher Dropdown */}
        {cycles.length > 0 && (
          <div className="cycle-selector-wrapper" title="Filter / View Cycle History">
            <Layers size={16} className="cycle-selector-icon" aria-hidden="true" />
            <select
              aria-label="Filter cycle view"
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

        <button 
          className="btn btn-primary new-entry-btn" 
          onClick={handleNewEntry}
          aria-label={t.actions.newEntry}
        >
          <Plus size={18} />
          <span>{t.actions.newEntry}</span>
        </button>

        <button 
          className="icon-button" 
          onClick={onOpenExport} 
          title={t.actions.exportPdf}
          aria-label={t.actions.exportPdf}
        >
          <Download size={18} />
        </button>

        <button
          className="lang-toggle-btn"
          onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}
          title="Switch Language / Changer de langue"
          aria-label="Switch Language"
        >
          <Globe size={16} />
          <span>{language.toUpperCase()}</span>
        </button>

        <button 
          className="icon-button" 
          onClick={toggleTheme} 
          title="Toggle Dark/Light Mode"
          aria-label="Toggle Dark/Light Mode"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
};
