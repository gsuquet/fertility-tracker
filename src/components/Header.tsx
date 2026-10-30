import type React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useCycle } from '../context/CycleContext';
import { CyclePicker } from './CyclePicker';
import { PHONE_QUERY } from './shell/TopBar';
import { useMediaQuery } from '../hooks/useMediaQuery';
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
  Smartphone,
  Settings,
} from 'lucide-react';
import { useShortcutHint } from '../hooks/useKeyboardShortcuts';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenExport: () => void;
  onOpenVersion: () => void;
  onOpenWelcome: () => void;
  onOpenSettings: () => void;
  /** Installs the app. Not given when the app is installed or the browser cannot install it. */
  onInstall?: (() => void) | undefined;
  /** Receives the element of the top bar that holds the page controls on a phone */
  onTopBarSlot?: ((slot: HTMLDivElement | null) => void) | undefined;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenExport,
  onOpenVersion,
  onOpenWelcome,
  onOpenSettings,
  onInstall,
  onTopBarSlot,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { setSelectedObservation } = useCycle();
  const hint = useShortcutHint();
  const pickerFirst = useMediaQuery(PHONE_QUERY) && activeTab === 'chart';

  // Today opens on today, not on a day that the chart opened before
  const handleNewEntry = () => {
    setSelectedObservation(null);
    setActiveTab('today');
  };

  return (
    <header className={`app-header page-${activeTab}`}>
      <button
        type="button"
        className="header-brand-btn"
        onClick={handleNewEntry}
        title={t.menu.homeLabel}
        aria-label={t.menu.homeLabel}
      >
        <div className="brand-logo" aria-hidden="true">
          <BrandMark />
        </div>
        <div className="brand-text">
          {/* Each page has its own h1 */}
          <span className="brand-title">{t.appTitle}</span>
          <span className="brand-subtitle">{t.subtitle}</span>
        </div>
      </button>

      {/* On the phone Chart, the cycle picker comes first, in the DOM too, so the focus order and
          the reading order are the visual order */}
      {pickerFirst && <CyclePicker />}

      {/* Phone: the date of Today, the chart controls or the page title */}
      <div className="header-page-slot" ref={onTopBarSlot} />

      <div className="header-tabs" role="tablist" aria-label={t.menu.mainNavLabel}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'today'}
          aria-controls="today-panel"
          id="tab-today"
          className={`tab-btn ${activeTab === 'today' ? 'active' : ''}`}
          onClick={handleNewEntry}
          {...hint(t.tabs.today, 'today')}
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
          {...hint(t.tabs.chart, 'chart')}
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
          {...hint(t.tabs.calendar, 'calendar')}
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
          {...hint(t.tabs.analytics, 'analytics')}
        >
          <BarChart2 size={18} />
          <span>{t.tabs.analytics}</span>
        </button>
      </div>

      <div className="header-controls">
        {/* Cycle Switcher Dropdown */}
        {!pickerFirst && <CyclePicker />}

        {/* Desktop Direct New Entry */}
        <button
          type="button"
          className="btn btn-primary new-entry-btn desktop-only-action"
          onClick={handleNewEntry}
          aria-label={t.actions.newEntry}
          {...hint(t.actions.newEntry, 'newEntry')}
        >
          <Plus size={18} />
          <span>{t.actions.newEntry}</span>
        </button>

        {/* Desktop Direct Actions */}
        {onInstall && (
          <button
            type="button"
            className="icon-button desktop-only-action header-install-btn"
            onClick={onInstall}
            aria-label={t.install.headerLabel}
            title={t.install.headerLabel}
          >
            <Smartphone size={18} />
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

        {/* Settings: the gear of the top bar, on each screen width (RFC 0002) */}
        <button
          type="button"
          className="icon-button settings-btn"
          onClick={onOpenSettings}
          title={t.settings.open}
          aria-label={t.settings.open}
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
};
