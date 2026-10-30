import { screen, fireEvent, within } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { ExportModal } from '../ExportModal';
import { renderWithProviders } from '../../test/render';
import { makeObservation } from '../../test/factories';
import { en, fr } from '../../i18n';
import type { Observation } from '../../types/crms';
import * as chartImage from '../../utils/chartImage';

// Three short cycles, newest first in the app: 2026-09-11, 2026-09-06, 2026-09-01
const threeCycles = ['2026-09-01', '2026-09-06', '2026-09-11'].flatMap(start => {
  const day = Number(start.slice(8));
  return [
    makeObservation({ date: start, bleeding: 'H' }),
    makeObservation({ date: `2026-09-${String(day + 1).padStart(2, '0')}`, stretch: '0' }),
  ];
});

const renderModal = (observations?: Observation[], selectedCycleId?: string) => {
  const props = { onClose: vi.fn(), onPreparePrint: vi.fn(), onImageDone: vi.fn() };
  renderWithProviders(<ExportModal {...props} />, {
    ...(observations ? { observations } : {}),
    ...(selectedCycleId ? { selectedCycleId } : {}),
  });
  return props;
};

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const print = () => click(en.exportModal.printPdf);
const checkbox = (cycleNum: number) =>
  screen.getByRole('checkbox', { name: `${en.chartStrip.cycleBadge} ${cycleNum}` });

describe('ExportModal', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists the cycles from the newest, with the dates, the length and the Current tag', () => {
    renderModal(threeCycles);
    const list = within(screen.getByRole('group', { name: en.exportModal.cycles }));
    const boxes = list.getAllByRole('checkbox');
    expect(boxes.map(box => box.closest('label')?.textContent)).toEqual([
      'Cycle 3CurrentSep 11 – Sep 12 · 2 days',
      'Cycle 2Sep 6 – Sep 7 · 2 days',
      'Cycle 1Sep 1 – Sep 2 · 2 days',
    ]);
    expect(checkbox(3)).toHaveAccessibleDescription('Current Sep 11 – Sep 12 · 2 days');
    expect(checkbox(2)).toHaveAccessibleDescription('Sep 6 – Sep 7 · 2 days');
    expect(screen.getByText(en.exportModal.oldestToNewestNote)).toBeInTheDocument();
  });

  it('selects the newest cycle by default and prints it', () => {
    const props = renderModal(threeCycles);
    expect(checkbox(3)).toBeChecked();
    expect(checkbox(2)).not.toBeChecked();
    print();
    expect(props.onPreparePrint).toHaveBeenCalledWith(['cycle_2026-09-11'], 'cycle-3');
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('starts from the cycle selected in the app', () => {
    const props = renderModal(threeCycles, 'cycle_2026-09-06');
    expect(checkbox(2)).toBeChecked();
    expect(checkbox(3)).not.toBeChecked();
    print();
    expect(props.onPreparePrint).toHaveBeenCalledWith(['cycle_2026-09-06'], 'cycle-2');
  });

  it('starts from the newest cycle when the app shows all cycles', () => {
    const props = renderModal(threeCycles, 'all');
    print();
    expect(props.onPreparePrint).toHaveBeenCalledWith(['cycle_2026-09-11'], 'cycle-3');
  });

  it('names some cycles and all the cycles', () => {
    const props = renderModal(threeCycles);
    fireEvent.click(checkbox(1));
    print();
    expect(props.onPreparePrint).toHaveBeenLastCalledWith(
      ['cycle_2026-09-11', 'cycle_2026-09-01'],
      'selected-cycles'
    );
    fireEvent.click(checkbox(2));
    print();
    expect(props.onPreparePrint).toHaveBeenLastCalledWith(
      ['cycle_2026-09-11', 'cycle_2026-09-01', 'cycle_2026-09-06'],
      'all-cycles'
    );
  });

  it('disables the two actions when no cycle is selected', () => {
    renderModal(threeCycles);
    fireEvent.click(checkbox(3));
    expect(checkbox(3)).not.toBeChecked();
    expect(screen.getByRole('button', { name: en.exportModal.printPdf })).toBeDisabled();
    expect(screen.getByRole('button', { name: en.exportModal.downloadPng })).toBeDisabled();
  });

  it('exports one empty cycle when there is no data', () => {
    const props = renderModal();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    print();
    expect(props.onPreparePrint).toHaveBeenCalledWith(['all'], 'all-cycles');
  });

  it('closes, downloads the PNG of the selected cycles and tells the app', async () => {
    const download = vi.spyOn(chartImage, 'downloadChartPng').mockResolvedValue(true);
    const props = renderModal(threeCycles);
    fireEvent.click(checkbox(1));
    click(en.exportModal.downloadPng);
    expect(props.onClose).toHaveBeenCalledOnce();
    const [cycles, t, detail] = download.mock.calls[0] as Parameters<
      typeof chartImage.downloadChartPng
    >;
    expect(cycles.map(c => c.number)).toEqual([1, 3]);
    expect(t).toBe(en);
    expect(detail).toBe('selected-cycles');
    await vi.waitFor(() => expect(props.onImageDone).toHaveBeenCalledWith(true));
  });

  it('tells the app when the PNG fails', async () => {
    vi.spyOn(chartImage, 'downloadChartPng').mockRejectedValue(new Error('canvas'));
    const props = renderModal(threeCycles);
    click(en.exportModal.downloadPng);
    await vi.waitFor(() => expect(props.onImageDone).toHaveBeenCalledWith(false));
  });

  it('has no backup, restore, demo or delete action', () => {
    renderModal(threeCycles);
    expect(screen.queryByText(en.exportModal.jsonDescription)).toBeNull();
    // Backup, restore, demo and delete are in Settings (RFC 0002)
    const buttons = screen.getAllByRole('button').map(button => button.textContent);
    for (const label of [en.settings.backUpNow, en.settings.restore, en.settings.loadDemo]) {
      expect(buttons).not.toContain(label);
    }
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it('uses the language of the interface', () => {
    renderWithProviders(
      <ExportModal onClose={vi.fn()} onPreparePrint={vi.fn()} onImageDone={vi.fn()} />,
      { language: 'fr', observations: threeCycles }
    );
    expect(screen.getByRole('dialog', { name: fr.exportModal.title })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: fr.exportModal.downloadPng })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: fr.exportModal.printPdf })).toBeInTheDocument();
    expect(screen.getByText(fr.cyclePicker.current)).toBeInTheDocument();
  });

  it('is a native modal dialog with the focus on the close button', () => {
    renderModal();
    const dialog = screen.getByRole('dialog', { name: en.exportModal.title });
    expect(dialog.tagName).toBe('DIALOG');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: en.exportModal.close })).toHaveFocus();
  });

  it('closes from the close button, the overlay and Escape only', () => {
    const props = renderModal();
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Enter' });
    fireEvent.click(screen.getByText(en.exportModal.title));
    expect(props.onClose).not.toHaveBeenCalled();
    click(en.exportModal.close);
    fireEvent.click(dialog);
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(3);
  });
});
