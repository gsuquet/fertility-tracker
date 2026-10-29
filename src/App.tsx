import React, { useState, useEffect, useRef } from 'react';
import { parseTabHash, useHistoryTab } from './hooks/useHistoryLayer';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { CycleProvider, useCycleData, useCycleUi } from './context/CycleContext';
import { isInstalled, isIos, promptInstall, useInstallMode } from './pwa/installPrompt';
import { useAppBadge } from './pwa/appBadge';
import { checkAndRecordVersionSeen } from './domain/appVersion';
import { STORAGE_HAS_SEEN_WELCOME_KEY } from './utils/storageKeys';
import { useToast } from './hooks/useToast';
import type { ActiveTab } from './types/crms';
import { useShortcut } from './hooks/useKeyboardShortcuts';

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
import { InstallBanner } from './components/InstallBanner';
import { UpdatePrompt } from './components/UpdatePrompt';

const loadCycleAnalyticsView = () => import('./components/CycleAnalyticsView');
const loadExportModal = () => import('./components/ExportModal');
const loadVersionModal = () => import('./components/VersionModal');
const loadWelcomeModal = () => import('./components/WelcomeModal');
const loadInstallGuideModal = () => import('./components/InstallGuideModal');
const loadKeyboardShortcutsModal = () => import('./components/KeyboardShortcutsModal');

const CycleAnalyticsView = React.lazy(() =>
  loadCycleAnalyticsView().then(m => ({ default: m.CycleAnalyticsView }))
);
const ExportModal = React.lazy(() => loadExportModal().then(m => ({ default: m.ExportModal })));
const PrintExportView = React.lazy(() =>
  import('./components/PrintExportView').then(m => ({ default: m.PrintExportView }))
);
const VersionModal = React.lazy(() => loadVersionModal().then(m => ({ default: m.VersionModal })));
const WelcomeModal = React.lazy(() => loadWelcomeModal().then(m => ({ default: m.WelcomeModal })));
const InstallGuideModal = React.lazy(() =>
  loadInstallGuideModal().then(m => ({ default: m.InstallGuideModal }))
);
const KeyboardShortcutsModal = React.lazy(() =>
  loadKeyboardShortcutsModal().then(m => ({ default: m.KeyboardShortcutsModal }))
);

/**
 * The lazy chunks that the app imports when the browser is idle after the first render.
 * After that, a tab that stays open during a new deploy does not need the old chunks again.
 */
const PRELOADED_CHUNKS = [
  loadCycleAnalyticsView,
  loadExportModal,
  loadVersionModal,
  loadWelcomeModal,
  loadKeyboardShortcutsModal,
];

/**
 * Calls `onReady` when it mounts. Put it next to a lazy component in one `React.Suspense`:
 * React mounts it only after the lazy chunk has loaded and rendered.
 */
const ChunkReady: React.FC<{ onReady: (state: 'ready') => void }> = ({ onReady }) => {
  useEffect(() => onReady('ready'), [onReady]);
  return null;
};

/**
 * True after the analytics page has rendered one time. Before that, its lazy component shows the
 * loading status first, so a slide to it would show the loading status.
 */
let analyticsShown = false;
const markAnalyticsShown = () => {
  analyticsShown = true;
};
const canAnimateTo = (tab: ActiveTab) => tab !== 'analytics' || analyticsShown;

import { getExportFilename } from './utils/exportUtils';
import { readStorage } from './utils/storage';
import { whenIdle } from './utils/whenIdle';
import type { LaunchShortcut } from './utils/launchShortcut';
import { clearLaunchShortcut, listenForLaunches, readLaunchShortcut } from './utils/launchShortcut';

