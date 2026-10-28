import { screen, fireEvent, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { ObservationDrawer } from '../ObservationDrawer';
import { useCycleData, useCycleUi } from '../../context/CycleContext';
import { renderWithProviders } from '../../test/render';
import { makeObservation } from '../../test/factories';
import { en } from '../../i18n';
import type { Observation } from '../../types/crms';

const Controls = ({ toOpen }: { toOpen: Observation | null }) => {
  const { observations, clearAllData, undoLastChange } = useCycleData();
  const { setIsDrawerOpen, setSelectedObservation, selectedObservation } = useCycleUi();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSelectedObservation(toOpen);
          setIsDrawerOpen(true);
        }}
      >
        open
      </button>
      <button type="button" onClick={clearAllData}>
        clear
      </button>
      <button type="button" onClick={undoLastChange}>
        undo
      </button>
      <span data-testid="saved">
        {observations.map(o => `${o.date}:${o.codeString}:${String(o.isCycleStart)}`).join('|')}
      </span>
      <span data-testid="peaks">
        {observations
          .filter(o => o.isPeakDay)
          .map(o => `${o.date}:${String(o.isManualPeak)}`)
          .join('|')}
      </span>
      <span data-testid="selection">{selectedObservation?.date ?? 'none'}</span>
    </>
  );
};

const renderDrawer = (toOpen: Observation | null, observations: Observation[] = []) => {
  renderWithProviders(
    <>
      <ObservationDrawer />
      <Controls toOpen={toOpen} />
    </>,
    { observations }
  );
  fireEvent.click(screen.getByRole('button', { name: 'open' }));
};

const drawer = () => screen.getByRole('dialog', { name: /Observation/ });
const saved = () => screen.getByTestId('saved').textContent;
const press = (name: string | RegExp) =>
  fireEvent.click(within(drawer()).getByRole('button', { name }));

