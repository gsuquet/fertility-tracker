import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CycleStartModal } from '../CycleStartModal';
import { LanguageProvider } from '../../context/LanguageContext';

describe('CycleStartModal Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <LanguageProvider>
        <CycleStartModal isOpen={false} date="2026-09-02" onConfirm={vi.fn()} onCancel={vi.fn()} />
      </LanguageProvider>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal dialog when isOpen is true', () => {
    render(
      <LanguageProvider>
        <CycleStartModal isOpen={true} date="2026-09-02" onConfirm={vi.fn()} onCancel={vi.fn()} />
      </LanguageProvider>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('2026-09-02')).toBeInTheDocument();
  });

  it('triggers onConfirm(true) when clicking Start New Cycle', () => {
    const handleConfirm = vi.fn();
    render(
      <LanguageProvider>
        <CycleStartModal
          isOpen={true}
          date="2026-09-02"
          onConfirm={handleConfirm}
          onCancel={vi.fn()}
        />
      </LanguageProvider>
    );

    const yesBtn = screen.getByRole('button', { name: /Yes, Start New Cycle/i });
    fireEvent.click(yesBtn);
    expect(handleConfirm).toHaveBeenCalledWith(true);
  });

  it('triggers onConfirm(false) when clicking Continue Current Cycle', () => {
    const handleConfirm = vi.fn();
    render(
      <LanguageProvider>
        <CycleStartModal
          isOpen={true}
          date="2026-09-02"
          onConfirm={handleConfirm}
          onCancel={vi.fn()}
        />
      </LanguageProvider>
    );

    const noBtn = screen.getByRole('button', { name: /No, Continue Current Cycle/i });
    fireEvent.click(noBtn);
    expect(handleConfirm).toHaveBeenCalledWith(false);
  });

  it('triggers onCancel when Escape key is pressed', () => {
    const handleCancel = vi.fn();
    render(
      <LanguageProvider>
        <CycleStartModal
          isOpen={true}
          date="2026-09-02"
          onConfirm={vi.fn()}
          onCancel={handleCancel}
        />
      </LanguageProvider>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });
});
