import React, { useState, useEffect } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { CycleProvider } from './context/CycleContext';
import type { ActiveTab } from './types/crms';
import { checkAndRecordVersionSeen, STORAGE_HAS_SEEN_WELCOME_KEY } from './domain/versionTracker';

import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { TodayView } from './components/TodayView';
import { ChartRow } from './components/ChartRow';
import { CalendarGrid } from './components/CalendarGrid';
import { CycleStatsHeader } from './components/CycleStatsHeader';
import { ObservationDrawer } from './components/ObservationDrawer';
import { Footer } from './components/Footer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { StorageRecoveryNotice } from './components/StorageRecoveryNotice';

const CycleAnalyticsView = React.lazy(() =>
  import('./components/CycleAnalyticsView').then(m => ({ default: m.CycleAnalyticsView }))
);
const ExportModal = React.lazy(() =>
  import('./components/ExportModal').then(m => ({ default: m.ExportModal }))
);
const PrintExportView = React.lazy(() =>
  import('./components/PrintExportView').then(m => ({ default: m.PrintExportView }))
);
const VersionModal = React.lazy(() =>
  import('./components/VersionModal').then(m => ({ default: m.VersionModal }))
);
const WelcomeModal = React.lazy(() =>
  import('./components/WelcomeModal').then(m => ({ default: m.WelcomeModal }))
);

import { getExportFilename } from './utils/exportUtils';
import { readStorage } from './utils/storage';

const MainApp: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [printCycleIds, setPrintCycleIds] = useState<string[]>(['all']);
  // The PDF file name detail of a pending print, or null when nothing waits to print
  const [pendingPrintDetail, setPendingPrintDetail] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    checkAndRecordVersionSeen();
    if (!readStorage(STORAGE_HAS_SEEN_WELCOME_KEY)) {
      setIsWelcomeModalOpen(true);
    }
  }, []);

  // Print after the print view has rendered the selected cycles.
  // The browser uses the document title as the default PDF file name.
  useEffect(() => {
    if (pendingPrintDetail === null) return;
    const originalTitle = document.title;
    document.title = getExportFilename('pdf', pendingPrintDetail);
    window.print();
    setPendingPrintDetail(null);
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  }, [pendingPrintDetail]);

  const handlePreparePrint = (selectedCycleIds: string[], fileDetail: string) => {
    setPrintCycleIds(selectedCycleIds);
    setPendingPrintDetail(fileDetail);
    setToastMessage(t.exportModal.exportSuccess);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="app-layout">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenVersion={() => setIsVersionModalOpen(true)}
        onOpenWelcome={() => setIsWelcomeModalOpen(true)}
      />

      <main
        className={`main-content tab-${activeTab} ${activeTab === 'today' ? 'today-active' : ''}`}
      >
        <StorageRecoveryNotice />
        <CycleStatsHeader />

        {/* The key resets the alert of a failed page when the tab changes */}
        <ErrorBoundary key={activeTab}>
          <React.Suspense fallback={<div className="loading-spinner-fallback" aria-busy="true" />}>
            {activeTab === 'today' && <TodayView />}
            {activeTab === 'chart' && <ChartRow />}
            {activeTab === 'calendar' && <CalendarGrid />}
            {activeTab === 'analytics' && <CycleAnalyticsView />}
          </React.Suspense>
        </ErrorBoundary>

        <Footer
          onOpenVersion={() => setIsVersionModalOpen(true)}
          onOpenWelcome={() => setIsWelcomeModalOpen(true)}
        />
      </main>

      <ObservationDrawer />

      <ErrorBoundary>
        <React.Suspense fallback={null}>
          <ExportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            onPreparePrint={handlePreparePrint}
          />

          <VersionModal isOpen={isVersionModalOpen} onClose={() => setIsVersionModalOpen(false)} />

          <WelcomeModal isOpen={isWelcomeModalOpen} onClose={() => setIsWelcomeModalOpen(false)} />

          <PrintExportView selectedCycleIds={printCycleIds} />
        </React.Suspense>
      </ErrorBoundary>

      {toastMessage && (
        <div className="today-toast" role="status" aria-live="polite">
          <span>{toastMessage}</span>
        </div>
      )}

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