const MainApp: React.FC = () => {
  const { t } = useLanguage();
  const { setSelectedObservation, isDrawerOpen, setIsDrawerOpen } = useCycleUi();
  // The launch-queue listener is set once, so it reads the drawer state through a ref
  const drawerOpenRef = useRef(isDrawerOpen);
  drawerOpenRef.current = isDrawerOpen;
  // A shortcut of the app icon chooses the first page. Reading it does not change the address.
  const [launchShortcut] = useState(readLaunchShortcut);
  // Else the hash of the address chooses it, so that a reload keeps the page
  const [activeTab, setActiveTab] = useHistoryTab(
    launchShortcut === 'chart' ? 'chart' : parseTabHash(window.location.hash),
    canAnimateTo
  );
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  // Restore a backup of the welcome guide opens the export dialog on its restore button
  const [exportStartsWithRestore, setExportStartsWithRestore] = useState(false);
  // A backup file that the user opened with the app. Each file is a new object, so the export
  // dialog restores it also when it has the same text as the last one.
  const [launchedBackup, setLaunchedBackup] = useState<{ text: string } | null>(null);
  const { observations } = useCycleData();
  const installMode = useInstallMode();
  // The dot on the app icon while today has no observation, when the user turned it on
  useAppBadge(observations);
  const [printCycleIds, setPrintCycleIds] = useState<string[]>(['all']);
  // The print view is a lazy chunk: the app prints only after it has rendered
  const [printView, setPrintView] = useState<'loading' | 'ready' | 'failed'>('loading');
  // The PDF file name detail of a pending print, or null when nothing waits to print
  const [pendingPrintDetail, setPendingPrintDetail] = useState<string | null>(null);
  const [toastMessage, showToast] = useToast(3500);
  // The pending title restore of the last print, cancelled when the app unmounts
  const titleRestore = useRef<{ title: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  useEffect(() => () => clearTimeout(titleRestore.current?.timer), []);

  // A failed preload has no effect: the part tries again when the user opens it
  useEffect(
    () =>
      whenIdle(() => {
        void Promise.allSettled(PRELOADED_CHUNKS.map(load => load()));
      }),
    []
  );

  // Log today opens the drawer for a new observation, as the + button does. At the first visit,
  // the welcome guide comes first, so the drawer does not open under it. A drawer that is already
  // open keeps its observation and its draft.
  useEffect(() => {
    const openShortcut = (shortcut: LaunchShortcut) => {
      if (shortcut === 'log' && drawerOpenRef.current) return;
      setActiveTab(shortcut === 'chart' ? 'chart' : 'today');
      if (shortcut !== 'log' || !readStorage(STORAGE_HAS_SEEN_WELCOME_KEY)) return;
      setSelectedObservation(null);
      setIsDrawerOpen(true);
    };
    // A backup file opens the export dialog, which restores it as Restore Data does
    const openBackupFile = (text: string) => {
      setLaunchedBackup({ text });
      setIsExportModalOpen(true);
    };
    clearLaunchShortcut();
    if (launchShortcut) openShortcut(launchShortcut);
    listenForLaunches(openShortcut, openBackupFile);
  }, [launchShortcut, setSelectedObservation, setIsDrawerOpen, setActiveTab]);

  useEffect(() => {
    checkAndRecordVersionSeen();
    if (!readStorage(STORAGE_HAS_SEEN_WELCOME_KEY)) {
      setIsWelcomeModalOpen(true);
    }
  }, []);

  // Print after the print view has loaded and rendered the selected cycles.
  // The browser uses the document title as the default PDF file name.
  useEffect(() => {
    if (pendingPrintDetail === null || printView === 'loading') return;
    setPendingPrintDetail(null);
    if (printView === 'failed') {
      showToast(t.exportModal.printError);
      return;
    }
    // A print within one second of the last one keeps the title from before both prints
    const originalTitle = titleRestore.current?.title ?? document.title;
    clearTimeout(titleRestore.current?.timer);
    document.title = getExportFilename('pdf', pendingPrintDetail);
    window.print();
    const timer = setTimeout(() => {
      document.title = originalTitle;
      titleRestore.current = null;
    }, 1000);
    titleRestore.current = { title: originalTitle, timer };
  }, [pendingPrintDetail, printView, showToast, t]);

  // The dialog and its error boundary close the same way
  const closeExportModal = () => {
    setIsExportModalOpen(false);
    setExportStartsWithRestore(false);
    setLaunchedBackup(null);
  };
  const closeVersionModal = () => setIsVersionModalOpen(false);
  const closeWelcomeModal = () => setIsWelcomeModalOpen(false);
  const closeInstallGuide = () => setIsInstallGuideOpen(false);
  const closeShortcuts = () => setIsShortcutsOpen(false);
  const openShortcuts = () => setIsShortcutsOpen(true);

  // The keyboard shortcuts of all the pages. TodayView adds those of the days.
  useShortcut('today', () => setActiveTab('today'));
  useShortcut('chart', () => setActiveTab('chart'));
  useShortcut('calendar', () => setActiveTab('calendar'));
  useShortcut('analytics', () => setActiveTab('analytics'));
  useShortcut('help', openShortcuts);
  // As the Log Observation button of the header
  useShortcut('newEntry', () => {
    setSelectedObservation(null);
    setActiveTab('today');
  });

  // Chromium shows its own prompt. iOS has none, so the guide gives the steps.
  const handleInstall =
    installMode === 'prompt'
      ? () => void promptInstall()
      : installMode === 'ios'
        ? () => setIsInstallGuideOpen(true)
        : undefined;

  // The installed app of iOS does not share the storage of Safari: offer the restore of a backup
  const handleRestore =
    observations.length === 0 && isIos() && isInstalled()
      ? () => {
          setExportStartsWithRestore(true);
          setIsExportModalOpen(true);
        }
      : undefined;

  const handlePreparePrint = (selectedCycleIds: string[], fileDetail: string) => {
    setPrintCycleIds(selectedCycleIds);
    setPendingPrintDetail(fileDetail);
    if (printView !== 'failed') showToast(t.exportModal.exportSuccess);
  };

  return (
    <div className="app-layout">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenVersion={() => setIsVersionModalOpen(true)}
        onOpenWelcome={() => setIsWelcomeModalOpen(true)}
        onOpenShortcuts={openShortcuts}
        onInstall={handleInstall}
      />

      <main
        className={`main-content tab-${activeTab} ${activeTab === 'today' ? 'today-active' : ''}`}
      >
        <StorageSaveWarning onOpenExport={() => setIsExportModalOpen(true)} />
        <StorageRecoveryNotice />
        <BackupReminder onOpenExport={() => setIsExportModalOpen(true)} />
        <CycleStatsHeader />

        {/* The page slides on a page change, see docs/reference/application-behavior.md */}
        <div className="page-view">
          {/* The key resets the alert of a failed page when the tab changes */}
          <ErrorBoundary key={activeTab}>
            <React.Suspense fallback={<LoadingStatus className="lazy-page-fallback" />}>
              {activeTab === 'today' && <TodayView />}
              {activeTab === 'chart' && <ChartRow />}
              {activeTab === 'calendar' && <CalendarGrid />}
              {activeTab === 'analytics' && (
                <>
                  <CycleAnalyticsView />
                  <ChunkReady onReady={markAnalyticsShown} />
                </>
              )}
            </React.Suspense>
          </ErrorBoundary>
        </div>

        <Footer
          onOpenVersion={() => setIsVersionModalOpen(true)}
          onOpenWelcome={() => setIsWelcomeModalOpen(true)}
          onOpenShortcuts={openShortcuts}
          onInstall={handleInstall}
        />
      </main>

      <ObservationDrawer />

      {/* Each dialog renders only while it is open, so its chunk loads when it opens first.
          Its own boundary shows a failure as a dialog, and closing the dialog removes it. */}
      {isExportModalOpen && (
        <ErrorBoundary onClose={closeExportModal}>
          <React.Suspense fallback={<LoadingStatus className="sr-only" />}>
            <ExportModal
              onClose={closeExportModal}
              onPreparePrint={handlePreparePrint}
              startWithRestore={exportStartsWithRestore}
              launchedBackup={launchedBackup}
            />
          </React.Suspense>
        </ErrorBoundary>
      )}

      {isVersionModalOpen && (
        <ErrorBoundary onClose={closeVersionModal}>
          <React.Suspense fallback={<LoadingStatus className="sr-only" />}>
            <VersionModal
              onClose={closeVersionModal}
              onOpenShortcuts={() => {
                closeVersionModal();
                openShortcuts();
              }}
            />
          </React.Suspense>
        </ErrorBoundary>
      )}

      {isWelcomeModalOpen && (
        <ErrorBoundary onClose={closeWelcomeModal}>
          <React.Suspense fallback={<LoadingStatus className="sr-only" />}>
            <WelcomeModal onClose={closeWelcomeModal} onRestore={handleRestore} />
          </React.Suspense>
        </ErrorBoundary>
      )}

      {isInstallGuideOpen && (
        <ErrorBoundary onClose={closeInstallGuide}>
          <React.Suspense fallback={<LoadingStatus className="sr-only" />}>
            <InstallGuideModal onClose={closeInstallGuide} />
          </React.Suspense>
        </ErrorBoundary>
      )}

      {isShortcutsOpen && (
        <ErrorBoundary onClose={closeShortcuts}>
          <React.Suspense fallback={<LoadingStatus className="sr-only" />}>
            <KeyboardShortcutsModal onClose={closeShortcuts} />
          </React.Suspense>
        </ErrorBoundary>
      )}

      {/* Always rendered, so the browser print command (Ctrl+P) also prints the report */}
      <ErrorBoundary onError={() => setPrintView('failed')}>
        <React.Suspense fallback={null}>
          <PrintExportView selectedCycleIds={printCycleIds} />
          <ChunkReady onReady={setPrintView} />
        </React.Suspense>
      </ErrorBoundary>

      {toastMessage && (
        <div className="today-toast" role="status" aria-live="polite">
          <span>{toastMessage}</span>
        </div>
      )}

      <UndoToast />

      {/* The update message comes first: the banner hides while an update is ready */}
      <UpdatePrompt />
      {handleInstall && <InstallBanner onInstall={handleInstall} />}

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
