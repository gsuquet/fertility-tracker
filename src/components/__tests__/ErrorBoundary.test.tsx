import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';
import { en, fr } from '../../i18n';
import { renderWithProviders } from '../../test/render';

const Broken = (): never => {
  throw new Error('chunk failed to load');
};

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders its children when nothing fails', () => {
    renderWithProviders(
      <ErrorBoundary>
        <p>content</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows a translated alert instead of a blank screen when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWithProviders(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
      { language: 'fr' }
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(fr.errorBoundary.title);
    expect(alert).toHaveTextContent(fr.errorBoundary.message);
    expect(screen.getByRole('button', { name: fr.errorBoundary.reload })).toBeInTheDocument();
  });

  it('shows the alert in a dialog with a Close button in dialog mode', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onClose = vi.fn();
    renderWithProviders(
      <ErrorBoundary onClose={onClose}>
        <Broken />
      </ErrorBoundary>,
      { language: 'fr' }
    );
    const dialog = screen.getByRole('dialog', { name: fr.errorBoundary.title });
    expect(dialog).toContainElement(screen.getByRole('alert'));
    fireEvent.click(screen.getByRole('button', { name: fr.errorBoundary.close }));
    expect(onClose).toHaveBeenCalledOnce();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('calls onError once when a child fails', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();
    renderWithProviders(
      <ErrorBoundary onError={onError}>
        <Broken />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalledOnce();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('reloads the page when the user clicks Reload', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    renderWithProviders(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByRole('button', { name: en.errorBoundary.reload }));
    expect(reload).toHaveBeenCalledOnce();
  });
});
