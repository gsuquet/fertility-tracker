import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Footer } from '../Footer';
import { LanguageProvider } from '../../context/LanguageContext';

describe('Footer Component', () => {
  it('renders trademark and medical disclaimers', () => {
    render(
      <LanguageProvider>
        <Footer />
      </LanguageProvider>
    );

    expect(screen.getByText(/Saint Paul VI Institute/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Fertility Tracker is an independent open-source/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/medical advice, diagnosis, or treatment/i)).toBeInTheDocument();
  });

  it('renders version badge when onOpenVersion callback is provided', () => {
    const handleOpenVersion = vi.fn();
    render(
      <LanguageProvider>
        <Footer onOpenVersion={handleOpenVersion} />
      </LanguageProvider>
    );

    const versionBtn = screen.getByRole('button', { name: /About & Version Tracker/i });
    expect(versionBtn).toBeInTheDocument();
    expect(versionBtn).toHaveTextContent(/v\d+\.\d+\.\d+/);

    fireEvent.click(versionBtn);
    expect(handleOpenVersion).toHaveBeenCalledTimes(1);
  });

  it('renders user guide button when onOpenWelcome callback is provided', () => {
    const handleOpenWelcome = vi.fn();
    render(
      <LanguageProvider>
        <Footer onOpenWelcome={handleOpenWelcome} />
      </LanguageProvider>
    );

    const guideBtn = screen.getByRole('button', {
      name: /Welcome to Fertility Tracker|User Guide|Bienvenue/i,
    });
    expect(guideBtn).toBeInTheDocument();
    expect(guideBtn).toHaveTextContent(/User Guide/i);

    fireEvent.click(guideBtn);
    expect(handleOpenWelcome).toHaveBeenCalledTimes(1);
  });
});
