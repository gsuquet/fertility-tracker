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
  it('renders 35-day paper chart row strip', () => {
    renderChartRow();
    expect(screen.getByText('Row 1 (Days 1 - 35)')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders cycle observations with stamps and codes when loaded', () => {
    renderChartRow();
    fireEvent.click(screen.getByText('Load Demo'));
    expect(screen.getByText('CD 13')).toBeInTheDocument();
  });
});
