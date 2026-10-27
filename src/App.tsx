import React, { useState, useEffect, useRef } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { CycleProvider } from './context/CycleContext';
import type { ActiveTab } from './types/crms';
import { checkAndRecordVersionSeen } from './domain/appVersion';
import { STORAGE_HAS_SEEN_WELCOME_KEY } from './utils/storageKeys';
import { useToast } from './hooks/useToast';

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
import { StorageSaveWarning } from './components/StorageSaveWarning';
import { BackupReminder } from './components/BackupReminder';
import { UndoToast } from './components/UndoToast';
import { LoadingStatus } from './components/LoadingStatus';

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

/**
 * Calls `onReady` when it mounts. Put it next to a lazy component in one `React.Suspense`:
 * React mounts it only after the lazy chunk has loaded and rendered.
 */
const ChunkReady: React.FC<{ onReady: (ready: true) => void }> = ({ onReady }) => {
  useEffect(() => onReady(true), [onReady]);
  return null;
};

import { getExportFilename } from './utils/exportUtils';
import { readStorage } from './utils/storage';

const MainApp: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [printCycleIds, setPrintCycleIds] = useState<string[]>(['all']);
  // The print view is a lazy chunk: the app prints only after it has rendered
  const [isPrintViewReady, setIsPrintViewReady] = useState(false);
  // The PDF file name detail of a pending print, or null when nothing waits to print
  const [pendingPrintDetail, setPendingPrintDetail] = useState<string | null>(null);
  const [toastMessage, showToast] = useToast(3500);
  // The pending title restore of the last print, cancelled when the app unmounts
  const titleRestore = useRef<{ title: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  useEffect(() => () => clearTimeout(titleRestore.current?.timer), []);

  useEffect(() => {
    checkAndRecordVersionSeen();
    if (!readStorage(STORAGE_HAS_SEEN_WELCOME_KEY)) {
      setIsWelcomeModalOpen(true);
    }
  }, []);

  // Print after the print view has loaded and rendered the selected cycles.
  // The browser uses the document title as the default PDF file name.
  useEffect(() => {
    if (pendingPrintDetail === null || !isPrintViewReady) return;
    // A print within one second of the last one keeps the title from before both prints
    const originalTitle = titleRestore.current?.title ?? document.title;
    clearTimeout(titleRestore.current?.timer);
    document.title = getExportFilename('pdf', pendingPrintDetail);
    window.print();
    setPendingPrintDetail(null);
    const timer = setTimeout(() => {
      document.title = originalTitle;
      titleRestore.current = null;
    }, 1000);
    titleRestore.current = { title: originalTitle, timer };
  }, [pendingPrintDetail, isPrintViewReady]);

  const handlePreparePrint = (selectedCycleIds: string[], fileDetail: string) => {
    setPrintCycleIds(selectedCycleIds);
    setPendingPrintDetail(fileDetail);
    showToast(t.exportModal.exportSuccess);
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
        <StorageSaveWarning onOpenExport={() => setIsExportModalOpen(true)} />
        <StorageRecoveryNotice />
        <BackupReminder onOpenExport={() => setIsExportModalOpen(true)} />
        <CycleStatsHeader />

        {/* The key resets the alert of a failed page when the tab changes */}
        <ErrorBoundary key={activeTab}>
          <React.Suspense fallback={<LoadingStatus className="lazy-page-fallback" />}>
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

      {/* Each dialog renders only while it is open, so its chunk loads when it opens first */}
      <ErrorBoundary>
        {isExportModalOpen && (
          <React.Suspense fallback={<LoadingStatus className="sr-only" />}>
            <ExportModal
              onClose={() => setIsExportModalOpen(false)}
              onPreparePrint={handlePreparePrint}
            />
          </React.Suspense>
        )}

        {isVersionModalOpen && (
          <React.Suspense fallback={<LoadingStatus className="sr-only" />}>
            <VersionModal onClose={() => setIsVersionModalOpen(false)} />
          </React.Suspense>
        )}

        {isWelcomeModalOpen && (
          <React.Suspense fallback={<LoadingStatus className="sr-only" />}>
            <WelcomeModal onClose={() => setIsWelcomeModalOpen(false)} />
          </React.Suspense>
        )}
      </ErrorBoundary>

      {/* Always rendered, so the browser print command (Ctrl+P) also prints the report */}
      <ErrorBoundary>
        <React.Suspense fallback={null}>
          <PrintExportView selectedCycleIds={printCycleIds} />
          <ChunkReady onReady={setIsPrintViewReady} />
        </React.Suspense>
      </ErrorBoundary>

      {toastMessage && (
        <div className="today-toast" role="status" aria-live="polite">
          <span>{toastMessage}</span>
        </div>
      )}

      <UndoToast />

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
