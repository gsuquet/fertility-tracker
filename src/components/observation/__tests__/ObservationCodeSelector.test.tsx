import type { ComponentProps } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { ObservationCodeSelector } from '../ObservationCodeSelector';
import { renderWithProviders } from '../../../test/render';
import { en } from '../../../i18n';
import {
  BLEEDING_CODES,
  FREQUENCY_CODES,
  MODIFIER_CODES,
  STRETCH_CODES,
  SYMPTOM_CODES,
} from '../../../types/crms';

type SelectorProps = ComponentProps<typeof ObservationCodeSelector>;

const renderSelector = (fields: Partial<SelectorProps['fields']> = {}) => {
  const actions: SelectorProps['actions'] = {
    selectBleeding: vi.fn(),
    toggleCycleStart: vi.fn(),
    selectStretch: vi.fn(),
    toggleModifier: vi.fn(),
    selectFrequency: vi.fn(),
    toggleSymptom: vi.fn(),
  };
  renderWithProviders(
    <ObservationCodeSelector
      fields={{ modifiers: [], symptoms: [], ...fields }}
      actions={actions}
    />
  );
  return actions;
};

const group = (name: string) => screen.getByRole('group', { name });
const option = (groupName: string, name: string) =>
  within(group(groupName)).getByRole('button', { name });
const cycleStartLabel = en.cycleStartModal.isCycleStartLabel;

describe('ObservationCodeSelector', () => {
  it('renders one button for each code, in the sequence of the shared code lists', () => {
    renderSelector();
    const labels = (name: string) =>
      within(group(name))
        .getAllByRole('button')
        .map(b => b.textContent);
    expect(labels(en.labels.bleeding)).toEqual(BLEEDING_CODES.map(c => en.codes.bleeding[c]));
    expect(labels(en.labels.stretch)).toEqual(STRETCH_CODES.map(c => en.codes.stretch[c]));
    expect(labels(en.labels.modifiers)).toEqual(MODIFIER_CODES.map(c => en.codes.modifiers[c]));
    expect(labels(en.labels.frequency)).toEqual(FREQUENCY_CODES.map(c => en.codes.frequency[c]));
    expect(labels(en.labels.symptoms)).toEqual(SYMPTOM_CODES.map(c => en.codes.symptoms[c]));
  });

  it('names each group with the legend of a native fieldset', () => {
    renderSelector();
    for (const name of [
      en.labels.bleeding,
      en.labels.stretch,
      en.labels.modifiers,
      en.labels.frequency,
      en.labels.symptoms,
    ]) {
      expect(group(name).tagName).toBe('FIELDSET');
      expect(within(group(name)).getByText(name).tagName).toBe('LEGEND');
    }
  });

  it('marks the selected codes as pressed, with the class of their group', () => {
    renderSelector({
      bleeding: 'H',
      stretch: '10',
      modifiers: ['C'],
      frequency: 'X3',
      symptoms: ['AP'],
    });
    const cases: [string, string, string][] = [
      [en.labels.bleeding, en.codes.bleeding.H, 'bleeding'],
      [en.labels.stretch, en.codes.stretch['10'], 'stretch'],
      [en.labels.modifiers, en.codes.modifiers.C, 'modifier'],
      [en.labels.frequency, en.codes.frequency.X3, 'frequency'],
      [en.labels.symptoms, en.codes.symptoms.AP, 'symptom'],
    ];
    for (const [groupName, name, cls] of cases) {
      const btn = option(groupName, name);
      expect(btn).toHaveAttribute('aria-pressed', 'true');
      expect(btn).toHaveClass('option-btn', 'active', cls);
    }
    expect(option(en.labels.bleeding, en.codes.bleeding.M)).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('selects a code, and clears it on a second press', () => {
    const actions = renderSelector({ bleeding: 'H', stretch: '10', frequency: 'X3' });
    fireEvent.click(option(en.labels.bleeding, en.codes.bleeding.M));
    fireEvent.click(option(en.labels.bleeding, en.codes.bleeding.H));
    fireEvent.click(option(en.labels.stretch, en.codes.stretch['6']));
    fireEvent.click(option(en.labels.stretch, en.codes.stretch['10']));
    fireEvent.click(option(en.labels.frequency, en.codes.frequency.X1));
    fireEvent.click(option(en.labels.frequency, en.codes.frequency.X3));
    expect(vi.mocked(actions.selectBleeding).mock.calls).toEqual([['M'], [undefined]]);
    expect(vi.mocked(actions.selectStretch).mock.calls).toEqual([['6'], [undefined]]);
    expect(vi.mocked(actions.selectFrequency).mock.calls).toEqual([['X1'], [undefined]]);
  });

  it('toggles the modifiers and the symptoms', () => {
    const actions = renderSelector();
    fireEvent.click(option(en.labels.modifiers, en.codes.modifiers.L));
    fireEvent.click(option(en.labels.symptoms, en.codes.symptoms.AP));
    expect(actions.toggleModifier).toHaveBeenCalledWith('L');
    expect(actions.toggleSymptom).toHaveBeenCalledWith('AP');
  });

  it('shows the cycle start toggle only when a bleeding code is selected', () => {
    renderSelector();
    expect(screen.queryByRole('button', { name: new RegExp(cycleStartLabel) })).toBeNull();
  });

  it.each([
    [undefined, '', 'false'],
    [true, ' (Yes)', 'true'],
    [false, ' (No)', 'false'],
  ] as const)('shows the cycle start choice %s', (isCycleStart, suffix, pressed) => {
    const actions = renderSelector({ bleeding: 'M', isCycleStart });
    const toggle = screen.getByRole('button', { name: `${cycleStartLabel}${suffix}` });
    expect(toggle).toHaveAttribute('aria-pressed', pressed);
    // The colors come from the stylesheet tokens, not from inline styles
    expect(toggle).toHaveClass('peak-toggle-btn', 'cycle-start-toggle-btn');
    expect(toggle.classList.contains('active')).toBe(isCycleStart === true);
    expect(toggle).not.toHaveAttribute('style');
    fireEvent.click(toggle);
    expect(actions.toggleCycleStart).toHaveBeenCalledOnce();
  });
});
