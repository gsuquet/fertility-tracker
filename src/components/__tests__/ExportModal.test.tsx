import { screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { ExportModal } from '../ExportModal';
import { renderWithProviders } from '../../test/render';
import { makeObservation } from '../../test/factories';
import { en, fr } from '../../i18n';
import type { Observation } from '../../types/crms';

// Three short cycles, newest first in the app: 2026-09-11, 2026-09-06, 2026-09-01
const threeCycles = ['2026-09-01', '2026-09-06', '2026-09-11'].flatMap(start => {
  const day = Number(start.slice(8));
  return [
    makeObservation({ date: start, bleeding: 'H' }),
    makeObservation({ date: `2026-09-${String(day + 1).padStart(2, '0')}`, stretch: '0' }),
  ];
});

const renderModal = (observations?: Observation[], selectedCycleId?: string) => {
  const props = { onClose: vi.fn(), onPreparePrint: vi.fn() };
  renderWithProviders(<ExportModal {...props} />, {
    ...(observations ? { observations } : {}),
    ...(selectedCycleId ? { selectedCycleId } : {}),
  });
  return props;
};

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const print = () => click(en.exportModal.printPdf);
const multiCheckbox = (cycleNum: number) =>
  screen
    .getByText(`${en.chartStrip.cycleBadge} ${cycleNum}`)
    .closest('label')
    ?.querySelector('input') as HTMLInputElement;

describe('ExportModal', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints the newest cycle by default in single mode', () => {
    const props = renderModal(threeCycles);
    print();
    expect(props.onPreparePrint).toHaveBeenCalledWith(['cycle_2026-09-11'], 'cycle-3');
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('starts from the cycle selected in the app', () => {
    const props = renderModal(threeCycles, 'cycle_2026-09-06');
    print();
    expect(props.onPreparePrint).toHaveBeenCalledWith(['cycle_2026-09-06'], 'cycle-2');
  });

  it('starts from the newest cycle when the app shows all cycles', () => {
    const props = renderModal(threeCycles, 'all');
    print();
    expect(props.onPreparePrint).toHaveBeenCalledWith(['cycle_2026-09-11'], 'cycle-3');
  });

  it('prints the cycle picked in single mode', () => {
    const props = renderModal(threeCycles);
    fireEvent.change(screen.getByLabelText(`${en.exportModal.selectCycle}:`), {
      target: { value: 'cycle_2026-09-01' },
    });
    print();
    expect(props.onPreparePrint).toHaveBeenCalledWith(['cycle_2026-09-01'], 'cycle-1');
  });

  it('prints all cycles when there is no data', () => {
    const props = renderModal();
    print();
    expect(props.onPreparePrint).toHaveBeenCalledWith(['all'], 'all-cycles');
  });

  it('prints every cycle in multiple mode by default', () => {
    const props = renderModal(threeCycles);
    click(en.exportModal.multipleCycles);
    print();
    expect(props.onPreparePrint).toHaveBeenCalledWith(
      ['cycle_2026-09-11', 'cycle_2026-09-06', 'cycle_2026-09-01'],
      'all-cycles'
    );
  });

  it('names a partial and a single selection in multiple mode', () => {
    const props = renderModal(threeCycles);
    click(en.exportModal.multipleCycles);
    fireEvent.click(multiCheckbox(3));
    print();
    expect(props.onPreparePrint).toHaveBeenLastCalledWith(
      ['cycle_2026-09-06', 'cycle_2026-09-01'],
      'selected-cycles'
    );

    click(en.exportModal.multipleCycles);
    fireEvent.click(multiCheckbox(2));
    expect(multiCheckbox(2).checked).toBe(false);
    print();
    expect(props.onPreparePrint).toHaveBeenLastCalledWith(['cycle_2026-09-01'], 'cycle-1');
  });

  it('prints all cycles when every cycle is deselected', () => {
    const props = renderModal(threeCycles);
    click(en.exportModal.multipleCycles);
    click(en.exportModal.deselectAll);
    fireEvent.click(multiCheckbox(1));
    click(en.exportModal.deselectAll);
    print();
    expect(props.onPreparePrint).toHaveBeenLastCalledWith(['all'], 'all-cycles');
  });

  it('selects every cycle again and returns to single mode', () => {
    const props = renderModal(threeCycles);
    click(en.exportModal.multipleCycles);
    click(en.exportModal.deselectAll);
    click(en.exportModal.selectAll);
    expect(multiCheckbox(1).checked).toBe(true);
    click(en.exportModal.singleCycle);
    print();
    expect(props.onPreparePrint).toHaveBeenCalledWith(['cycle_2026-09-11'], 'cycle-3');
  });

  it('describes the PDF, and has no backup, restore, demo or delete action', () => {
    renderModal(threeCycles);
    expect(screen.getByText(en.exportModal.pdfDescription)).toBeInTheDocument();
    expect(screen.queryByText(en.exportModal.jsonDescription)).toBeNull();
    // Backup, restore, demo and delete are in Settings (RFC 0002)
    const buttons = screen.getAllByRole('button').map(button => button.textContent);
    for (const label of [en.settings.backUpNow, en.settings.restore, en.settings.loadDemo]) {
      expect(buttons).not.toContain(label);
    }
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it('shows the print description in French', () => {
    renderWithProviders(<ExportModal onClose={vi.fn()} onPreparePrint={vi.fn()} />, {
      language: 'fr',
    });
    expect(screen.getByRole('dialog', { name: fr.exportModal.title })).toBeInTheDocument();
    expect(screen.getByText(fr.exportModal.pdfDescription)).toBeInTheDocument();
  });

  it('is a native modal dialog with the focus on the close button', () => {
    renderModal();
    const dialog = screen.getByRole('dialog', { name: en.exportModal.title });
    expect(dialog.tagName).toBe('DIALOG');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Close export dialog' })).toHaveFocus();
  });

  it('closes from the close button, the overlay and Escape only', () => {
    const props = renderModal();
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Enter' });
    fireEvent.click(screen.getByText(en.exportModal.title));
    expect(props.onClose).not.toHaveBeenCalled();
    click('Close export dialog');
    fireEvent.click(dialog);
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(3);
  });
});
