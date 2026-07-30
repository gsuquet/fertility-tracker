import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import {
  getVersionInfo,
  getVersionHistory,
  getStorageStats,
  VersionRelease,
} from '../domain/versionTracker';

interface VersionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VersionModal: React.FC<VersionModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'notes' | 'system'>('notes');

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const versionInfo = getVersionInfo();
  const history: VersionRelease[] = getVersionHistory();
  const storageStats = getStorageStats();
  const latestRelease = history[0];

  const formattedBuildDate = new Date(versionInfo.buildDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="version-modal-title">
      <div className="modal-container version-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header version-modal-header">
          <div className="version-header-left">
            <div className="version-header-icon">
              <Sparkles size={20} className="version-sparkle-icon" />
            </div>
            <div>
              <h2 id="version-modal-title" className="version-title">{t.versionTracker.title}</h2>
              <div className="version-subtitle-pills">
                <span className="version-pill primary-pill">
                  <Tag size={12} />
                  v{versionInfo.version}
                </span>
                <span className="version-pill secondary-pill">
                  <Layers size={12} />
                  CrMS Spec v{versionInfo.crmsSpecVersion}
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
              {latestRelease && (
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

                  <h3 className="featured-release-title">{latestRelease.title}</h3>
                  {latestRelease.tagline && (
                    <p className="featured-release-tagline">{latestRelease.tagline}</p>
                  )}

                  <div className="featured-highlights-section">
                    <h4 className="highlights-heading">{t.versionTracker.keyHighlights}</h4>
                    <ul className="highlights-list">
                      {latestRelease.highlights.map((item, idx) => (
                        <li key={idx} className="highlight-item">
                          <CheckCircle2 size={16} className="highlight-icon" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Full Release History List if multiple versions */}
              {history.length > 1 && (
                <div className="release-history-section">
                  <h4 className="section-title">{t.versionTracker.releaseHistory}</h4>
                  <div className="history-list">
                    {history.slice(1).map((rel) => (
                      <div key={rel.version} className="history-item">
                        <div className="history-item-header">
                          <span className="history-version">v{rel.version}</span>
                          <span className="history-date">{rel.date}</span>
                        </div>
                        <h5 className="history-item-title">{rel.title}</h5>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                <Database size={16} />
                <span>Open Source Privacy-First Software</span>
                <a
                  href={versionInfo.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="repo-external-link"
                >
                  <span>{t.versionTracker.repository}</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer version-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t.versionTracker.close}
          </button>
        </div>
      </div>
    </div>
  );
};
