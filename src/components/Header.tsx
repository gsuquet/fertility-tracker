import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useCycle } from '../context/CycleContext';
import { CyclePicker } from './CyclePicker';
import { ActiveTab } from '../types/crms';
import { 
  Sun, 
  Moon, 
  Globe, 
  Plus, 
  Download, 
  Layout, 
  Calendar as CalendarIcon, 
  BarChart2, 
  CalendarDays, 
  Info, 
  BookOpen, 
  MoreVertical, 
  X,
  Sparkles
} from 'lucide-react';
import { getAppVersion } from '../domain/versionTracker';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenExport: () => void;
  onOpenVersion?: () => void;
  onOpenWelcome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onOpenExport, onOpenVersion, onOpenWelcome }) => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { setSelectedObservation } = useCycle();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const handleNewEntry = () => {
    setSelectedObservation(null);
    setActiveTab('today');
  };

  // Close menu with Escape key
  useEffect(() => {
    if (!isMoreMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMoreMenuOpen]);

  const currentVersion = getAppVersion();

  return (
    <header className="app-header">
      <button 
        type="button" 
        className="header-brand-btn" 
        onClick={() => setActiveTab('today')} 
        title="Creighton FertilityCare System Home"
        aria-label="Creighton FertilityCare System Home"
      >
        <div className="brand-logo" aria-hidden="true">🌱</div>
        <div className="brand-text">
          <h1 className="brand-title">{t.appTitle}</h1>
          <span className="brand-subtitle">{t.subtitle}</span>
        </div>
      </button>

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
        <CyclePicker />

        {/* Desktop Direct New Entry */}
        <button 
          className="btn btn-primary new-entry-btn desktop-only-action" 
          onClick={handleNewEntry}
          aria-label={t.actions.newEntry}
        >
          <Plus size={18} />
          <span>{t.actions.newEntry}</span>
        </button>

        {/* Desktop Direct Actions */}
        <button 
          className="icon-button desktop-only-action" 
          onClick={onOpenExport} 
          title={t.actions.exportPdf}
          aria-label={t.actions.exportPdf}
        >
          <Download size={18} />
        </button>

        {onOpenWelcome && (
          <button
            className="icon-button desktop-only-action"
            onClick={onOpenWelcome}
            title={t.welcomeModal.title}
            aria-label={t.welcomeModal.title}
          >
            <BookOpen size={18} />
          </button>
        )}

        {onOpenVersion && (
          <button
            className="icon-button desktop-only-action"
            onClick={onOpenVersion}
            title={t.versionTracker.title}
            aria-label={t.versionTracker.title}
          >
            <Info size={18} />
          </button>
        )}

        <button
          className="lang-toggle-btn desktop-only-action"
          onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}
          title="Switch Language / Changer de langue"
          aria-label="Switch Language"
        >
          <Globe size={16} />
          <span>{language.toUpperCase()}</span>
        </button>

        <button 
          className="icon-button desktop-only-action" 
          onClick={toggleTheme} 
          title="Toggle Dark/Light Mode"
          aria-label="Toggle Dark/Light Mode"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Mobile More Actions Button */}
        <button
          type="button"
          className="icon-button mobile-more-btn"
          onClick={() => setIsMoreMenuOpen(true)}
          title="More actions / Plus d'actions"
          aria-label="More actions"
          aria-expanded={isMoreMenuOpen}
        >
          <MoreVertical size={18} />
        </button>
      </div>

      {/* Mobile Actions Bottom Sheet Modal via Portal */}
      {isMoreMenuOpen && typeof document !== 'undefined'
        ? ReactDOM.createPortal(
            <div 
              className="modal-overlay mobile-menu-overlay" 
              onClick={() => setIsMoreMenuOpen(false)}
              role="dialog"
              aria-modal="true"
              aria-label="Mobile Navigation Menu"
            >
              <div 
                className="mobile-action-sheet" 
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mobile-action-sheet-header">
                  <div className="sheet-header-title">
                    <Sparkles size={16} className="sheet-icon" />
                    <span>{language === 'fr' ? 'Menu & Options' : 'Menu & Options'}</span>
                  </div>
                  <button 
                    type="button" 
                    className="icon-button sheet-close-btn"
                    onClick={() => setIsMoreMenuOpen(false)}
                    aria-label="Close menu"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="mobile-action-sheet-body">
                  {/* Export Option */}
                  <button 
                    type="button"
                    className="sheet-action-item" 
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onOpenExport();
                    }}
                  >
                    <div className="sheet-action-icon export-icon-bg">
                      <Download size={18} />
                    </div>
                    <div className="sheet-action-content">
                      <strong>{t.actions.exportPdf}</strong>
                      <span>{language === 'fr' ? 'Imprimer ou exporter en PDF / JSON' : 'Print or export PDF / JSON charts'}</span>
                    </div>
                  </button>

                  {/* Welcome & Guide Option */}
                  {onOpenWelcome && (
                    <button 
                      type="button"
                      className="sheet-action-item" 
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onOpenWelcome();
                      }}
                    >
                      <div className="sheet-action-icon guide-icon-bg">
                        <BookOpen size={18} />
                      </div>
                      <div className="sheet-action-content">
                        <strong>{t.welcomeModal.title}</strong>
                        <span>{language === 'fr' ? 'Tutoriel et guide des biomarqueurs' : 'Interactive guide & biomarker chart tutorial'}</span>
                      </div>
                    </button>
                  )}

                  {/* Version & About Option */}
                  {onOpenVersion && (
                    <button 
                      type="button"
                      className="sheet-action-item" 
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onOpenVersion();
                      }}
                    >
                      <div className="sheet-action-icon info-icon-bg">
                        <Info size={18} />
                      </div>
                      <div className="sheet-action-content">
                        <div className="sheet-action-title-row">
                          <strong>{t.versionTracker.title}</strong>
                          <span className="sheet-version-badge">v{currentVersion}</span>
                        </div>
                        <span>{language === 'fr' ? 'Notes de version & stockage local' : 'Release notes & system storage diagnostics'}</span>
                      </div>
                    </button>
                  )}

                  <div className="sheet-divider" />

                  {/* Language & Theme Controls Row */}
                  <div className="sheet-quick-toggles">
                    <button
                      type="button"
                      className="sheet-toggle-btn"
                      onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}
                    >
                      <Globe size={16} />
                      <span>{language === 'fr' ? 'Langue : Français' : 'Language : English'}</span>
                    </button>

                    <button
                      type="button"
                      className="sheet-toggle-btn"
                      onClick={toggleTheme}
                    >
                      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                      <span>{theme === 'dark' ? (language === 'fr' ? 'Thème : Sombre' : 'Theme : Dark') : (language === 'fr' ? 'Thème : Clair' : 'Theme : Light')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </header>
  );
};
