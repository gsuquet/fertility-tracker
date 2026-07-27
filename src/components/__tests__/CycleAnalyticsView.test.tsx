import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CycleAnalyticsView } from '../CycleAnalyticsView';
import { LanguageProvider } from '../../context/LanguageContext';
import { CycleProvider, useCycle } from '../../context/CycleContext';

const TestAnalyticsApp: React.FC = () => {
  const { loadDemoData } = useCycle();
  return (
    <div>
      <button onClick={loadDemoData}>Load Demo Data</button>
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
    expect(screen.getByText('No Observations Logged')).toBeInTheDocument();
  });

  it('renders cycle phases, stamp distribution, and mucus trend chart when data loaded', () => {
    renderAnalyticsView();
    fireEvent.click(screen.getByText('Load Demo Data'));

    expect(screen.getByText('Cycle Phases Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Mucus & Stamp Score Distribution')).toBeInTheDocument();
    expect(screen.getByText('Creighton Mucus Score Trend (0 to 10)')).toBeInTheDocument();
    expect(screen.getByText('Practitioner Clinical Summary (CrMS / NaPro)')).toBeInTheDocument();
  });
});
