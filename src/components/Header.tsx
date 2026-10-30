import type React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useCycle } from '../context/CycleContext';
import { CyclePicker } from './CyclePicker';
import { PHONE_QUERY } from './shell/TopBar';
import { useMediaQuery, WIDE_QUERY } from '../hooks/useMediaQuery';
import { BrandMark } from './icons/BrandMark';
import type { ActiveTab } from '../types/crms';
import {
  Plus,
  Layout,
  Calendar as CalendarIcon,
  BarChart2,
  CalendarDays,
  Settings,
} from 'lucide-react';
import { useShortcutHint } from '../hooks/useKeyboardShortcuts';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenSettings: () => void;
  /** Receives the element of the top bar that holds the page controls */
  onTopBarSlot?: ((slot: HTMLDivElement | null) => void) | undefined;
}

const TABS = [
  { tab: 'today', icon: CalendarDays },
  { tab: 'chart', icon: Layout },
  { tab: 'calendar', icon: CalendarIcon },
  { tab: 'analytics', icon: BarChart2 },
] as const;

/**
 * The top bar (RFC 0002). Phone: the page controls, the cycle picker and the gear. From 1360 px:
 * one row with the wordmark, the tabs, the cycle picker, the page controls, **Log** and the gear.
 * On a narrower screen, the page controls are on a second row.
 */
export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
  onTopBarSlot,
}) => {
  const { t } = useLanguage();
  const { setSelectedObservation } = useCycle();
  const hint = useShortcutHint();
  const isPhone = useMediaQuery(PHONE_QUERY);
  const isWide = useMediaQuery(WIDE_QUERY);
  // The cycle picker comes before the page controls, except on the phone Today and the phone
  // pages with a title. The DOM order is the visual order, so the focus order is the reading order.
  const pickerFirst = !isPhone || activeTab === 'chart';
  // On a second row, the page controls come last
  const slotLast = !isPhone && !isWide;

  // Today opens on today, not on a day that the chart opened before
  const handleNewEntry = () => {
    setSelectedObservation(null);
    setActiveTab('today');
  };

  const openTab = (tab: ActiveTab) => (tab === 'today' ? handleNewEntry() : setActiveTab(tab));

  // The page controls: the date of Today, the chart controls or the phone page title
  const slot = <div className="header-page-slot" ref={onTopBarSlot} />;

  const controls = (
    <div className="header-controls">
      {!pickerFirst && <CyclePicker />}

      {/* **Log**, as the + button of the phone. The tooltip has the full name and the key N. */}
      <button
        type="button"
        className="btn btn-primary new-entry-btn desktop-only-action"
        onClick={handleNewEntry}
        {...hint(t.actions.newEntry, 'newEntry')}
      >
        <Plus size={18} aria-hidden="true" />
        <span>{t.mobileTabs.log}</span>
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
  );

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
        </div>
      </button>

      {/* The visible label is the short name. The accessible name is the full name, which contains
          the short name in English and in French (label in name). */}
      <div className="header-tabs" role="tablist" aria-label={t.menu.mainNavLabel}>
        {TABS.map(({ tab, icon: Icon }) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`${tab}-panel`}
            id={`tab-${tab}`}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => openTab(tab)}
            {...hint(t.tabs[tab], tab)}
            aria-label={t.tabs[tab]}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{t.mobileTabs[tab]}</span>
          </button>
        ))}
      </div>

      {pickerFirst && <CyclePicker />}

      {/* The slot keeps its place in the DOM at each width, so the page controls keep the focus
          and the open menu when the window crosses 1360 px. On two rows, Log and the gear come
          before it, as on the screen. */}
      {slotLast && controls}

      {slot}

      {!slotLast && controls}
    </header>
  );
};
