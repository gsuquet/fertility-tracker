import type React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CycleAnalyticsView } from '../CycleAnalyticsView';
import { LanguageProvider } from '../../context/LanguageContext';
import { CycleProvider, useCycle } from '../../context/CycleContext';
import { en } from '../../i18n';

const TestAnalyticsApp: React.FC = () => {
  const { loadDemoData } = useCycle();
  return (
    <div>
      <button type="button" onClick={loadDemoData}>
        Load Demo Data
      </button>
      <CycleAnalyticsView />
    </div>
  );
};

const renderAnalyticsView = () => {
  return render(
    <LanguageProvider>
      <CycleProvider>
        <TestAnalyticsApp />
      </CycleProvider>
    </LanguageProvider>
  );
};

describe('CycleAnalyticsView Component', () => {
  it('renders empty state when no observations are present', () => {
    renderAnalyticsView();
    expect(screen.getByText(en.analytics.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(en.analytics.emptyText)).toBeInTheDocument();
    // The analytics tab controls this panel, so the panel id exists also when it is empty
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('id', 'analytics-panel');
    expect(panel).toHaveAttribute('aria-labelledby', 'tab-analytics');
  });

  it('lets the keyboard focus and scroll the mucus trend chart', () => {
    renderAnalyticsView();
    fireEvent.click(screen.getByText('Load Demo Data'));
    const trend = screen.getByRole('region', { name: en.analytics.trendTitle });
    expect(trend).toHaveClass('mucus-trend-wrapper');
    expect(trend).toHaveAttribute('tabindex', '0');
  });

  it('shows the phases, the trend, the stamps, the summary and the explanation, in this order', () => {
    renderAnalyticsView();
    fireEvent.click(screen.getByText('Load Demo Data'));
    const headings = screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent);
    expect(headings).toEqual([
      en.analytics.phasesTitle,
      en.analytics.trendTitle,
      en.analytics.stampsTitle,
      en.analytics.clinicalTitle,
      en.analytics.mcsGuideTitle,
    ]);
  });
});
