import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CycleProvider, useCycle, useCycleData, useCycleUi } from '../CycleContext';

const TestDataConsumer: React.FC = () => {
  const { observations, saveObservation, clearAllData, loadDemoData } = useCycleData();
  return (
    <div>
      <span data-testid="obs-count">{observations.length}</span>
      <button
        onClick={() =>
          saveObservation({
            date: '2026-09-02',
            bleeding: 'M',
          })
        }
      >
        Add Obs
      </button>
      <button onClick={loadDemoData}>Load Demo</button>
      <button onClick={clearAllData}>Clear All</button>
    </div>
  );
};

const TestUiConsumer: React.FC = () => {
  const { isDrawerOpen, setIsDrawerOpen } = useCycleUi();
  return (
    <div>
      <span data-testid="drawer-state">{isDrawerOpen ? 'open' : 'closed'}</span>
      <button onClick={() => setIsDrawerOpen(true)}>Open Drawer</button>
      <button onClick={() => setIsDrawerOpen(false)}>Close Drawer</button>
    </div>
  );
};

const TestUnifiedConsumer: React.FC = () => {
  const { observations, isDrawerOpen } = useCycle();
  return (
    <div>
      <span data-testid="unified-state">
        {observations.length}-{isDrawerOpen ? 'open' : 'closed'}
      </span>
    </div>
  );
};

describe('CycleContext Decoupled Providers and Hooks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides isolated data mutations without affecting unrelated ui state', async () => {
    const user = userEvent.setup();
    render(
      <CycleProvider>
        <TestDataConsumer />
        <TestUiConsumer />
        <TestUnifiedConsumer />
      </CycleProvider>
    );

    expect(screen.getByTestId('obs-count').textContent).toBe('0');
    expect(screen.getByTestId('drawer-state').textContent).toBe('closed');
    expect(screen.getByTestId('unified-state').textContent).toBe('0-closed');

    // Add observation
    await user.click(screen.getByText('Add Obs'));
    expect(screen.getByTestId('obs-count').textContent).toBe('1');
    expect(screen.getByTestId('drawer-state').textContent).toBe('closed');
    expect(screen.getByTestId('unified-state').textContent).toBe('1-closed');

    // Toggle drawer
    await user.click(screen.getByText('Open Drawer'));
    expect(screen.getByTestId('drawer-state').textContent).toBe('open');
    expect(screen.getByTestId('unified-state').textContent).toBe('1-open');

    // Load demo data
    await user.click(screen.getByText('Load Demo'));
    expect(Number(screen.getByTestId('obs-count').textContent)).toBeGreaterThan(10);

    // Clear all
    await user.click(screen.getByText('Clear All'));
    expect(screen.getByTestId('obs-count').textContent).toBe('0');
  });

  it('throws helpful error if hooks are used outside CycleProvider', () => {
    expect(() => render(<TestDataConsumer />)).toThrow(
      'useCycleData must be used within CycleProvider'
    );
    expect(() => render(<TestUiConsumer />)).toThrow(
      'useCycleUi must be used within CycleProvider'
    );
  });
});
