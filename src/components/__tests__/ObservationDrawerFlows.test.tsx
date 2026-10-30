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
const flip = (name: string) => fireEvent.click(within(drawer()).getByRole('switch', { name }));
type Group = keyof typeof en.observationForm.groups;
/** Opens the row of the group when it is closed, then presses the chip of the code. */
const chip = (group: Group, code: string) => {
  const name = (en.codes[group] as Record<string, string>)[code] as string;
  if (
    !within(drawer()).queryByRole(
      group === 'modifiers' || group === 'symptoms' ? 'button' : 'radio',
      { name }
    )
  ) {
    press(new RegExp(`^${en.observationForm.groups[group]}`));
  }
  fireEvent.click(
    within(drawer()).getByRole(group === 'modifiers' || group === 'symptoms' ? 'button' : 'radio', {
      name,
    })
  );
};
/** The actions menu of a day with no saved observation has no Delete item. */
const expectNoDelete = () => {
  press(en.observationForm.actionsLabel);
  expect(screen.queryByRole('menuitem', { name: en.observationForm.deleteObservation })).toBeNull();
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
};
const openNotes = () => press(new RegExp(`^${en.observationForm.notes}`));
const deleteFromMenu = () => {
  press(en.observationForm.actionsLabel);
  fireEvent.click(screen.getByRole('menuitem', { name: en.observationForm.deleteObservation }));
};

/** A fake Vibration API. Each test removes it at the end. */
const installVibrate = () => {
  const vibrate = vi.fn(() => true);
  Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
  return vibrate;
};

