import type React from 'react';
import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useCycle } from '../context/CycleContext';
import { CyclePicker } from './CyclePicker';
import { BrandMark } from './icons/BrandMark';
import type { ActiveTab } from '../types/crms';
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
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { getAppVersion } from '../domain/appVersion';
import { Modal } from './Modal';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenExport: () => void;
  onOpenVersion: () => void;
  onOpenWelcome: () => void;
  /** Installs the app. Not given when the app is installed or the browser cannot install it. */
  onInstall?: (() => void) | undefined;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenExport,
  onOpenVersion,
  onOpenWelcome,
  onInstall,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { setSelectedObservation } = useCycle();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const handleNewEntry = () => {
    setSelectedObservation(null);
    setActiveTab('today');
  };

  const currentVersion = getAppVersion();

  return (
    <header className="app-header">
      <button
        type="button"
        className="header-brand-btn"
        onClick={() => setActiveTab('today')}
        title={t.menu.homeLabel}
        aria-label={t.menu.homeLabel}
      >
        <div className="brand-logo" aria-hidden="true">
          <BrandMark />
        </div>
        <div className="brand-text">
          <h1 className="brand-title">{t.appTitle}</h1>
          <span className="brand-subtitle">{t.subtitle}</span>
        </div>
      </button>

      <div className="header-tabs" role="tablist" aria-label={t.menu.mainNavLabel}>
        <button
          type="button"
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
          type="button"
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
          type="button"
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
          type="button"
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
      </div>

      <div className="header-controls">
        {/* Cycle Switcher Dropdown */}
        <CyclePicker />

        {/* Desktop Direct New Entry */}
        <button
          type="button"
          className="btn btn-primary new-entry-btn desktop-only-action"
          onClick={handleNewEntry}
          aria-label={t.actions.newEntry}
        >
          <Plus size={18} />
          <span>{t.actions.newEntry}</span>
        </button>

        {/* Desktop Direct Actions */}
        {onInstall && (
          <button
            type="button"
            className="btn btn-secondary install-btn desktop-only-action"
            onClick={onInstall}
            aria-label={t.install.headerLabel}
            title={t.install.headerLabel}
          >
            <Smartphone size={18} />
            <span>{t.install.headerButton}</span>
          </button>
        )}

        <button
          type="button"
          className="icon-button desktop-only-action"
          onClick={onOpenExport}
          title={t.actions.exportPdf}
          aria-label={t.actions.exportPdf}
        >
          <Download size={18} />
        </button>

        <button
          type="button"
          className="icon-button desktop-only-action"
          onClick={onOpenWelcome}
          title={t.welcomeModal.title}
          aria-label={t.welcomeModal.title}
        >
          <BookOpen size={18} />
        </button>

        <button
          type="button"
          className="icon-button desktop-only-action"
          onClick={onOpenVersion}
          title={t.versionTracker.title}
          aria-label={t.versionTracker.title}
        >
          <Info size={18} />
        </button>

        <button
          type="button"
          className="lang-toggle-btn desktop-only-action"
          onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}
          title={t.menu.languageTitle}
          aria-label={t.menu.languageLabel}
        >
          <Globe size={16} />
          <span>{language.toUpperCase()}</span>
        </button>

        <button
          type="button"
          className="icon-button desktop-only-action"
          onClick={toggleTheme}
          title={t.menu.themeToggleLabel}
          aria-label={t.menu.themeToggleLabel}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Mobile More Actions Button */}
        <button
          type="button"
          className="icon-button mobile-more-btn"
          onClick={() => setIsMoreMenuOpen(true)}
          title={t.menu.moreActionsTitle}
          aria-label={t.menu.moreActionsLabel}
          aria-expanded={isMoreMenuOpen}
        >
          <MoreVertical size={18} />
        </button>
      </div>

      {/* Mobile Actions Bottom Sheet: the Modal primitive renders it in a portal */}
      {isMoreMenuOpen && (
        <Modal
          label={t.menu.mobileMenuLabel}
          onClose={() => setIsMoreMenuOpen(false)}
          className="modal-overlay mobile-menu-overlay"
          panelClassName="mobile-action-sheet"
        >
          <div className="mobile-action-sheet-header">
            <div className="sheet-header-title">
              <Sparkles size={16} className="sheet-icon" />
              <span>{t.menu.title}</span>
            </div>
            <button
              type="button"
              className="icon-button sheet-close-btn"
              onClick={() => setIsMoreMenuOpen(false)}
              aria-label={t.menu.closeMenu}
            >
              <X size={18} />
            </button>
          </div>

          <div className="mobile-action-sheet-body">
            {onInstall && (
              <button
                type="button"
                className="sheet-action-item"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onInstall();
                }}
              >
                <div className="sheet-action-icon install-icon-bg">
                  <Smartphone size={18} />
                </div>
                <div className="sheet-action-content">
                  <strong>{t.install.menuEntry}</strong>
                  <span>{t.install.menuHint}</span>
                </div>
              </button>
            )}

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
                <span>{t.menu.exportHint}</span>
              </div>
            </button>

            {/* Welcome & Guide Option */}
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
                <span>{t.menu.guideHint}</span>
              </div>
            </button>

            {/* Version & About Option */}
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
                <span>{t.menu.versionHint}</span>
              </div>
            </button>

            <div className="sheet-divider" />

            {/* Language & Theme Controls Row */}
            <div className="sheet-quick-toggles">
              <button
                type="button"
                className="sheet-toggle-btn"
                onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}
              >
                <Globe size={16} />
                <span>{t.menu.languageToggle}</span>
              </button>

              <button type="button" className="sheet-toggle-btn" onClick={toggleTheme}>
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                <span>{theme === 'dark' ? t.menu.themeDark : t.menu.themeLight}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </header>
  );
};
