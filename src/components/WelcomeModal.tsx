import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useCycle } from '../context/CycleContext';
import { StampBadge } from './StampBadge';
import {
  X,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Activity,
  Sparkles,
  FileCode,
  CheckSquare,
  Zap,
  Layout,
  Calendar,
  BarChart2,
  CalendarDays,
  PlayCircle,
  CheckCircle2,
} from 'lucide-react';
import { STORAGE_HAS_SEEN_WELCOME_KEY } from '../domain/versionTracker';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { loadDemoData } = useCycle();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
      }
    } catch {
      // Ignore storage errors
    }
    onClose();
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleLoadDemo = () => {
    loadDemoData();
    handleDismiss();
  };

  const welcomeT = t.welcomeModal;
  const slides = welcomeT.slides;

  return (
    <div
      className="modal-overlay welcome-modal-overlay"
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      <div
        className="modal-container welcome-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header welcome-modal-header">
          <div className="welcome-header-left">
            <div className="welcome-header-icon">
              <BookOpen size={22} className="welcome-book-icon" />
            </div>
            <div>
              <h2 id="welcome-modal-title" className="welcome-title">{welcomeT.title}</h2>
              <span className="welcome-subtitle">{welcomeT.subtitle}</span>
            </div>
          </div>
          <button
            type="button"
            className="icon-button close-modal-btn"
            onClick={handleDismiss}
            aria-label={t.actions.close}
            title={t.actions.close}
          >
            <X size={20} />
          </button>
        </div>

        {/* Stepper Header / Progress */}
        <div className="welcome-stepper-bar">
          <div className="stepper-dots" role="tablist" aria-label="Onboarding Steps">
            {[1, 2, 3, 4].map((step) => (
              <button
                key={step}
                type="button"
                role="tab"
                aria-selected={currentStep === step}
                className={`stepper-dot-btn ${currentStep === step ? 'active' : ''} ${step < currentStep ? 'completed' : ''}`}
                onClick={() => setCurrentStep(step)}
                title={`Go to step ${step}`}
              >
                {step < currentStep ? <CheckCircle2 size={12} /> : step}
              </button>
            ))}
          </div>
          <span className="step-count-badge">
            {welcomeT.stepCount.replace('{current}', String(currentStep)).replace('{total}', String(totalSteps))}
          </span>
        </div>

        {/* Modal Body / Slides */}
        <div className="welcome-modal-body">
          {/* SLIDE 1: Introduction & Privacy */}
          {currentStep === 1 && (
            <div className="welcome-slide fade-in">
              <div className="slide-tag-pill">
                <Sparkles size={14} />
                <span>{slides.slide1.tag}</span>
              </div>
              <h3 className="slide-headline">{slides.slide1.title}</h3>
              <p className="slide-description">{slides.slide1.description}</p>

              <div className="welcome-features-grid">
                <div className="welcome-card highlight-card">
                  <div className="card-icon-header text-emerald">
                    <ShieldCheck size={24} />
                    <h4>{slides.slide1.privacyTitle}</h4>
                  </div>
                  <p className="justified-text">{slides.slide1.privacyText}</p>
                </div>

                <div className="welcome-card highlight-card">
                  <div className="card-icon-header text-indigo">
                    <Activity size={24} />
                    <h4>{slides.slide1.crmsTitle}</h4>
                  </div>
                  <p className="justified-text">{slides.slide1.crmsText}</p>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 2: Biomarkers & Stamps */}
          {currentStep === 2 && (
            <div className="welcome-slide fade-in">
              <div className="slide-tag-pill">
                <Sparkles size={14} />
                <span>{slides.slide2.tag}</span>
              </div>
              <h3 className="slide-headline">{slides.slide2.title}</h3>
              <p className="slide-description">{slides.slide2.description}</p>

              <div className="welcome-stamp-grid">
                <div className="stamp-card">
                  <div className="stamp-badge-slot">
                    <StampBadge stamp="RED" size="sm" />
                  </div>
                  <div className="stamp-card-content">
                    <h5>{slides.slide2.stamps.red.title}</h5>
                    <p>{slides.slide2.stamps.red.desc}</p>
                  </div>
                </div>

                <div className="stamp-card">
                  <div className="stamp-badge-slot">
                    <StampBadge stamp="DARK_GREEN" size="sm" />
                  </div>
                  <div className="stamp-card-content">
                    <h5>{slides.slide2.stamps.green.title}</h5>
                    <p>{slides.slide2.stamps.green.desc}</p>
                  </div>
                </div>

                <div className="stamp-card">
                  <div className="stamp-badge-slot">
                    <StampBadge stamp="LIGHT_GREEN_BABY_1" size="sm" />
                  </div>
                  <div className="stamp-card-content">
                    <h5>{slides.slide2.stamps.greenBaby.title}</h5>
                    <p>{slides.slide2.stamps.greenBaby.desc}</p>
                  </div>
                </div>

                <div className="stamp-card">
                  <div className="stamp-badge-slot">
                    <StampBadge stamp="WHITE_BABY" isPeakDay size="sm" />
                  </div>
                  <div className="stamp-card-content">
                    <h5>{slides.slide2.stamps.whiteBaby.title}</h5>
                    <p>{slides.slide2.stamps.whiteBaby.desc}</p>
                  </div>
                </div>

                <div className="stamp-card">
                  <div className="stamp-badge-slot">
                    <StampBadge stamp="YELLOW" size="sm" />
                  </div>
                  <div className="stamp-card-content">
                    <h5>{slides.slide2.stamps.yellow.title}</h5>
                    <p>{slides.slide2.stamps.yellow.desc}</p>
                  </div>
                </div>
              </div>

              <div className="welcome-banner-box">
                <strong>{slides.slide2.peakNoteTitle}: </strong>
                <span>{slides.slide2.peakNoteText}</span>
              </div>
            </div>
          )}

          {/* SLIDE 3: Daily Logging */}
          {currentStep === 3 && (
            <div className="welcome-slide fade-in">
              <div className="slide-tag-pill">
                <Sparkles size={14} />
                <span>{slides.slide3.tag}</span>
              </div>
              <h3 className="slide-headline">{slides.slide3.title}</h3>
              <p className="slide-description">{slides.slide3.description}</p>

              <div className="welcome-features-grid">
                <div className="welcome-card">
                  <div className="card-top-group">
                    <div className="card-icon-header text-amber">
                      <FileCode size={22} />
                      <h4>{slides.slide3.directTitle}</h4>
                    </div>
                    <p className="justified-text">{slides.slide3.directText}</p>
                  </div>
                  <div className="code-example-badge">
                    <code>10KL X3 I AP</code>
                  </div>
                </div>

                <div className="welcome-card">
                  <div className="card-top-group">
                    <div className="card-icon-header text-blue">
                      <CheckSquare size={22} />
                      <h4>{slides.slide3.detailedTitle}</h4>
                    </div>
                    <p className="justified-text">{slides.slide3.detailedText}</p>
                  </div>
                  <div className="code-example-badge form-mode-badge">
                    <CheckSquare size={13} />
                    <span>Detailed Form</span>
                  </div>
                </div>
              </div>

              <div className="welcome-banner-box info-banner">
                <Zap size={18} className="banner-icon text-amber" />
                <div>
                  <strong>{slides.slide3.livePreviewTitle}: </strong>
                  <span>{slides.slide3.livePreviewText}</span>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 4: Views & Quick Start */}
          {currentStep === 4 && (
            <div className="welcome-slide fade-in">
              <div className="slide-tag-pill">
                <Sparkles size={14} />
                <span>{slides.slide4.tag}</span>
              </div>
              <h3 className="slide-headline">{slides.slide4.title}</h3>
              <p className="slide-description">{slides.slide4.description}</p>

              <div className="views-grid">
                <div className="view-card-item">
                  <CalendarDays size={18} className="view-icon text-emerald" />
                  <span>{slides.slide4.views.today}</span>
                </div>
                <div className="view-card-item">
                  <Layout size={18} className="view-icon text-indigo" />
                  <span>{slides.slide4.views.chart}</span>
                </div>
                <div className="view-card-item">
                  <Calendar size={18} className="view-icon text-blue" />
                  <span>{slides.slide4.views.calendar}</span>
                </div>
                <div className="view-card-item">
                  <BarChart2 size={18} className="view-icon text-purple" />
                  <span>{slides.slide4.views.analytics}</span>
                </div>
              </div>

              <div className="quick-start-box">
                <h4>{slides.slide4.quickStartTitle}</h4>
                <p>{slides.slide4.quickStartDesc}</p>
                <div className="quick-start-actions">
                  <button
                    type="button"
                    className="btn btn-secondary load-demo-btn"
                    onClick={handleLoadDemo}
                  >
                    <PlayCircle size={18} />
                    <span>{welcomeT.loadDemoData}</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary start-fresh-btn"
                    onClick={handleDismiss}
                  >
                    <Sparkles size={18} />
                    <span>{welcomeT.getStarted}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="modal-footer welcome-modal-footer">
          <button
            type="button"
            className="btn btn-ghost skip-btn"
            onClick={handleDismiss}
          >
            {welcomeT.skip}
          </button>

          <div className="footer-nav-buttons">
            {currentStep > 1 && (
              <button
                type="button"
                className="btn btn-secondary prev-btn"
                onClick={handlePrev}
              >
                <ChevronLeft size={18} />
                <span>{welcomeT.previous}</span>
              </button>
            )}

            {currentStep < totalSteps ? (
              <button
                type="button"
                className="btn btn-primary next-btn"
                onClick={handleNext}
              >
                <span>{welcomeT.next}</span>
                <ChevronRight size={18} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
