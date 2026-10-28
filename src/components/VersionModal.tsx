import type React from 'react';
import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  X,
  Tag,
  Sparkles,
  Database,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Cpu,
  Layers,
  HardDrive,
  ChevronDown,
  ChevronUp,
  Keyboard,
} from 'lucide-react';

const GithubIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);
import type { VersionRelease } from '../domain/versionTracker';
import {
  getVersionInfo,
  getVersionHistory,
  getLatestRelease,
  getStorageStats,
} from '../domain/versionTracker';
import { Modal } from './Modal';
import { formatMessage } from '../i18n';
import { Copyright, LegalDisclaimers } from './LegalNotice';

interface VersionModalProps {
  onClose: () => void;
  /** Closes this dialog and opens the keyboard shortcuts. */
  onOpenShortcuts?: () => void;
}

export const VersionModal: React.FC<VersionModalProps> = ({ onClose, onOpenShortcuts }) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'notes' | 'system'>('notes');
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({
    '1.1.0': true,
  });

  const versionInfo = getVersionInfo();
  const olderReleases = getVersionHistory().slice(1);
  const storageStats = getStorageStats();
  const latestRelease = getLatestRelease();

  const toggleVersionExpand = (version: string) => {
    setExpandedVersions(prev => ({
      ...prev,
      [version]: !prev[version],
    }));
  };

  const isFrench = language === 'fr';
  const getReleaseTitle = (rel: VersionRelease) => (isFrench ? rel.titleFr : rel.title);
  const getReleaseTagline = (rel: VersionRelease) => (isFrench ? rel.taglineFr : rel.tagline);
  const getReleaseHighlights = (rel: VersionRelease) =>
    isFrench ? rel.highlightsFr : rel.highlights;

  const formattedBuildDate = new Date(versionInfo.buildDate).toLocaleDateString(t.locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Modal
      labelledBy="version-modal-title"
      onClose={onClose}
      className="modal-overlay"
      panelClassName="modal-container version-modal-container"
    >
      {/* Modal Header */}
      <div className="modal-header version-modal-header">
        <div className="version-header-left">
          <div className="version-header-icon">
            <Sparkles size={20} className="version-sparkle-icon" />
          </div>
          <div>
            <h2 id="version-modal-title" className="version-title">
              {t.versionTracker.title}
            </h2>
            <div className="version-subtitle-pills">
              <span className="version-pill primary-pill">
                <Tag size={12} />v{versionInfo.version}
              </span>
              <span className="version-pill secondary-pill">
                <Layers size={12} />
                {formatMessage(t.versionTracker.crmsSpecPill, {
                  version: versionInfo.crmsSpecVersion,
                })}
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="icon-button close-modal-btn"
          onClick={onClose}
          aria-label={t.actions.close}
          title={t.actions.close}
        >
          <X size={20} />
        </button>
      </div>

      {/* Modal Tabs */}
      <div className="version-modal-tabs" role="tablist">
        <button
          role="tab"
          type="button"
          aria-selected={activeTab === 'notes'}
          className={`version-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          <Sparkles size={16} />
          <span>{t.versionTracker.tabReleaseNotes}</span>
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={activeTab === 'system'}
          className={`version-tab-btn ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveTab('system')}
        >
          <Cpu size={16} />
          <span>{t.versionTracker.tabSystemInfo}</span>
        </button>
      </div>

      {/* Modal Body */}
      <div className="modal-body version-modal-body">
        {activeTab === 'notes' ? (
          <div className="version-notes-tab">
            {/* Featured Release Card */}
            <div className="version-featured-card">
              <div className="featured-card-header">
                <div className="featured-badge">
                  <Tag size={14} />
                  <span>v{latestRelease.version}</span>
                </div>
                <span className="featured-date">
                  <Calendar size={14} />
                  {latestRelease.date}
                </span>
              </div>

              <h3 className="featured-release-title">{getReleaseTitle(latestRelease)}</h3>
              <p className="featured-release-tagline">{getReleaseTagline(latestRelease)}</p>

              <div className="featured-highlights-section">
                <h4 className="highlights-heading">{t.versionTracker.keyHighlights}</h4>
                <ul className="highlights-list">
                  {getReleaseHighlights(latestRelease).map((item, idx) => (
                    <li key={idx} className="highlight-item">
                      <CheckCircle2 size={16} className="highlight-icon" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Full Release History Accordion List */}
            <div className="release-history-section">
              <h4 className="section-title">{t.versionTracker.releaseHistory}</h4>
              <div className="history-list">
                {olderReleases.map(rel => {
                  const isExpanded = !!expandedVersions[rel.version];
                  const relTitle = getReleaseTitle(rel);
                  const relTagline = getReleaseTagline(rel);
                  const relHighlights = getReleaseHighlights(rel);

                  return (
                    <div
                      key={rel.version}
                      className={`history-item-card ${isExpanded ? 'expanded' : ''}`}
                    >
                      <button
                        type="button"
                        className="history-item-header-btn"
                        onClick={() => toggleVersionExpand(rel.version)}
                        aria-expanded={isExpanded}
                      >
                        <div className="history-header-left">
                          <span className="history-version-badge">v{rel.version}</span>
                          <span className="history-date">
                            <Calendar size={13} />
                            {rel.date}
                          </span>
                        </div>
                        <div className="history-expand-icon">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="history-item-body fade-in">
                          <h5 className="history-expanded-title">{relTitle}</h5>
                          <p className="history-tagline">{relTagline}</p>
                          <ul className="history-highlights-list">
                            {relHighlights.map((hl, i) => (
                              <li key={i} className="history-highlight-point">
                                <CheckCircle2 size={14} className="history-icon" />
                                <span>{hl}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="version-system-tab">
            {/* System Specs Table */}
            <div className="system-info-card">
              <h4 className="info-card-title">
                <Cpu size={16} />
                <span>{t.versionTracker.tabSystemInfo}</span>
              </h4>
              <div className="system-grid">
                <div className="system-grid-item">
                  <span className="grid-label">{t.versionTracker.appVersion}</span>
                  <span className="grid-value font-mono">v{versionInfo.version}</span>
                </div>
                <div className="system-grid-item">
                  <span className="grid-label">{t.versionTracker.crmsSpec}</span>
                  <span className="grid-value font-mono">v{versionInfo.crmsSpecVersion}</span>
                </div>
                <div className="system-grid-item">
                  <span className="grid-label">{t.versionTracker.buildDate}</span>
                  <span className="grid-value">{formattedBuildDate}</span>
                </div>
                <div className="system-grid-item">
                  <span className="grid-label">{t.versionTracker.environment}</span>
                  <span className="grid-value capitalize">{versionInfo.environment}</span>
                </div>
              </div>
            </div>

            {/* Storage Diagnostics Card */}
            <div className="system-info-card storage-card">
              <h4 className="info-card-title">
                <HardDrive size={16} />
                <span>{t.versionTracker.storageUsage}</span>
              </h4>
              <div className="system-grid">
                <div className="system-grid-item">
                  <span className="grid-label">{t.versionTracker.totalItems}</span>
                  <span className="grid-value">{storageStats.itemCount}</span>
                </div>
                <div className="system-grid-item">
                  <span className="grid-label">{t.versionTracker.cyclesTracked}</span>
                  <span className="grid-value">{storageStats.cyclesCount}</span>
                </div>
                <div className="system-grid-item">
                  <span className="grid-label">{t.versionTracker.observationsRecorded}</span>
                  <span className="grid-value">{storageStats.observationsCount}</span>
                </div>
                <div className="system-grid-item">
                  <span className="grid-label">{t.versionTracker.storageUsage}</span>
                  <span className="grid-value font-mono">{storageStats.formattedSize}</span>
                </div>
              </div>
            </div>

            {/* Repository Link */}
            <div className="repo-link-box">
              <div className="repo-info-left">
                <Database size={16} />
                <span>{t.versionTracker.openSourceTagline}</span>
              </div>
              <a
                href={versionInfo.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="repo-external-link"
                title={t.versionTracker.repository}
                aria-label={t.versionTracker.repository}
              >
                <GithubIcon size={18} className="repo-github-icon" />
                <span className="repo-link-text">{t.versionTracker.repository}</span>
                <ExternalLink size={13} className="repo-external-icon" />
              </a>
            </div>

            {/* Legal notice: the installed application has no footer */}
            <section className="version-legal-notice" aria-label={t.footer.label}>
              <LegalDisclaimers />
              <Copyright />
            </section>
          </div>
        )}
      </div>

      {/* Modal Footer */}
      <div className="modal-footer version-modal-footer">
        {/* The installed app has no footer, so its keyboard users find the shortcuts here */}
        {onOpenShortcuts && (
          <button type="button" className="btn btn-outline" onClick={onOpenShortcuts}>
            <Keyboard size={16} aria-hidden="true" />
            <span>{t.shortcuts.title}</span>
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          {t.versionTracker.close}
        </button>
      </div>
    </Modal>
  );
};
