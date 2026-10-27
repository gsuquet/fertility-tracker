import { screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { ExportModal } from '../ExportModal';
import { useCycleData } from '../../context/CycleContext';
import { renderWithProviders } from '../../test/render';
import { makeObservation } from '../../test/factories';
import { buildDemoObservations } from '../../domain/demoData';
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

const ObservationCount = () => (
  <span data-testid="count">{useCycleData().observations.length}</span>
);

const renderModal = (observations?: Observation[], selectedCycleId?: string) => {
  const props = { isOpen: true, onClose: vi.fn(), onPreparePrint: vi.fn() };
  renderWithProviders(
    <>
      <ExportModal {...props} />
      <ObservationCount />
    </>,
    { ...(observations ? { observations } : {}), ...(selectedCycleId ? { selectedCycleId } : {}) }
  );
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

  it('renders nothing when closed', () => {
    renderWithProviders(<ExportModal isOpen={false} onClose={vi.fn()} onPreparePrint={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
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

  it('describes the PDF and the backup file accurately', () => {
    renderModal();
    expect(screen.getByText(en.exportModal.pdfDescription)).toBeInTheDocument();
    expect(screen.getByText(en.exportModal.jsonDescription)).toBeInTheDocument();
    expect(screen.queryByText(/encrypted chart data/)).toBeNull();
  });

  it('shows the export descriptions in French', () => {
    renderWithProviders(<ExportModal isOpen onClose={vi.fn()} onPreparePrint={vi.fn()} />, {
      language: 'fr',
    });
    expect(screen.getByText(fr.exportModal.pdfDescription)).toBeInTheDocument();
    expect(screen.getByText(fr.exportModal.jsonDescription)).toBeInTheDocument();
  });

  it('downloads the data as a JSON backup', () => {
    const createObjectURL = vi.fn(() => 'blob:backup');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const props = renderModal(threeCycles);
    click(en.actions.exportJson);
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:backup');
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  const upload = (files: File[]) => {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files } });
  };

  it('restores a valid JSON backup', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const props = renderModal();
    upload([new File([JSON.stringify(threeCycles)], 'backup.json')]);
    await waitFor(() => expect(props.onClose).toHaveBeenCalledOnce());
    expect(alertSpy).toHaveBeenCalledWith('Chart data restored successfully!');
    expect(screen.getByTestId('count')).toHaveTextContent('6');
  });

  it('rejects an invalid backup and ignores an empty selection', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const props = renderModal();
    upload([]);
    upload([new File(['not json'], 'broken.json')]);
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('Failed to import JSON file. Please check file format.')
    );
    expect(alertSpy).toHaveBeenCalledOnce();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('loads the demo data', () => {
    const props = renderModal();
    click(en.actions.loadDemo);
    expect(screen.getByTestId('count')).toHaveTextContent(
      String(buildDemoObservations('2026-09-30').length)
    );
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('clears the data only after confirmation', () => {
    const confirmSpy = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    const props = renderModal(threeCycles);
    click(en.actions.clearData);
    expect(screen.getByTestId('count')).toHaveTextContent('6');
    click(en.actions.clearData);
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('closes from the close button, the overlay and Escape only', () => {
    const props = renderModal();
    fireEvent.keyDown(document, { key: 'Enter' });
    fireEvent.click(screen.getByText(en.exportModal.title));
    expect(props.onClose).not.toHaveBeenCalled();
    click('Close export dialog');
    fireEvent.click(screen.getByRole('dialog'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(3);
  });
});
