import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useCycle } from '../context/CycleContext';
import { ActiveTab } from '../types/crms';
import { Layout, Calendar as CalendarIcon, BarChart2, Plus, CalendarDays } from 'lucide-react';

interface MobileNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  const { t } = useLanguage();
  const { setSelectedObservation, setIsDrawerOpen } = useCycle();

  const handleQuickAdd = () => {
    setSelectedObservation(null);
    setIsDrawerOpen(true);
  };

  return (
    <nav className="mobile-nav-bar" aria-label="Mobile Navigation">
      <button 
        className={`mobile-nav-item ${activeTab === 'today' ? 'active' : ''}`}
        onClick={() => {
          setSelectedObservation(null);
          setActiveTab('today');
        }}
        aria-label={t.mobileTabs.today}
      >
        <CalendarDays size={20} />
        <span>{t.mobileTabs.today}</span>
      </button>

      <button
        className={`mobile-nav-item ${activeTab === 'chart' ? 'active' : ''}`}
        onClick={() => setActiveTab('chart')}
        aria-label={t.mobileTabs.chart}
      >
        <Layout size={20} />
        <span>{t.mobileTabs.chart}</span>
      </button>

      <button
        type="button"
        className="mobile-nav-fab"
        onClick={handleQuickAdd}
        aria-label={t.mobileTabs.log || t.actions.newEntry}
        title={t.mobileTabs.log || t.actions.newEntry}
      >
        <Plus size={22} />
      </button>

      <button
        className={`mobile-nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
        onClick={() => setActiveTab('calendar')}
        aria-label={t.mobileTabs.calendar}
      >
        <CalendarIcon size={20} />
        <span>{t.mobileTabs.calendar}</span>
      </button>

      <button
        className={`mobile-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
        onClick={() => setActiveTab('analytics')}
        aria-label={t.mobileTabs.analytics}
      >
        <BarChart2 size={20} />
        <span>{t.mobileTabs.analytics}</span>
      </button>
    </nav>
  );
};
