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
import { ObservationDrawer } from './components/ObservationDrawer';
import { Footer } from './components/Footer';

const CycleAnalyticsView = React.lazy(() => import('./components/CycleAnalyticsView').then(m => ({ default: m.CycleAnalyticsView })));
const ExportModal = React.lazy(() => import('./components/ExportModal').then(m => ({ default: m.ExportModal })));
const PrintExportView = React.lazy(() => import('./components/PrintExportView').then(m => ({ default: m.PrintExportView })));

const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [printCycleIds, setPrintCycleIds] = useState<string[]>(['all']);
  const [shouldPrint, setShouldPrint] = useState(false);

  React.useEffect(() => {
    if (shouldPrint) {
      window.print();
      setShouldPrint(false);
    }
  }, [shouldPrint, printCycleIds]);

  const handlePreparePrint = (selectedCycleIds: string[]) => {
    setPrintCycleIds(selectedCycleIds);
    setShouldPrint(true);
  };

  return (
    <div className="app-layout">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

      <main className={`main-content ${activeTab === 'today' ? 'today-active' : ''}`}>
        <CycleStatsHeader />

        <React.Suspense fallback={<div className="loading-spinner-fallback" aria-busy="true" />}>
          {activeTab === 'today' && <TodayView />}
          {activeTab === 'chart' && <ChartRow />}
          {activeTab === 'calendar' && <CalendarGrid />}
          {activeTab === 'analytics' && <CycleAnalyticsView />}
        </React.Suspense>

        <Footer />
      </main>

      <ObservationDrawer />

      <React.Suspense fallback={null}>
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onPreparePrint={handlePreparePrint}
        />

        <PrintExportView selectedCycleIds={printCycleIds} />
      </React.Suspense>

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
