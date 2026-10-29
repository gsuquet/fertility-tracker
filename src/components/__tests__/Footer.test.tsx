import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Footer } from '../Footer';
import { LanguageProvider } from '../../context/LanguageContext';
import { en } from '../../i18n';

const renderFooter = () => {
  const onOpenVersion = vi.fn();
  const onOpenLegal = vi.fn();
  render(
    <LanguageProvider>
      <Footer onOpenVersion={onOpenVersion} onOpenLegal={onOpenLegal} />
    </LanguageProvider>
  );
  return { onOpenVersion, onOpenLegal };
};

describe('Footer Component', () => {
  it('has one line: the copyright, Legal and the version', () => {
    renderFooter();
    const footer = screen.getByRole('contentinfo', { name: en.footer.label });
    expect(footer).toHaveTextContent(
      new RegExp(`^© ${new Date().getFullYear()} Fertility Tracker·Legal·v\\d+\\.\\d+\\.\\d+$`)
    );
    // The full notice is in the version dialog and the welcome guide, not in the footer
    expect(screen.queryByText(/Saint Paul VI Institute/i)).toBeNull();
  });

  it('opens the legal notice and the version dialog', () => {
    const { onOpenVersion, onOpenLegal } = renderFooter();
    fireEvent.click(screen.getByRole('button', { name: en.footer.legal }));
    expect(onOpenLegal).toHaveBeenCalledOnce();

    const version = screen.getByRole('button', { name: /^v\d+\.\d+\.\d+$/ });
    expect(version).toHaveAttribute('title', en.versionTracker.title);
    fireEvent.click(version);
    expect(onOpenVersion).toHaveBeenCalledOnce();
  });
});
