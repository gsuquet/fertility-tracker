import React, { useEffect } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CyclePicker } from '../CyclePicker';
import { CycleProvider, useCycle } from '../../context/CycleContext';

const TestWrapper: React.FC = () => {
  const { loadDemoData, cycles } = useCycle();
  useEffect(() => {
    if (cycles.length === 0) {
      loadDemoData();
    }
  }, []);
  return <CyclePicker />;
};

const renderCyclePicker = () => {
  return render(
    <CycleProvider>
      <TestWrapper />
    </CycleProvider>
  );
};

describe('CyclePicker Component', () => {
  it('renders cycle picker button with active cycle selection', () => {
    renderCyclePicker();
    const btn = screen.getByRole('button', { name: /filter cycle view/i });
    expect(btn).toBeInTheDocument();
  });

  it('defaults to current cycle selection when cycles exist', () => {
    renderCyclePicker();
    const btn = screen.getByRole('button', { name: /filter cycle view/i });
    expect(btn).toHaveTextContent(/Cycle 2/i);
  });

  it('opens cycle selection menu on button click and allows selecting cycles', () => {
    renderCyclePicker();
    const btn = screen.getByRole('button', { name: /filter cycle view/i });

    fireEvent.click(btn);

    const menu = screen.getByRole('listbox');
    expect(menu).toBeInTheDocument();

    const allCyclesOption = screen.getByRole('option', { name: /all cycles/i });
    expect(allCyclesOption).toBeInTheDocument();

    fireEvent.click(allCyclesOption);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(btn).toHaveTextContent(/All Cycles/i);
  });
});
