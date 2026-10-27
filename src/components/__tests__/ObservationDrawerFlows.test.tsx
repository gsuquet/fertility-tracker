import { screen, fireEvent, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { ObservationDrawer } from '../ObservationDrawer';
import { useCycleData, useCycleUi } from '../../context/CycleContext';
import { renderWithProviders } from '../../test/render';
import { makeObservation } from '../../test/factories';
import { en } from '../../i18n';
import type { Observation } from '../../types/crms';

const Controls = ({ toOpen }: { toOpen: Observation | null }) => {
  const { observations } = useCycleData();
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
      <span data-testid="saved">
        {observations.map(o => `${o.date}:${o.codeString}:${String(o.isCycleStart)}`).join('|')}
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
    fireEvent.keyDown(document, { key: 'Enter' });
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
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
