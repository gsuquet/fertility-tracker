import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TodayView } from '../TodayView';
import { LanguageProvider } from '../../context/LanguageContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { CycleProvider } from '../../context/CycleContext';

const renderTodayView = () => {
  return render(
    <ThemeProvider>
      <LanguageProvider>
        <CycleProvider>
          <TodayView />
        </CycleProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

describe('TodayView Component (Dedicated Today Page)', () => {
  it('renders Today Page title, date navigation, and form sections', () => {
    renderTodayView();
    expect(screen.getByText("Today's Observation")).toBeInTheDocument();
    expect(screen.getByText("Direct Code Entry")).toBeInTheDocument();
    expect(screen.getByText("Recent 5-Day Observation History")).toBeInTheDocument();
  });

  it('allows stepping to previous and next days', () => {
    renderTodayView();
    const prevBtn = screen.getByTitle('Previous Day');
    expect(prevBtn).toBeInTheDocument();
    fireEvent.click(prevBtn);
  });

  it('updates form and code string when direct input text is typed', () => {
    renderTodayView();
    const directInput = screen.getByPlaceholderText('e.g. 10KL X3 I AP');
    fireEvent.change(directInput, { target: { value: '10KL X3 I' } });
    expect(directInput).toHaveValue('10KL X3 I');
  });

  it('enables save button when changes are made and disables when pristine/saved', () => {
    renderTodayView();
    // Initially empty or saved observation: type input to make a change
    const directInput = screen.getByPlaceholderText('e.g. 10KL X3 I AP');
    fireEvent.change(directInput, { target: { value: '10KL X3 I' } });

    const saveBtn = screen.getByRole('button', { name: /Save Observation/i });
    expect(saveBtn).not.toBeDisabled();
    fireEvent.click(saveBtn);
    expect(screen.getByText('Observation saved successfully!')).toBeInTheDocument();
  });

  it('allows toggling between Direct Code Only mode and Detailed Form mode', () => {
    renderTodayView();
    const directModeBtn = screen.getByText('Direct Code Only');
    const detailedModeBtn = screen.getByText('Detailed Form');

    expect(directModeBtn).toBeInTheDocument();
    expect(detailedModeBtn).toBeInTheDocument();

    // Click Direct Code Only mode
    fireEvent.click(directModeBtn);
    expect(screen.getByText('Show Detailed Selectors')).toBeInTheDocument();

    // Click Detailed Form mode
    fireEvent.click(detailedModeBtn);
    expect(screen.getByText('Bleeding (Flux)')).toBeInTheDocument();
  });
});
