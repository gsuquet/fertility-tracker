import { screen, fireEvent, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { TodayView } from '../TodayView';
import { useCycleData, useCycleUi } from '../../context/CycleContext';
import { renderWithProviders } from '../../test/render';
import { makeObservation } from '../../test/factories';
import { en } from '../../i18n';
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
    fireEvent.click(screen.getByRole('button', { name: en.actions.setPeak }));
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
    expect(screen.getAllByText(en.todayView.noObservation).length).toBeGreaterThan(0);
    expect(screen.queryByText(en.todayView.guidance.dry)).toBeNull();
    expect(container.querySelector('.status-stamp-hero .stamp-empty')).toBeInTheDocument();
  });

  it('loads a saved observation and shows it as saved', () => {
    renderToday([makeObservation({ date: TODAY, stretch: '0', frequency: 'AD' })]);
    expect(screen.getByLabelText(en.labels.directInput)).toHaveValue('0AD');
    expect(saveButton()).toHaveTextContent('Saved');
    typeCode('0AD I');
    fireEvent.click(saveButton());
    expect(saved()).toBe(`${TODAY}:0AD I:undefined`);
  });

  it('deletes a saved observation', () => {
    renderToday([makeObservation({ date: TODAY, stretch: '0' })]);
    fireEvent.click(screen.getByRole('button', { name: en.actions.delete }));
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

  it('remembers the direct entry mode and toggles the detailed selectors', () => {
    const { unmount } = renderToday();
    fireEvent.click(screen.getByRole('radio', { name: /Direct Code/ }));
    fireEvent.click(screen.getByRole('button', { name: en.todayView.showDetailed }));
    expect(screen.getByRole('button', { name: en.todayView.hideDetailed })).toBeInTheDocument();
    unmount();

    renderToday();
    expect(screen.getByRole('radio', { name: /Direct Code/ })).toBeChecked();
  });
});
