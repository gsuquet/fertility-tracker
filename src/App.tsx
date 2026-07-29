import React, { useState } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { CycleProvider } from './context/CycleContext';
import { ActiveTab } from './types/crms';

import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { TodayView } from './components/TodayView';
import { ChartRow } from './components/ChartRow';
import { CalendarGrid } from './components/CalendarGrid';
import { CycleStatsHeader } from './components/CycleStatsHeader';
import { CycleAnalyticsView } from './components/CycleAnalyticsView';
import { ObservationDrawer } from './components/ObservationDrawer';
import { ExportModal } from './components/ExportModal';

const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  return (
    <div className="app-layout">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

      <main className={`main-content ${activeTab === 'today' ? 'today-active' : ''}`}>
        <CycleStatsHeader />

        {activeTab === 'today' && <TodayView />}
        {activeTab === 'chart' && <ChartRow />}
        {activeTab === 'calendar' && <CalendarGrid />}
        {activeTab === 'analytics' && <CycleAnalyticsView />}
      </main>

      <ObservationDrawer />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <CycleProvider>
          <MainApp />
        </CycleProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
