import type React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ChartRow } from '../ChartRow';
import { LanguageProvider } from '../../context/LanguageContext';
import { CycleProvider, useCycle } from '../../context/CycleContext';

const TestChartApp: React.FC = () => {
  const { loadDemoData } = useCycle();
  return (
    <div>
      <button type="button" onClick={loadDemoData}>
        Load Demo
      </button>
      <ChartRow />
    </div>
  );
};

const TestChartAppWithControls: React.FC = () => {
  const { saveObservation } = useCycle();
  return (
    <div>
      <button type="button" onClick={() => saveObservation({ date: '2026-07-25', bleeding: 'H' })}>
        Add July 25
      </button>
      <button type="button" onClick={() => saveObservation({ date: '2026-07-20', bleeding: 'L' })}>
        Add July 20
      </button>
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
  beforeEach(() => {
    localStorage.clear();
  });
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

  it('shows the stamp legend under the rows with the Legend button', () => {
    renderChartRow();
    fireEvent.click(screen.getByText('Load Demo'));

    expect(screen.queryByText(/Creighton Model Chart Stamp Key/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Legend' }));
    expect(screen.getByText(/Creighton Model Chart Stamp Key/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hide legend' }));
    expect(screen.queryByText(/Creighton Model Chart Stamp Key/i)).not.toBeInTheDocument();
  });

  it('switches between the 35-day and Strip views', () => {
    renderChartRow();
    fireEvent.click(screen.getByText('Load Demo'));

    const fullGridBtn = screen.getByRole('button', { name: '35-day' });
    const stripBtn = screen.getByRole('button', { name: 'Strip' });

    expect(fullGridBtn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(stripBtn);
    expect(stripBtn).toHaveAttribute('aria-pressed', 'true');
    expect(fullGridBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('displays observations chronologically by date when added out of creation order', () => {
    localStorage.clear();
    render(
      <LanguageProvider>
        <CycleProvider>
          <TestChartAppWithControls />
        </CycleProvider>
      </LanguageProvider>
    );

    // Create July 25 observation FIRST
    act(() => {
      fireEvent.click(screen.getByText('Add July 25'));
    });
    // Create July 20 observation SECOND
    act(() => {
      fireEvent.click(screen.getByText('Add July 20'));
    });

    // The cycle line gives the range from the first to the last day, and its length
    expect(screen.getByText('Jul 20 – Jul 25')).toBeInTheDocument();
    expect(screen.getByText('6 days')).toBeInTheDocument();
  });

  it('marks today on the blank grid with the is-today class only', () => {
    const { container } = renderChartRow();
    expect(container.querySelector('.cell-today-pill')).toBeNull();
    expect(container.querySelectorAll('.chart-cell.is-today')).toHaveLength(1);
  });
});
