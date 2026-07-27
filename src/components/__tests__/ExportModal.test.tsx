import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ExportModal } from '../ExportModal';
import { LanguageProvider } from '../../context/LanguageContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { CycleProvider } from '../../context/CycleContext';

const renderExportModal = (props: any) => {
  return render(
    <ThemeProvider>
      <LanguageProvider>
        <CycleProvider>
          <ExportModal {...props} />
        </CycleProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

describe('ExportModal Component', () => {
  it('renders modal dialog title and options when open', () => {
    renderExportModal({ isOpen: true, onClose: vi.fn() });
    expect(screen.getByText(/Practitioner Export & Data Backup/i)).toBeInTheDocument();
    expect(screen.getByText('Single Cycle')).toBeInTheDocument();
    expect(screen.getByText('Multiple Cycles')).toBeInTheDocument();
  });

  it('switches between Single Cycle and Multiple Cycles export scope mode', () => {
    renderExportModal({ isOpen: true, onClose: vi.fn() });

    // Initially Single Cycle is active
    expect(screen.getByLabelText(/Select Cycle/i)).toBeInTheDocument();

    // Click Multiple Cycles tab
    fireEvent.click(screen.getByText('Multiple Cycles'));
    expect(screen.getByText('Select All')).toBeInTheDocument();
    expect(screen.getByText('Deselect All')).toBeInTheDocument();
  });

  it('calls onPreparePrint when print button is clicked', () => {
    const onPreparePrint = vi.fn();
    renderExportModal({ isOpen: true, onClose: vi.fn(), onPreparePrint });

    const printBtn = screen.getByLabelText(/Print \/ Save as PDF/i);
    fireEvent.click(printBtn);

    expect(onPreparePrint).toHaveBeenCalled();
  });
});
