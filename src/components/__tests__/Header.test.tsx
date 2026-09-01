import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from '../Header';
import { LanguageProvider } from '../../context/LanguageContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { CycleProvider } from '../../context/CycleContext';

const renderHeader = (props: any) => {
  return render(
    <ThemeProvider>
      <LanguageProvider>
        <CycleProvider>
          <Header {...props} />
        </CycleProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

describe('Header Component (Desktop)', () => {
  it('renders branding title and subtitle', () => {
    renderHeader({ activeTab: 'chart', setActiveTab: vi.fn(), onOpenExport: vi.fn() });
    expect(screen.getByText('Fertility Tracker')).toBeInTheDocument();
  });

  it('allows switching active tabs when tab buttons are clicked', () => {
    const setActiveTab = vi.fn();
    renderHeader({ activeTab: 'chart', setActiveTab, onOpenExport: vi.fn() });

    fireEvent.click(screen.getByText('Today'));
    expect(setActiveTab).toHaveBeenCalledWith('today');

    fireEvent.click(screen.getByText('Monthly Calendar'));
    expect(setActiveTab).toHaveBeenCalledWith('calendar');
  });

  it('toggles language between EN and FR when language button is clicked', () => {
    renderHeader({ activeTab: 'chart', setActiveTab: vi.fn(), onOpenExport: vi.fn() });
    const langBtn = screen.getByTitle(/Switch Language/i);
    expect(langBtn).toHaveTextContent('EN');

    fireEvent.click(langBtn);
    expect(langBtn).toHaveTextContent('FR');
  });

  it('triggers onOpenVersion when info button is clicked', () => {
    const handleOpenVersion = vi.fn();
    renderHeader({ activeTab: 'chart', setActiveTab: vi.fn(), onOpenExport: vi.fn(), onOpenVersion: handleOpenVersion });

    const versionBtn = screen.getByRole('button', { name: /About & Version Tracker|À propos/i });
    expect(versionBtn).toBeInTheDocument();

    fireEvent.click(versionBtn);
    expect(handleOpenVersion).toHaveBeenCalledTimes(1);
  });

  it('opens mobile action sheet and triggers actions when items are clicked', () => {
    const handleExport = vi.fn();
    const handleWelcome = vi.fn();
    const handleVersion = vi.fn();

    renderHeader({
      activeTab: 'today',
      setActiveTab: vi.fn(),
      onOpenExport: handleExport,
      onOpenWelcome: handleWelcome,
      onOpenVersion: handleVersion,
    });

    const moreBtn = screen.getByRole('button', { name: /More actions/i });
    expect(moreBtn).toBeInTheDocument();

    // Open sheet
    fireEvent.click(moreBtn);
    expect(screen.getByRole('dialog', { name: /Mobile Navigation Menu/i })).toBeInTheDocument();

    // Click Export in sheet
    fireEvent.click(screen.getByText(/Imprimer ou exporter en PDF \/ JSON|Print or export PDF \/ JSON charts/i));
    expect(handleExport).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: /Mobile Navigation Menu/i })).not.toBeInTheDocument();
  });
});
