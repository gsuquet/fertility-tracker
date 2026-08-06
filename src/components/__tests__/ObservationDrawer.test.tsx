import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ObservationDrawer } from '../ObservationDrawer';
import { LanguageProvider } from '../../context/LanguageContext';
import { CycleProvider, useCycle } from '../../context/CycleContext';

const TestWrapper: React.FC = () => {
  const { setIsDrawerOpen } = useCycle();
  return (
    <div>
      <button onClick={() => setIsDrawerOpen(true)}>Open Drawer</button>
      <ObservationDrawer />
    </div>
  );
};

const renderDrawer = () => {
  return render(
    <LanguageProvider>
      <CycleProvider>
        <TestWrapper />
      </CycleProvider>
    </LanguageProvider>
  );
};

describe('ObservationDrawer Component (Dual Logger)', () => {
  it('opens drawer and parses direct code text input', () => {
    renderDrawer();
    fireEvent.click(screen.getByText('Open Drawer'));

    const directInput = screen.getByPlaceholderText('e.g. 10KLX3 I AP');
    expect(directInput).toBeInTheDocument();

    fireEvent.change(directInput, { target: { value: '10kl x3 i ap' } });
    expect(screen.getByText('10KLX3 I')).toBeInTheDocument();
  });

  it('updates live stamp preview when options are clicked', () => {
    renderDrawer();
    fireEvent.click(screen.getByText('Open Drawer'));

    const heavyBleedingBtn = screen.getByText('H - Heavy Flow');
    fireEvent.click(heavyBleedingBtn);

    expect(screen.getByText('H')).toBeInTheDocument();
  });
});
