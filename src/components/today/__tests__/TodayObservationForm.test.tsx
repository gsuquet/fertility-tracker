import type { ComponentProps } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { TodayObservationForm } from '../TodayObservationForm';
import { renderWithProviders } from '../../../test/render';
import { en } from '../../../i18n';

type FormProps = ComponentProps<typeof TodayObservationForm>;

const renderForm = (overrides: Partial<FormProps> = {}) => {
  const props: FormProps = {
    entryMode: 'detailed',
    showDetailedOverride: false,
    onSetEntryMode: vi.fn(),
    onToggleDetailedOverride: vi.fn(),
    directInputText: '',
    onDirectTextChange: vi.fn(),
    intercourse: false,
    onIntercourseToggle: vi.fn(),
    onBleedingSelect: vi.fn(),
    onToggleCycleStart: vi.fn(),
    onStretchSelect: vi.fn(),
    modifiers: [],
    onToggleModifier: vi.fn(),
    onFrequencySelect: vi.fn(),
    symptoms: [],
    onToggleSymptom: vi.fn(),
    isManualPeak: false,
    onToggleManualPeak: vi.fn(),
    notes: '',
    onNotesChange: vi.fn(),
    hasUnsavedChanges: true,
    onSave: vi.fn(e => e.preventDefault()),
    ...overrides,
  };
  renderWithProviders(<TodayObservationForm {...props} />);
  return props;
};

const button = (name: string) => screen.getByRole('button', { name });
const cycleStartLabel = en.cycleStartModal.isCycleStartLabel;

describe('TodayObservationForm', () => {
  it('switches the entry mode', () => {
    const props = renderForm({ entryMode: 'direct' });
    fireEvent.click(screen.getByRole('radio', { name: /Detailed Form/ }));
    fireEvent.click(screen.getByRole('radio', { name: /Direct Code/ }));
    expect(vi.mocked(props.onSetEntryMode).mock.calls).toEqual([['detailed'], ['direct']]);
  });

  it('hides the detailed selectors in direct mode until they are expanded', () => {
    const props = renderForm({ entryMode: 'direct' });
    expect(screen.queryByRole('group', { name: en.labels.bleeding })).toBeNull();
    fireEvent.click(button(en.todayView.showDetailed));
    expect(props.onToggleDetailedOverride).toHaveBeenCalledOnce();
  });

  it('shows the detailed selectors in direct mode when expanded', () => {
    renderForm({ entryMode: 'direct', showDetailedOverride: true });
    expect(screen.getByRole('group', { name: en.labels.bleeding })).toBeInTheDocument();
    expect(button(en.todayView.hideDetailed)).toBeInTheDocument();
  });

  it('sends the direct code and the notes as the user types', () => {
    const props = renderForm();
    fireEvent.change(screen.getByLabelText(en.labels.directInput), { target: { value: '10KL' } });
    fireEvent.change(screen.getByLabelText(en.labels.notes), { target: { value: 'travel' } });
    expect(props.onDirectTextChange).toHaveBeenCalledWith('10KL');
    expect(props.onNotesChange).toHaveBeenCalledWith('travel');
  });

  it.each([false, true])('toggles intercourse when it is %s', intercourse => {
    const props = renderForm({ intercourse });
    const toggle = button(en.codes.intercourse.I);
    expect(toggle).toHaveAttribute('aria-pressed', String(intercourse));
    fireEvent.click(toggle);
    expect(props.onIntercourseToggle).toHaveBeenCalledOnce();
  });

  it('selects a bleeding code and clears the selected one', () => {
    const props = renderForm({ bleeding: 'H' });
    fireEvent.click(button(en.codes.bleeding.M));
    fireEvent.click(button(en.codes.bleeding.H));
    expect(vi.mocked(props.onBleedingSelect).mock.calls).toEqual([['M'], [undefined]]);
  });

  it('hides the cycle start toggle without bleeding', () => {
    renderForm();
    expect(screen.queryByText(cycleStartLabel)).toBeNull();
  });

  it.each([
    [undefined, ''],
    [true, ' (Yes)'],
    [false, ' (No)'],
  ])('labels the cycle start toggle when it is %s', (isCycleStart, suffix) => {
    const props = renderForm({ bleeding: 'H', isCycleStart });
    const toggle = button(`${cycleStartLabel}${suffix}`);
    expect(toggle).toHaveAttribute('aria-pressed', String(isCycleStart === true));
    // The colors come from the stylesheet tokens, not from inline styles
    expect(toggle).toHaveClass('cycle-start-toggle-btn');
    expect(toggle.classList.contains('active')).toBe(isCycleStart === true);
    expect(toggle).not.toHaveAttribute('style');
    fireEvent.click(toggle);
    expect(props.onToggleCycleStart).toHaveBeenCalledOnce();
  });

  it('selects a stretch and clears the selected one', () => {
    const props = renderForm({ stretch: '10' });
    fireEvent.click(button(en.codes.stretch['2']));
    fireEvent.click(button(en.codes.stretch['10']));
    expect(vi.mocked(props.onStretchSelect).mock.calls).toEqual([['2'], [undefined]]);
  });

  it('toggles modifiers and symptoms', () => {
    const props = renderForm({ modifiers: ['K'], symptoms: ['AP'] });
    expect(button(en.codes.modifiers.K)).toHaveAttribute('aria-pressed', 'true');
    expect(button(en.codes.symptoms.AP)).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(button(en.codes.modifiers.L));
    fireEvent.click(button(en.codes.symptoms.RAP));
    expect(props.onToggleModifier).toHaveBeenCalledWith('L');
    expect(props.onToggleSymptom).toHaveBeenCalledWith('RAP');
  });

  it('selects a frequency and clears the selected one', () => {
    const props = renderForm({ frequency: 'X1' });
    fireEvent.click(button(en.codes.frequency.AD));
    fireEvent.click(button(en.codes.frequency.X1));
    expect(vi.mocked(props.onFrequencySelect).mock.calls).toEqual([['AD'], [undefined]]);
  });

  it.each([
    [false, en.actions.setPeak],
    [true, en.actions.removePeak],
  ])('toggles the peak flag when it is %s', (isManualPeak, label) => {
    const props = renderForm({ isManualPeak });
    fireEvent.click(button(label));
    expect(props.onToggleManualPeak).toHaveBeenCalledOnce();
  });

  it('saves a new observation without a delete button', () => {
    const props = renderForm();
    expect(screen.queryByRole('button', { name: en.actions.delete })).toBeNull();
    fireEvent.click(button(en.actions.save));
    expect(props.onSave).toHaveBeenCalledOnce();
  });

  it('deletes an existing observation and shows it as saved', () => {
    const onDelete = vi.fn();
    renderForm({ onDelete, hasUnsavedChanges: false });
    expect(button('Saved')).toBeDisabled();
    fireEvent.click(button(en.actions.delete));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('disables saving a blank new observation', () => {
    renderForm({ hasUnsavedChanges: false });
    expect(button(en.actions.save)).toBeDisabled();
  });
});
