import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { VersionModal } from '../VersionModal';
import { LanguageProvider } from '../../context/LanguageContext';
import { renderWithProviders } from '../../test/render';
import { getLatestRelease, getVersionHistory } from '../../domain/versionTracker';

describe('VersionModal Component', () => {
  it('renders modal content, version title and release notes', () => {
    render(
      <LanguageProvider>
        <VersionModal onClose={() => {}} />
      </LanguageProvider>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/About & Version Tracker/i)).toBeInTheDocument();
    expect(screen.getByText(/Key Features & Enhancements/i)).toBeInTheDocument();
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();

    // Click to expand past version item to see title in body
    fireEvent.click(screen.getByText('v1.0.0'));
    expect(screen.getByText(/Creighton Model System Core Engine/i)).toBeInTheDocument();
  });

  it('switches tabs to System Information when tab button is clicked', () => {
    render(
      <LanguageProvider>
        <VersionModal onClose={() => {}} />
      </LanguageProvider>
    );

    const systemTabBtn = screen.getByRole('tab', { name: /System Information/i });
    fireEvent.click(systemTabBtn);

    expect(screen.getByText(/App Version/i)).toBeInTheDocument();
    expect(screen.getByText(/CrMS Specification/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Local Storage Footprint/i)[0]).toBeInTheDocument();
  });

  it('calls onClose when close button or Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <LanguageProvider>
        <VersionModal onClose={handleClose} />
      </LanguageProvider>
    );

    const closeBtn = screen.getAllByRole('button', { name: /Close/i })[0]!;
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('is a native modal dialog with the focus on the close button', () => {
    renderWithProviders(<VersionModal onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: /About & Version Tracker/i });
    expect(dialog.tagName).toBe('DIALOG');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getAllByRole('button', { name: /Close/i })[0]).toHaveFocus();
  });

  it('shows the release notes in French', () => {
    renderWithProviders(<VersionModal onClose={vi.fn()} />, { language: 'fr' });
    const latest = getLatestRelease();
    expect(screen.getByText(latest.titleFr)).toBeInTheDocument();
    expect(screen.getByText(latest.taglineFr)).toBeInTheDocument();
    expect(screen.getByText(latest.highlightsFr[0] as string)).toBeInTheDocument();
  });

  it('collapses an expanded release and returns to the notes tab', () => {
    renderWithProviders(<VersionModal onClose={vi.fn()} />);
    const older = getVersionHistory()[1];
    if (!older) throw new Error('expected an older release');
    const header = screen.getByRole('button', { name: new RegExp(`v${older.version}`) });
    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(older.tagline)).toBeInTheDocument();
    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(screen.getByRole('tab', { name: /System Information/i }));
    fireEvent.click(screen.getByRole('tab', { name: /Release Notes/i }));
    expect(screen.getByRole('tab', { name: /Release Notes/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('closes from the overlay but not from the dialog body or other keys', () => {
    const handleClose = vi.fn();
    renderWithProviders(<VersionModal onClose={handleClose} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' });
    fireEvent.click(screen.getByText(getLatestRelease().title));
    expect(handleClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('dialog'));
    expect(handleClose).toHaveBeenCalledOnce();
  });
});
