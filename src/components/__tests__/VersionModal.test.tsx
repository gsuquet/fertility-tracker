import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { VersionModal } from '../VersionModal';
import { LanguageProvider } from '../../context/LanguageContext';

describe('VersionModal Component', () => {
  it('does not render when isOpen is false', () => {
    render(
      <LanguageProvider>
        <VersionModal isOpen={false} onClose={() => {}} />
      </LanguageProvider>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders modal content, version title and release notes when isOpen is true', () => {
    render(
      <LanguageProvider>
        <VersionModal isOpen={true} onClose={() => {}} />
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
        <VersionModal isOpen={true} onClose={() => {}} />
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
        <VersionModal isOpen={true} onClose={handleClose} />
      </LanguageProvider>
    );

    const closeBtn = screen.getAllByRole('button', { name: /Close/i })[0];
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