describe('ObservationDrawer flows', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 15, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, 'vibrate');
  });

  it('vibrates briefly on the Peak Day button and on a save', () => {
    const vibrate = installVibrate();
    renderDrawer(null);
    chip('stretch', '10');
    flip(en.actions.setPeak);
    press(en.actions.save);
    expect(vibrate.mock.calls).toEqual([[10], [15]]);
  });

  it('logs a new observation for today with every selector', () => {
    renderDrawer(null);
    expect(within(drawer()).getByText(en.todayView.noObservation)).toBeInTheDocument();
    expect(drawer().querySelector('.stamp-empty')).toBeInTheDocument();
    chip('stretch', '10');
    chip('modifiers', 'K');
    chip('frequency', 'X3');
    chip('symptoms', 'AP');
    flip(en.codes.intercourse.I);
    flip(en.actions.setPeak);
    openNotes();
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
    flip(en.actions.setPeak);
    press(en.actions.save);
    expect(screen.getByTestId('peaks').textContent).toBe('2026-09-12:true');
  });

  it('clears a selection when it is pressed again', () => {
    renderDrawer(null);
    chip('bleeding', 'M');
    chip('bleeding', 'M');
    chip('stretch', '4');
    chip('stretch', '4');
    chip('frequency', 'AD');
    chip('frequency', 'AD');
    flip(en.actions.setPeak);
    flip(en.actions.setPeak);
    expect(within(drawer()).getByLabelText(en.labels.directInput)).toHaveValue('');
  });

  it('edits and deletes a saved observation', () => {
    const obs = makeObservation({ date: '2026-09-10', stretch: '0', codeString: '0' });
    renderDrawer(obs, [obs]);
    expect(within(drawer()).getByText('Edit Observation')).toBeInTheDocument();
    expect(within(drawer()).getByLabelText(en.labels.date)).toHaveValue('2026-09-10');
    deleteFromMenu();
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
    expect(within(drawer()).getByText('today note')).toBeInTheDocument();
    press(en.observationForm.actionsLabel);
    expect(
      screen.getByRole('menuitem', { name: en.observationForm.deleteObservation })
    ).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
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
    expectNoDelete();
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
    const capture = Element.prototype.setPointerCapture;
    vi.mocked(window.matchMedia).mockImplementation(
      query => ({ matches: true, media: query }) as MediaQueryList
    );
    Element.prototype.setPointerCapture = vi.fn();
    const box = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ height: 800 } as DOMRect);
    try {
      renderDrawer(null);
      const handle = drawer().querySelector('.sheet-handle') as HTMLElement;
      expect(handle).toHaveAttribute('aria-hidden', 'true');
      fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientY: 0 });
      fireEvent.pointerMove(handle, { pointerId: 1, clientY: 400 });
      fireEvent.pointerUp(handle, { pointerId: 1, clientY: 400 });
      expect(screen.queryByRole('dialog')).toBeNull();
    } finally {
      box.mockRestore();
      Element.prototype.setPointerCapture = capture;
      vi.mocked(window.matchMedia).mockImplementation(media as typeof window.matchMedia);
    }
  });

  it('treats a blank calendar day as a new entry on its date', () => {
    renderDrawer(makeObservation({ id: '', date: '2026-09-11' }));
    expect(within(drawer()).getByRole('heading')).toHaveTextContent(en.actions.newEntry);
    expectNoDelete();
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
    chip('bleeding', 'H');
    press(en.actions.save);
    fireEvent.click(screen.getByRole('button', { name: answer }));
    expect(saved()).toContain(`2026-09-15:H:${stored}`);
  });

  it('keeps the drawer open when the cycle question is cancelled', () => {
    renderDrawer(null, [makeObservation({ date: '2026-09-14', stretch: '0' })]);
    chip('bleeding', 'H');
    press(en.actions.save);
    const question = screen.getByRole('dialog', { name: en.cycleStartModal.title });
    fireEvent.click(within(question).getByRole('button', { name: en.cycleStartModal.cancelBtn }));
    expect(screen.queryByRole('dialog', { name: en.cycleStartModal.title })).toBeNull();
    expect(screen.getByRole('dialog', { name: /Observation/ })).toBeInTheDocument();
    expect(saved()).toBe('2026-09-14:0:undefined');
  });

  it('saves the cycle start toggle without asking', () => {
    renderDrawer(null, [makeObservation({ date: '2026-09-14', stretch: '0' })]);
    chip('bleeding', 'H');
    press(en.cycleStartModal.isCycleStartLabel);
    press(`${en.cycleStartModal.isCycleStartLabel} (Yes)`);
    press(`${en.cycleStartModal.isCycleStartLabel} (No)`);
    press(en.actions.save);
    expect(saved()).toContain('2026-09-15:H:true');
  });

  it('closes from the close button, cancel, the overlay and Escape only', () => {
    renderDrawer(null);
    fireEvent.keyDown(drawer(), { key: 'Enter' });
    fireEvent.click(within(drawer()).getByText(en.todayView.noObservation));
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
    chip('bleeding', 'H');
    within(drawer()).getByRole('button', { name: en.actions.save }).focus();
    press(en.actions.save);
    const question = screen.getByRole('dialog', { name: en.cycleStartModal.title });
    fireEvent.keyDown(within(question).getByRole('button', { name: 'Close' }), { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: en.cycleStartModal.title })).toBeNull();
    expect(drawer()).toBeInTheDocument();
    expect(within(drawer()).getByRole('button', { name: en.actions.save })).toHaveFocus();
  });

  it('copies the code of the day before the date of the sheet', () => {
    const before = makeObservation({ date: '2026-09-09', stretch: '6', codeString: '6' });
    renderDrawer(makeObservation({ id: '', date: '2026-09-10' }), [before]);
    press(en.observationForm.actionsLabel);
    fireEvent.click(
      screen.getByRole('menuitem', { name: new RegExp(en.observationForm.copyYesterday) })
    );
    expect(within(drawer()).getByLabelText(en.labels.directInput)).toHaveValue('6');
  });

  it('turns Direct Code Only on from the sheet menu', () => {
    renderDrawer(null);
    press(en.observationForm.actionsLabel);
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: en.todayView.modeDirect }));
    expect(within(drawer()).queryByRole('button', { name: /^Bleeding/ })).toBeNull();
    press(en.observationForm.actionsLabel);
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: en.todayView.modeDirect }));
    expect(within(drawer()).getByRole('button', { name: /^Bleeding/ })).toBeInTheDocument();
  });

  it('shows the cycle day of a day with no observation, and turns a later date into today', () => {
    renderDrawer(makeObservation({ id: '', date: '2026-09-12' }), [
      makeObservation({ date: '2026-09-10', bleeding: 'H' }),
    ]);
    expect(within(drawer()).getByText(/Day 3 ·/)).toBeInTheDocument();
    expect(within(drawer()).getByText(en.todayView.notLoggedStatus)).toBeInTheDocument();
    const field = within(drawer()).getByLabelText(en.labels.date);
    expect(field).toHaveAttribute('max', '2026-09-15');
    fireEvent.change(field, { target: { value: '2026-09-20' } });
    expect(field).toHaveValue('2026-09-15');
    expect(within(drawer()).getByText(/Day 6 ·/)).toBeInTheDocument();
  });

  it('still opens a saved observation after today, so it can be deleted', () => {
    const later = makeObservation({ id: 'later', date: '2026-09-20', bleeding: 'H' });
    renderDrawer(later, [makeObservation({ date: '2026-09-10', bleeding: 'H' }), later]);
    expect(within(drawer()).getByLabelText(en.labels.date)).toHaveValue('2026-09-20');
    expect(saved()).toContain('2026-09-20');
    deleteFromMenu();
    expect(saved()).not.toContain('2026-09-20');
  });

  it('saves a change to a saved observation after today', () => {
    const later = makeObservation({ id: 'later', date: '2026-09-20', bleeding: 'H' });
    renderDrawer(later, [makeObservation({ date: '2026-09-10', bleeding: 'H' }), later]);
    const field = within(drawer()).getByLabelText(en.labels.date);
    expect(field).not.toHaveAttribute('max');
    chip('stretch', '10');
    press(en.actions.save);
    expect(saved()).toMatch(/2026-09-20:[^|]*10/);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows no cycle day for a new day after today', () => {
    renderDrawer(makeObservation({ id: '', date: '2026-09-20' }), [
      makeObservation({ date: '2026-09-10', bleeding: 'H' }),
    ]);
    expect(within(drawer()).getByLabelText(en.labels.date)).toHaveValue('2026-09-20');
    expect(within(drawer()).queryByText(/Day \d+ ·/)).toBeNull();
  });

  it('shows the saved stamp of a day with no change, and the stamp of the form after a change', () => {
    const days = [
      makeObservation({ date: '2026-09-01', bleeding: 'H' }),
      makeObservation({ date: '2026-09-10', stretch: '10', modifiers: ['K'], isManualPeak: true }),
      makeObservation({ id: 'd11', date: '2026-09-11', stretch: '0', codeString: '0' }),
    ];
    renderDrawer(days[2] as Observation, days);
    // The day after the Peak Day is the first day of the count of three
    expect(drawer().querySelector('.stamp-light_green_baby_1')).toBeInTheDocument();
    fireEvent.change(within(drawer()).getByLabelText(en.labels.directInput), {
      target: { value: '2' },
    });
    expect(drawer().querySelector('.stamp-light_green_baby_1')).toBeNull();
  });

  it('saves with Ctrl+S while the sheet is on top', () => {
    renderDrawer(null);
    fireEvent.change(within(drawer()).getByLabelText(en.labels.directInput), {
      target: { value: '0' },
    });
    fireEvent.keyDown(window, { key: 's' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // The ⋮ menu over the sheet keeps the keys
    press(en.observationForm.actionsLabel);
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    expect(saved()).toBe('');
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'S', ctrlKey: true });
    expect(saved()).toBe('2026-09-15:0:undefined');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
