import { screen, fireEvent, act, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { TodayView } from '../TodayView';
import { useCycleData, useCycleUi } from '../../context/CycleContext';
import { renderWithProviders } from '../../test/render';
import { makeObservation } from '../../test/factories';
import { en, formatMessage } from '../../i18n';
import type { Observation } from '../../types/crms';

// Today is 2026-09-15 in these tests
const TODAY = '2026-09-15';

const Probe = () => {
  const { observations } = useCycleData();
  const { setSelectedObservation } = useCycleUi();
  return (
    <>
      <span data-testid="saved">
        {observations.map(o => `${o.date}:${o.codeString}:${String(o.isCycleStart)}`).join('|')}
      </span>
      <button
        type="button"
        onClick={() => setSelectedObservation(makeObservation({ date: '2026-09-10' }))}
      >
        select external
      </button>
      <button
        type="button"
        onClick={() => setSelectedObservation(makeObservation({ date: '2026-09-20' }))}
      >
        select future
      </button>
    </>
  );
};

const renderToday = (observations?: Observation[]) =>
  renderWithProviders(
    <>
      <TodayView />
      <Probe />
    </>,
    observations ? { observations } : {}
  );

const typeCode = (code: string) =>
  fireEvent.change(screen.getByLabelText(en.labels.directInput), { target: { value: code } });
const saveButton = () =>
  screen.getByRole('button', { name: new RegExp(`${en.actions.save}|Saved`) });
const saved = () => screen.getByTestId('saved').textContent;
const openMenu = () =>
  fireEvent.click(screen.getAllByRole('button', { name: en.observationForm.actionsLabel })[0]!);

/** A fake Vibration API. Each test removes it at the end. */
const installVibrate = () => {
  const vibrate = vi.fn(() => true);
  Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
  return vibrate;
};

describe('TodayView flows', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout'] });
    vi.setSystemTime(new Date(2026, 8, 15, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, 'vibrate');
  });

  it('vibrates briefly on the Peak Day button and on a save', () => {
    const vibrate = installVibrate();
    renderToday();
    typeCode('10kl');
    fireEvent.click(screen.getByRole('switch', { name: en.actions.setPeak }));
    expect(vibrate.mock.calls).toEqual([[10]]);
    fireEvent.click(saveButton());
    expect(vibrate.mock.calls).toEqual([[10], [15]]);
  });

  it('saves a new observation and hides the toast later', () => {
    renderToday();
    expect(saveButton()).toBeDisabled();
    typeCode('0ad');
    fireEvent.click(saveButton());
    expect(saved()).toBe(`${TODAY}:0AD:undefined`);
    expect(screen.getByRole('status')).toHaveTextContent(en.todayView.savedNotice);
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('cancels the toast timer when the view unmounts', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    const { unmount } = renderToday();
    typeCode('0ad');
    fireEvent.click(saveButton());
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('shows the empty stamp and the cycle day of a day with no observation', () => {
    const { container } = renderToday([makeObservation({ date: '2026-09-10', bleeding: 'H' })]);
    expect(screen.getByText('Day 6')).toBeInTheDocument();
    const hero = container.querySelector('.status-stamp-hero') as HTMLElement;
    expect(within(hero).getByText(en.todayView.noObservation)).toBeInTheDocument();
    expect(screen.queryByText(en.todayView.guidance.dry)).toBeNull();
    expect(hero.querySelector('.stamp-empty')).toBeInTheDocument();
  });

  it('keeps the empty stamp for a day with only the intercourse mark', () => {
    const { container } = renderToday();
    typeCode('I');
    const hero = container.querySelector('.status-stamp-hero') as HTMLElement;
    expect(hero.querySelector('.stamp-empty')).toBeInTheDocument();
    expect(within(hero).getByText(en.todayView.noObservation)).toBeInTheDocument();
    expect(screen.queryByText(/Infertile/)).toBeNull();
  });

  it('moves the focus to the previous day when the next day becomes disabled', () => {
    renderToday();
    const prev = screen.getByRole('button', { name: en.todayView.prevDay });
    const next = screen.getByRole('button', { name: en.todayView.nextDay });
    fireEvent.click(prev);
    next.focus();
    fireEvent.click(next);
    expect(next).toBeDisabled();
    expect(document.activeElement).toBe(prev);
    // A click on Jump to Today does not move the focus to the arrows
    fireEvent.click(prev);
    const jump = screen.getByRole('button', { name: en.todayView.goToToday });
    jump.focus();
    fireEvent.click(jump);
    expect(document.activeElement).not.toBe(prev);
  });

  it('never goes after today', () => {
    renderToday();
    const date = screen.getByLabelText(en.labels.date);
    expect(date).toHaveAttribute('max', TODAY);
    expect(screen.getByRole('button', { name: en.todayView.nextDay })).toBeDisabled();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(date).toHaveValue(TODAY);
    fireEvent.change(date, { target: { value: '2026-09-18' } });
    expect(date).toHaveValue(TODAY);
    fireEvent.click(screen.getByRole('button', { name: 'select future' }));
    expect(date).toHaveValue(TODAY);
    fireEvent.change(date, { target: { value: '2026-09-12' } });
    expect(date).toHaveValue('2026-09-12');
    expect(screen.getByRole('button', { name: en.todayView.nextDay })).toBeEnabled();
  });

  it('loads a saved observation and shows it as saved', () => {
    renderToday([makeObservation({ date: TODAY, stretch: '0', frequency: 'AD' })]);
    expect(screen.getByLabelText(en.labels.directInput)).toHaveValue('0AD');
    expect(saveButton()).toHaveTextContent('Saved');
    // The Saved button is green, the Save button keeps the accent fill
    expect(saveButton()).toHaveClass('is-saved');
    typeCode('0AD I');
    expect(saveButton()).not.toHaveClass('is-saved');
    fireEvent.click(saveButton());
    expect(saved()).toBe(`${TODAY}:0AD I:undefined`);
  });

  it('deletes a saved observation', () => {
    renderToday([makeObservation({ date: TODAY, stretch: '0' })]);
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: en.observationForm.deleteObservation }));
    expect(saved()).toBe('');
    expect(screen.getByRole('status')).toHaveTextContent(en.todayView.deletedNotice);
  });

  it.each([
    [/Yes, Start New Cycle/, 'true'],
    [/No, Continue Current Cycle/, 'false'],
  ])('asks about a new cycle on the first bleeding day: %s', (answer, stored) => {
    renderToday([makeObservation({ date: '2026-09-14', stretch: '0' })]);
    typeCode('H');
    fireEvent.click(saveButton());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: answer }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(saved()).toContain(`${TODAY}:H:${stored}`);
  });

  it('vibrates once on a save after the cycle question, and not on Cancel', () => {
    const vibrate = installVibrate();
    renderToday([makeObservation({ date: '2026-09-14', stretch: '0' })]);
    typeCode('H');
    fireEvent.click(saveButton());
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(vibrate).not.toHaveBeenCalled();
    fireEvent.click(saveButton());
    fireEvent.click(screen.getByRole('button', { name: /Yes, Start New Cycle/ }));
    expect(vibrate.mock.calls).toEqual([[15]]);
  });

  it('saves nothing when the cycle question is cancelled', () => {
    renderToday([makeObservation({ date: '2026-09-14', stretch: '0' })]);
    typeCode('H');
    fireEvent.click(saveButton());
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(saved()).toBe('2026-09-14:0:undefined');
  });

  it('navigates days, jumps back to today and picks a date from history', () => {
    renderToday();
    fireEvent.click(screen.getByRole('button', { name: en.todayView.prevDay }));
    fireEvent.click(screen.getByRole('button', { name: en.todayView.goToToday }));
    expect(screen.getByText(en.todayView.todayLabel, { selector: '.badge' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(en.labels.date), { target: { value: '2026-09-01' } });
    expect(screen.getByLabelText(en.labels.date)).toHaveValue('2026-09-01');
  });

  it('follows an observation selected elsewhere in the app', () => {
    renderToday();
    fireEvent.click(screen.getByRole('button', { name: 'select external' }));
    expect(screen.getByLabelText(en.labels.date)).toHaveValue('2026-09-10');
  });

  it('remembers Direct Code Only and hides the group rows', () => {
    const { unmount } = renderToday();
    openMenu();
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: en.todayView.modeDirect }));
    expect(
      screen.queryByRole('button', { name: new RegExp(`^${en.observationForm.groups.stretch}`) })
    ).toBeNull();
    unmount();

    renderToday();
    openMenu();
    expect(screen.getByRole('menuitemcheckbox', { name: en.todayView.modeDirect })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: en.todayView.modeDirect }));
    expect(
      screen.getByRole('button', { name: new RegExp(`^${en.observationForm.groups.stretch}`) })
    ).toBeInTheDocument();
  });

  it('copies the code of yesterday, without the intercourse mark and the notes', () => {
    renderToday([
      makeObservation({
        date: '2026-09-14',
        stretch: '10',
        modifiers: ['K'],
        intercourse: true,
        notes: 'n',
      }),
    ]);
    openMenu();
    const copy = screen.getByRole('menuitem', {
      name: new RegExp(en.observationForm.copyYesterday),
    });
    expect(copy).toHaveTextContent('10K');
    fireEvent.click(copy);
    expect(screen.getByLabelText(en.labels.directInput)).toHaveValue('10K');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('disables Copy yesterday when yesterday has no observation', () => {
    renderToday();
    openMenu();
    expect(screen.getByRole('menuitem', { name: en.observationForm.copyYesterday })).toBeDisabled();
  });

  it('saves with Ctrl+S and with Cmd+S, and not while a dialog is open', () => {
    renderToday();
    // With no change, Ctrl+S saves nothing
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    expect(saved()).toBe('');
    typeCode('0');
    openMenu();
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    expect(saved()).toBe('');
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    fireEvent.keyDown(window, { key: 's' });
    expect(saved()).toBe('');
    fireEvent.keyDown(window, { key: 's', metaKey: true });
    expect(saved()).toBe(`${TODAY}:0:undefined`);
  });

  it.each([
    [-1, en.todayView.yesterday],
    [-3, formatMessage(en.todayView.daysAgo, { count: 3 })],
  ])('names a day %i days from today', (offset, label) => {
    renderToday();
    for (let i = 0; i < -offset; i++)
      fireEvent.click(screen.getByRole('button', { name: en.todayView.prevDay }));
    expect(screen.getByText(label, { selector: '.badge' })).toBeInTheDocument();
  });
});
