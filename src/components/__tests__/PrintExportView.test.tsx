import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PrintExportView } from '../PrintExportView';
import { LanguageProvider } from '../../context/LanguageContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { CycleProvider } from '../../context/CycleContext';

const renderPrintExportView = (props: { selectedCycleIds: string[] }) => {
  return render(
    <ThemeProvider>
      <LanguageProvider>
        <CycleProvider>
          <PrintExportView {...props} />
        </CycleProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

describe('PrintExportView Component', () => {
  it('renders printable PDF export report header and stamp legend key', () => {
    renderPrintExportView({ selectedCycleIds: ['all'] });
    expect(screen.getByText(/Creighton Model FertilityCare System Chart Report/i)).toBeInTheDocument();
    expect(screen.getByText(/Clinical Chart Export • Landscape 35-Day Grid View/i)).toBeInTheDocument();
    expect(screen.getByText(/Creighton Model Chart Stamp Key:/i)).toBeInTheDocument();
  });
});
