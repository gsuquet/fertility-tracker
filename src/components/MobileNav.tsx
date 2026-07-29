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
  const { setSelectedObservation } = useCycle();

  const handleNewEntry = () => {
    setSelectedObservation(null);
    setActiveTab('today');
  };

  return (
    <nav className="mobile-nav-bar" aria-label="Mobile Navigation">
      <button 
        className={`mobile-nav-item ${activeTab === 'today' ? 'active' : ''}`}
        onClick={() => {
          setSelectedObservation(null);
          setActiveTab('today');
        }}
        aria-label={t.tabs.today}
      >
        <CalendarDays size={20} />
        <span>{t.tabs.today}</span>
      </button>

      <button
        className={`mobile-nav-item ${activeTab === 'chart' ? 'active' : ''}`}
        onClick={() => setActiveTab('chart')}
        aria-label={t.tabs.chart}
      >
        <Layout size={20} />
        <span>{t.tabs.chart}</span>
      </button>

      <button
        className={`mobile-nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
        onClick={() => setActiveTab('calendar')}
        aria-label={t.tabs.calendar}
      >
        <CalendarIcon size={20} />
        <span>{t.tabs.calendar}</span>
      </button>

      <button
        className={`mobile-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
        onClick={() => setActiveTab('analytics')}
        aria-label={t.tabs.analytics}
      >
        <BarChart2 size={20} />
        <span>{t.tabs.analytics}</span>
      </button>
    </nav>
  );
};
