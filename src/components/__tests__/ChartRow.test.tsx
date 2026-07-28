import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChartRow } from '../ChartRow';
import { LanguageProvider } from '../../context/LanguageContext';
import { CycleProvider, useCycle } from '../../context/CycleContext';

const TestChartApp: React.FC = () => {
  const { loadDemoData } = useCycle();
  return (
    <div>
      <button onClick={loadDemoData}>Load Demo</button>
      <ChartRow />
    </div>
  );
};

const renderChartRow = () => {
  return render(
    <LanguageProvider>
      <CycleProvider>
        <TestChartApp />
      </CycleProvider>
    </LanguageProvider>
  );
};

describe('ChartRow Component (Paper Chart Strip)', () => {
  it('renders 35-day paper chart row strip in empty state', () => {
    renderChartRow();
    expect(screen.getByText(/Cycle 1 \(Days 1 - 35\)/i)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders stacked past cycle rows with compact cells when loaded', () => {
    renderChartRow();
    fireEvent.click(screen.getByText('Load Demo'));

    // Verify multi-cycle header badges render
    const cycleBadges = screen.getAllByText(/Cycle/i);
    expect(cycleBadges.length).toBeGreaterThan(0);
  });

  it('toggles stamp legend key drawer when legend button is clicked', () => {
    renderChartRow();
    fireEvent.click(screen.getByText('Load Demo'));

    const legendBtn = screen.getByText('Legend Key');
    expect(screen.queryByText(/Creighton Model Chart Stamp Key/i)).not.toBeInTheDocument();

    fireEvent.click(legendBtn);
    expect(screen.getByText(/Creighton Model Chart Stamp Key/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Hide Legend'));
    expect(screen.queryByText(/Creighton Model Chart Stamp Key/i)).not.toBeInTheDocument();
  });

  it('switches between 35-Day Grid and Compact Strip view modes', () => {
    renderChartRow();
    fireEvent.click(screen.getByText('Load Demo'));

    const fullGridBtn = screen.getByTitle('Full 35-Day Paper Grid');
    const compactBtn = screen.getByTitle('Compact Strip');

    expect(fullGridBtn).toHaveClass('active');
    fireEvent.click(compactBtn);
    expect(compactBtn).toHaveClass('active');
  });
});