describe('ObservationDrawer flows', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 15, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('logs a new observation for today with every selector', () => {
    renderDrawer(null);
    expect(within(drawer()).getByText('---')).toBeInTheDocument();
    press(en.codes.stretch['10']);
    press(en.codes.modifiers.K);
    press(en.codes.frequency.X3);
    press(en.codes.symptoms.AP);
    press(en.codes.intercourse.I);
    press(en.actions.setPeak);
    fireEvent.change(within(drawer()).getByLabelText(en.labels.notes), {
      target: { value: 'note' },
    });
    expect(within(drawer()).getByLabelText(en.labels.directInput)).toHaveValue('10KX3 I AP');
    press(en.actions.save);
    expect(saved()).toBe('2026-09-15:10KX3 I AP:undefined');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('moves the Peak Day when Set Peak is saved on another day of the cycle', () => {
    const p10 = makeObservation({
      id: 'p10',
      date: '2026-09-10',
      stretch: '10',
      modifiers: ['K'],
      isManualPeak: true,
    });
    const d12 = makeObservation({ id: 'd12', date: '2026-09-12', stretch: '10', modifiers: ['K'] });
    renderDrawer(d12, [makeObservation({ date: '2026-09-01', bleeding: 'H' }), p10, d12]);
    expect(screen.getByTestId('peaks')).toHaveTextContent('2026-09-10:true');
    press(en.actions.setPeak);
    press(en.actions.save);
    expect(screen.getByTestId('peaks').textContent).toBe('2026-09-12:true');
  });

  it('clears a selection when it is pressed again', () => {
    renderDrawer(null);
    press(en.codes.bleeding.M);
    press(en.codes.bleeding.M);
    press(en.codes.stretch['4']);
    press(en.codes.stretch['4']);
    press(en.codes.frequency.AD);
    press(en.codes.frequency.AD);
    press(en.actions.setPeak);
    press(en.actions.removePeak);
    expect(within(drawer()).getByLabelText(en.labels.directInput)).toHaveValue('');
  });

  it('edits and deletes a saved observation', () => {
    const obs = makeObservation({ date: '2026-09-10', stretch: '0', codeString: '0' });
    renderDrawer(obs, [obs]);
    expect(within(drawer()).getByText('Edit Observation')).toBeInTheDocument();
    expect(within(drawer()).getByLabelText(en.labels.date)).toHaveValue('2026-09-10');
    press(en.actions.delete);
    expect(saved()).toBe('');
    expect(screen.getByTestId('selection')).toHaveTextContent('none');
  });

  it('opens the saved observation of today when nothing is selected', () => {
    const today = makeObservation({
      id: 'today',
      date: '2026-09-15',
      stretch: '10',
      modifiers: ['K', 'L'],
      codeString: '10KL',
      notes: 'today note',
    });
    renderDrawer(null, [today]);
    expect(within(drawer()).getByRole('heading')).toHaveTextContent(en.drawer.editTitle);
    expect(within(drawer()).getByLabelText(en.labels.directInput)).toHaveValue('10KL');
    expect(within(drawer()).getByLabelText(en.labels.notes)).toHaveValue('today note');
    expect(within(drawer()).getByRole('button', { name: en.actions.delete })).toBeInTheDocument();
    // A save with no change keeps the saved values
    press(en.actions.save);
    expect(saved()).toBe('2026-09-15:10KL:undefined');
  });

  it('loads the saved observation of a date that the user picks', () => {
    const saved10 = makeObservation({ date: '2026-09-10', stretch: '0', codeString: '0' });
    renderDrawer(null, [saved10]);
    const dateInput = within(drawer()).getByLabelText(en.labels.date);
    fireEvent.change(dateInput, { target: { value: '2026-09-10' } });
    expect(within(drawer()).getByRole('heading')).toHaveTextContent(en.drawer.editTitle);
    expect(within(drawer()).getByLabelText(en.labels.directInput)).toHaveValue('0');

    // A date with no observation does not copy the values of the saved day
    fireEvent.change(dateInput, { target: { value: '2026-09-11' } });
    expect(within(drawer()).getByRole('heading')).toHaveTextContent(en.actions.newEntry);
    expect(within(drawer()).getByLabelText(en.labels.directInput)).toHaveValue('');
    expect(within(drawer()).queryByRole('button', { name: en.actions.delete })).toBeNull();
  });

  it('keeps a changed draft when the date moves from a saved day to an empty day', () => {
    const saved10 = makeObservation({ date: '2026-09-10', stretch: '0', codeString: '0' });
    renderDrawer(saved10, [saved10]);
    fireEvent.change(within(drawer()).getByLabelText(en.labels.directInput), {
      target: { value: '10KL' },
    });
    fireEvent.change(within(drawer()).getByLabelText(en.labels.date), {
      target: { value: '2026-09-11' },
    });
    expect(within(drawer()).getByRole('heading')).toHaveTextContent(en.actions.newEntry);
    expect(within(drawer()).getByLabelText(en.labels.directInput)).toHaveValue('10KL');
  });

  it('shows the saved values that Undo brings back while the form is not changed', () => {
    const today = makeObservation({
      date: '2026-09-15',
      stretch: '10',
      modifiers: ['K', 'L'],
      codeString: '10KL',
    });
    renderDrawer(null, [today]);
    press(en.actions.cancel);
    fireEvent.click(screen.getByRole('button', { name: 'clear' }));
    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    expect(within(drawer()).getByRole('heading')).toHaveTextContent(en.actions.newEntry);

    fireEvent.click(screen.getByRole('button', { name: 'undo' }));
    expect(within(drawer()).getByRole('heading')).toHaveTextContent(en.drawer.editTitle);
    expect(within(drawer()).getByLabelText(en.labels.directInput)).toHaveValue('10KL');
    press(en.actions.save);
    expect(saved()).toBe('2026-09-15:10KL:undefined');
  });

  it('keeps a changed draft when the saved data changes', () => {
    const today = makeObservation({ date: '2026-09-15', stretch: '0', codeString: '0' });
    renderDrawer(null, [today]);
    fireEvent.change(within(drawer()).getByLabelText(en.labels.directInput), {
      target: { value: '10KL' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'clear' }));
    expect(within(drawer()).getByRole('heading')).toHaveTextContent(en.actions.newEntry);
    expect(within(drawer()).getByLabelText(en.labels.directInput)).toHaveValue('10KL');
  });

  it('closes on a phone after a long drag down on the handle', () => {
    // A phone width, with reduced motion so that the sheet closes at once
    const media = vi.mocked(window.matchMedia).getMockImplementation();
    vi.mocked(window.matchMedia).mockImplementation(
      query => ({ matches: true, media: query }) as MediaQueryList
    );
    Element.prototype.setPointerCapture = vi.fn();
    const box = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ height: 800 } as DOMRect);
    renderDrawer(null);
    const handle = drawer().querySelector('.sheet-handle') as HTMLElement;
    expect(handle).toHaveAttribute('aria-hidden', 'true');
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientY: 0 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 400 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 400 });
    expect(screen.queryByRole('dialog')).toBeNull();
    box.mockRestore();
    vi.mocked(window.matchMedia).mockImplementation(media as typeof window.matchMedia);
  });

  it('treats a blank calendar day as a new entry on its date', () => {
    renderDrawer(makeObservation({ id: '', date: '2026-09-11' }));
    expect(within(drawer()).getByRole('heading')).toHaveTextContent(en.actions.newEntry);
    expect(within(drawer()).queryByRole('button', { name: en.actions.delete })).toBeNull();
    fireEvent.change(within(drawer()).getByLabelText(en.labels.directInput), {
      target: { value: '0' },
    });
    fireEvent.change(within(drawer()).getByLabelText(en.labels.date), {
      target: { value: '2026-09-12' },
    });
    press(en.actions.save);
    expect(saved()).toBe('2026-09-12:0:undefined');
  });

  it.each([
    [/Yes, Start New Cycle/, 'true'],
    [/No, Continue Current Cycle/, 'false'],
  ])('asks about a new cycle on the first bleeding day: %s', (answer, stored) => {
    renderDrawer(null, [makeObservation({ date: '2026-09-14', stretch: '0' })]);
    press(en.codes.bleeding.H);
    press(en.actions.save);
    fireEvent.click(screen.getByRole('button', { name: answer }));
    expect(saved()).toContain(`2026-09-15:H:${stored}`);
  });

  it('keeps the drawer open when the cycle question is cancelled', () => {
    renderDrawer(null, [makeObservation({ date: '2026-09-14', stretch: '0' })]);
    press(en.codes.bleeding.H);
    press(en.actions.save);
    const question = screen.getByRole('dialog', { name: en.cycleStartModal.title });
    fireEvent.click(within(question).getByRole('button', { name: en.cycleStartModal.cancelBtn }));
    expect(screen.queryByRole('dialog', { name: en.cycleStartModal.title })).toBeNull();
    expect(screen.getByRole('dialog', { name: /Observation/ })).toBeInTheDocument();
    expect(saved()).toBe('2026-09-14:0:undefined');
  });

  it('saves the cycle start toggle without asking', () => {
    renderDrawer(null, [makeObservation({ date: '2026-09-14', stretch: '0' })]);
    press(en.codes.bleeding.H);
    press(en.cycleStartModal.isCycleStartLabel);
    press(`${en.cycleStartModal.isCycleStartLabel} (Yes)`);
    press(`${en.cycleStartModal.isCycleStartLabel} (No)`);
    press(en.actions.save);
    expect(saved()).toContain('2026-09-15:H:true');
  });

  it('closes from the close button, cancel, the overlay and Escape only', () => {
    renderDrawer(null);
    fireEvent.keyDown(drawer(), { key: 'Enter' });
    fireEvent.click(within(drawer()).getByText(en.labels.stampPreview));
    expect(drawer()).toBeInTheDocument();

    press('Close entry panel');
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    press(en.actions.cancel);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    fireEvent.click(drawer());
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('is a native modal dialog that takes the focus and gives it back to the opener', () => {
    renderDrawer(null);
    expect(drawer().tagName).toBe('DIALOG');
    expect(drawer()).toHaveAttribute('aria-modal', 'true');
    expect(within(drawer()).getByRole('button', { name: 'Close entry panel' })).toHaveFocus();
    press('Close entry panel');

    const opener = screen.getByRole('button', { name: 'open' });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    expect(opener).toHaveFocus();
  });

  it('closes only the cycle question on Escape, and gives the focus back to Save', () => {
    renderDrawer(null, [makeObservation({ date: '2026-09-14', stretch: '0' })]);
    press(en.codes.bleeding.H);
    within(drawer()).getByRole('button', { name: en.actions.save }).focus();
    press(en.actions.save);
    const question = screen.getByRole('dialog', { name: en.cycleStartModal.title });
    fireEvent.keyDown(within(question).getByRole('button', { name: 'Close' }), { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: en.cycleStartModal.title })).toBeNull();
    expect(drawer()).toBeInTheDocument();
    expect(within(drawer()).getByRole('button', { name: en.actions.save })).toHaveFocus();
  });
});
