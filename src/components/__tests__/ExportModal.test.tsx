import { useMemo, useState } from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { ExportModal } from '../ExportModal';
import { useCycleData } from '../../context/CycleContext';
import { renderWithProviders } from '../../test/render';
import { makeObservation } from '../../test/factories';
import { buildDemoObservations } from '../../domain/demoData';
import { en, fr } from '../../i18n';
import type { Observation } from '../../types/crms';
import { getTodayStr } from '../../utils/dateUtils';

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
  const props = { onClose: vi.fn(), onPreparePrint: vi.fn() };
  renderWithProviders(
    <>
      <ExportModal {...props} />
      <ObservationCount />
    </>,
    { ...(observations ? { observations } : {}), ...(selectedCycleId ? { selectedCycleId } : {}) }
  );
  return props;
};

/** The app gives a new object for each file that the user opens with it. */
const Launcher = ({ onClose }: { onClose: () => void }) => {
  const [text, setText] = useState('{}');
  const launchedBackup = useMemo(() => ({ text }), [text]);
  return (
    <>
      <ExportModal onClose={onClose} onPreparePrint={vi.fn()} launchedBackup={launchedBackup} />
      <button type="button" onClick={() => setText(JSON.stringify(threeCycles.slice(0, 2)))}>
        open another file
      </button>
    </>
  );
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

  it('describes the PDF and the backup file accurately', () => {
    renderModal();
    expect(screen.getByText(en.exportModal.pdfDescription)).toBeInTheDocument();
    expect(screen.getByText(en.exportModal.jsonDescription)).toBeInTheDocument();
    expect(screen.queryByText(/encrypted chart data/)).toBeNull();
  });

  it('shows the export descriptions in French', () => {
    renderWithProviders(<ExportModal onClose={vi.fn()} onPreparePrint={vi.fn()} />, {
      language: 'fr',
    });
    expect(screen.getByText(fr.exportModal.pdfDescription)).toBeInTheDocument();
    expect(screen.getByText(fr.exportModal.jsonDescription)).toBeInTheDocument();
  });

  it('downloads the data as a .ftbackup file of plain JSON, with a neutral file type', async () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:backup');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    let link: HTMLAnchorElement | undefined;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      link = this;
    });
    const props = renderModal(threeCycles);
    click(en.actions.exportJson);
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(link?.download).toBe(`fertility-tracker-backup-${getTodayStr()}.ftbackup`);
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    // With application/json, a browser can add .json after .ftbackup
    expect(blob.type).toBe('application/octet-stream');
    expect(JSON.parse(await blob.text())).toHaveLength(6);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:backup');
    expect(props.onClose).toHaveBeenCalledOnce();
    expect(localStorage.getItem('fertility_care_last_backup')).toBe(getTodayStr());
  });

  const upload = (files: File[]) => {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files } });
  };

  const confirmDialog = () => screen.getByRole('dialog', { name: /\?$/ });
  const withinConfirm = (name: string) => within(confirmDialog()).getByRole('button', { name });

  it('accepts any file in the file picker, so iOS does not grey out a .ftbackup file', () => {
    renderModal();
    expect(document.querySelector('input[type="file"]')).not.toHaveAttribute('accept');
  });

  it('restores a .ftbackup file and an old .json file, and checks the contents of both', async () => {
    const props = renderModal();
    upload([new File(['not json'], 'notes.ftbackup')]);
    expect(await screen.findByRole('alert')).toHaveTextContent(en.exportModal.importError);
    upload([new File([JSON.stringify(threeCycles)], 'fertility-tracker-backup.ftbackup')]);
    await waitFor(() => expect(props.onClose).toHaveBeenCalledOnce());
    expect(screen.getByTestId('count')).toHaveTextContent('6');
  });

  it('restores a backup file that the user opened with the app, after the same preview', async () => {
    const onClose = vi.fn();
    renderWithProviders(<Launcher onClose={onClose} />, { observations: threeCycles });
    expect(await screen.findByRole('alert')).toHaveTextContent(en.exportModal.importError);
    click('open another file');
    const dialog = await screen.findByRole('dialog', { name: en.confirmDialog.importTitle });
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: en.confirmDialog.importReplace }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('opens the hidden file input from the restore button', () => {
    renderModal();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {});
    click(en.actions.importJson);
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('restores a backup at once when there is no data', async () => {
    const props = renderModal();
    upload([new File([JSON.stringify(threeCycles)], 'backup.json')]);
    await waitFor(() => expect(props.onClose).toHaveBeenCalledOnce());
    expect(screen.getByTestId('count')).toHaveTextContent('6');
  });

  it('restores a backup in the versioned envelope', async () => {
    const props = renderModal();
    const envelope = JSON.stringify({ schemaVersion: 1, observations: threeCycles });
    upload([new File([envelope], 'backup.json')]);
    await waitFor(() => expect(props.onClose).toHaveBeenCalledOnce());
    expect(screen.getByTestId('count')).toHaveTextContent('6');
  });

  it('asks before a backup replaces existing data', async () => {
    const props = renderModal(threeCycles);
    upload([new File([JSON.stringify(threeCycles.slice(0, 2))], 'backup.json')]);
    await screen.findByRole('dialog', { name: en.confirmDialog.importTitle });
    expect(screen.getByTestId('count')).toHaveTextContent('6');
    fireEvent.click(withinConfirm(en.actions.cancel));
    expect(screen.queryByRole('dialog', { name: en.confirmDialog.importTitle })).toBeNull();
    expect(props.onClose).not.toHaveBeenCalled();

    upload([new File([JSON.stringify(threeCycles.slice(0, 2))], 'backup.json')]);
    fireEvent.click(
      within(await screen.findByRole('dialog', { name: en.confirmDialog.importTitle })).getByRole(
        'button',
        { name: en.confirmDialog.importReplace }
      )
    );
    expect(screen.getByTestId('count')).toHaveTextContent('2');
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('previews the file and merges it into the existing data', async () => {
    const props = renderModal(threeCycles);
    const file = [
      makeObservation({ date: '2026-09-12', stretch: '10', modifiers: ['K'] }),
      makeObservation({ date: '2026-09-20', stretch: '0' }),
    ];
    upload([new File([JSON.stringify(file)], 'backup.json')]);
    const dialog = await screen.findByRole('dialog', { name: en.confirmDialog.importTitle });
    expect(dialog).toHaveTextContent(
      en.confirmDialog.importSummary
        .replace('{count}', '2')
        .replace('{first}', '2026-09-12')
        .replace('{last}', '2026-09-20')
    );
    expect(dialog).toHaveTextContent(en.confirmDialog.importChoice.replace('{count}', '6'));
    fireEvent.click(within(dialog).getByRole('button', { name: en.confirmDialog.importMerge }));
    // The file replaces 2026-09-12 and adds 2026-09-20: 6 + 1 observations
    expect(screen.getByTestId('count')).toHaveTextContent('7');
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('previews a file with no observations, in French', async () => {
    renderWithProviders(<ExportModal onClose={vi.fn()} onPreparePrint={vi.fn()} />, {
      language: 'fr',
      observations: threeCycles,
    });
    upload([new File(['[]'], 'empty.json')]);
    const dialog = await screen.findByRole('dialog', { name: fr.confirmDialog.importTitle });
    expect(dialog).toHaveTextContent(fr.confirmDialog.importEmpty);
    expect(
      within(dialog).getByRole('button', { name: fr.confirmDialog.importMerge })
    ).toBeVisible();
  });

  it('shows a translated error for an invalid backup and ignores an empty selection', async () => {
    const alertSpy = vi.spyOn(window, 'alert');
    const props = renderModal(threeCycles);
    upload([]);
    upload([new File(['not json'], 'broken.json')]);
    expect(await screen.findByRole('alert')).toHaveTextContent(en.exportModal.importError);
    expect(alertSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('count')).toHaveTextContent('6');
    expect(props.onClose).not.toHaveBeenCalled();

    upload([new File([JSON.stringify(threeCycles)], 'backup.json')]);
    await screen.findByRole('dialog', { name: en.confirmDialog.importTitle });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the import error in French', async () => {
    renderWithProviders(<ExportModal onClose={vi.fn()} onPreparePrint={vi.fn()} />, {
      language: 'fr',
    });
    upload([new File(['{}'], 'broken.json')]);
    expect(await screen.findByRole('alert')).toHaveTextContent(fr.exportModal.importError);
  });

  it('loads the demo data at once when there is no data', () => {
    const props = renderModal();
    click(en.actions.loadDemo);
    expect(screen.getByTestId('count')).toHaveTextContent(
      String(buildDemoObservations('2026-09-30').length)
    );
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('asks before the demo data replaces existing data', () => {
    const props = renderModal(threeCycles);
    click(en.actions.loadDemo);
    expect(confirmDialog()).toHaveAccessibleName(en.confirmDialog.demoTitle);
    expect(confirmDialog()).toHaveAccessibleDescription(
      en.confirmDialog.demoMessage.replace('{count}', '6')
    );
    fireEvent.click(withinConfirm(en.actions.cancel));
    expect(screen.getByTestId('count')).toHaveTextContent('6');

    click(en.actions.loadDemo);
    fireEvent.click(withinConfirm(en.confirmDialog.demoConfirm));
    expect(screen.getByTestId('count')).toHaveTextContent(
      String(buildDemoObservations('2026-09-30').length)
    );
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('clears the data only after confirmation in the app dialog', () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    const props = renderModal(threeCycles);
    screen.getByRole('button', { name: en.actions.clearData }).focus();
    click(en.actions.clearData);
    expect(confirmDialog()).toHaveAccessibleName(en.confirmDialog.clearTitle);
    // The message tells that a copy stays and names the toast button that deletes it
    expect(confirmDialog()).toHaveAccessibleDescription(
      en.confirmDialog.clearMessage.replace('{count}', '6')
    );
    expect(en.confirmDialog.clearMessage).toContain(en.undoToast.dismiss);
    fireEvent.keyDown(withinConfirm(en.actions.cancel), { key: 'Escape' });
    expect(screen.getByTestId('count')).toHaveTextContent('6');
    expect(props.onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: en.actions.clearData })).toHaveFocus();

    click(en.actions.clearData);
    fireEvent.click(withinConfirm(en.confirmDialog.clearConfirm));
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('disables clearing when there is no data', () => {
    renderModal();
    expect(screen.getByRole('button', { name: en.actions.clearData })).toBeDisabled();
  });

  it('asks in French', () => {
    renderWithProviders(<ExportModal onClose={vi.fn()} onPreparePrint={vi.fn()} />, {
      language: 'fr',
      observations: threeCycles,
    });
    fireEvent.click(screen.getByRole('button', { name: fr.actions.clearData }));
    expect(screen.getByRole('dialog', { name: fr.confirmDialog.clearTitle })).toHaveTextContent(
      fr.undoToast.dismiss
    );
    expect(screen.getByRole('button', { name: fr.confirmDialog.clearConfirm })).toBeInTheDocument();
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
