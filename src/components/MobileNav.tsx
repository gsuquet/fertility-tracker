import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useCycle } from '../context/CycleContext';
import { ActiveTab } from '../types/crms';
import { Layout, Calendar as CalendarIcon, BarChart2, Plus } from 'lucide-react';

interface MobileNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  const { t } = useLanguage();
  const { setIsDrawerOpen, setSelectedObservation } = useCycle();

  const handleNewEntry = () => {
    setSelectedObservation(null);
    setIsDrawerOpen(true);
  };

  return (
    <nav className="mobile-nav-bar">
      <button
        className={`mobile-nav-item ${activeTab === 'chart' ? 'active' : ''}`}
        onClick={() => setActiveTab('chart')}
      >
        <Layout size={20} />
        <span>{t.tabs.chart}</span>
      </button>

      <button
        className={`mobile-nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
        onClick={() => setActiveTab('calendar')}
      >
        <CalendarIcon size={20} />
        <span>{t.tabs.calendar}</span>
      </button>

      <button className="mobile-nav-item mobile-nav-add-btn" onClick={handleNewEntry} title={t.actions.newEntry}>
        <div className="mobile-add-icon">
          <Plus size={20} />
        </div>
        <span>{t.actions.newEntry}</span>
      </button>

      <button
        className={`mobile-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
        onClick={() => setActiveTab('analytics')}
      >
        <BarChart2 size={20} />
        <span>{t.tabs.analytics}</span>
      </button>
    </nav>
  );
};
